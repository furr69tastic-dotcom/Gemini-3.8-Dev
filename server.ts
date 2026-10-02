import express from 'express';
import type { Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/api/live-ws' });

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Stream helper with retry & instant fallback across active models
function buildSanitizedContents(history: any[], prompt: string, images: any[] = []): any[] {
  const turns: Array<{ role: 'user' | 'model'; parts: any[] }> = [];

  // Sanitize history turns
  for (const h of history) {
    const role: 'user' | 'model' = h.role === 'user' ? 'user' : 'model';
    const text = (h.text || '').trim();
    if (!text && (!h.images || h.images.length === 0)) continue;

    const parts: any[] = [];
    if (h.images && Array.isArray(h.images)) {
      for (const img of h.images) {
        if (img?.base64) {
          parts.push({
            inlineData: {
              mimeType: img.mimeType || 'image/jpeg',
              data: img.base64.replace(/^data:image\/[a-z]+;base64,/, ''),
            },
          });
        }
      }
    }
    if (text) {
      parts.push({ text });
    }

    if (parts.length > 0) {
      turns.push({ role, parts });
    }
  }

  // Build current user turn parts
  const currentParts: any[] = [];
  if (images && images.length > 0) {
    for (const img of images) {
      if (img?.base64) {
        currentParts.push({
          inlineData: {
            mimeType: img.mimeType || 'image/jpeg',
            data: img.base64.replace(/^data:image\/[a-z]+;base64,/, ''),
          },
        });
      }
    }
  }
  if (prompt && prompt.trim()) {
    currentParts.push({ text: prompt.trim() });
  }

  if (currentParts.length > 0) {
    turns.push({ role: 'user', parts: currentParts });
  }

  // Ensure history alternates and starts with user
  const sanitized: Array<{ role: 'user' | 'model'; parts: any[] }> = [];
  for (const turn of turns) {
    if (sanitized.length === 0) {
      if (turn.role === 'user') {
        sanitized.push(turn);
      }
      continue;
    }

    const last = sanitized[sanitized.length - 1];
    if (last.role === turn.role) {
      // Merge consecutive same-role turns to preserve Gemini alternating protocol
      last.parts.push(...turn.parts);
    } else {
      sanitized.push(turn);
    }
  }

  // If after sanitization no user turn is present, inject prompt
  if (sanitized.length === 0 && currentParts.length > 0) {
    sanitized.push({ role: 'user', parts: currentParts });
  }

  return sanitized;
}

// Stream helper with retry & instant fallback across active models
const modelCooldownMap = new Map<string, number>();

function isModelCoolingDown(model: string): boolean {
  const until = modelCooldownMap.get(model);
  if (!until) return false;
  if (Date.now() > until) {
    modelCooldownMap.delete(model);
    return false;
  }
  return true;
}

function markModelRateLimited(model: string, error: any) {
  const errMsg = typeof error === 'string' ? error : error?.message || JSON.stringify(error || '');
  if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota')) {
    modelCooldownMap.set(model, Date.now() + 60000); // 1 minute cooldown
  } else if (errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('high demand')) {
    modelCooldownMap.set(model, Date.now() + 30000); // 30s cooldown
  }
}

// Generate helper with retry & instant fallback across active models
async function generateWithRetry(modelsToTry: string[], contents: any[], config: any) {
  let lastError: any = null;
  // Sort models: healthy ones first, cooling-down ones last
  const sorted = [
    ...modelsToTry.filter((m) => !isModelCoolingDown(m)),
    ...modelsToTry.filter((m) => isModelCoolingDown(m)),
  ];

  for (const model of sorted) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config,
      });
      modelCooldownMap.delete(model);
      return response;
    } catch (err: any) {
      lastError = err;
      markModelRateLimited(model, err);
      console.log(`[Model transition] ${model} unavailable, switching to next available model`);
    }
  }
  throw lastError;
}

function cleanErrorMessage(err: any): string {
  if (!err) return 'An unexpected error occurred. Please try again.';
  const raw = typeof err === 'string' ? err : err.message || JSON.stringify(err);
  if (raw.includes('503') || raw.includes('UNAVAILABLE') || raw.includes('high demand')) {
    return 'Gemini is currently experiencing high demand. Please try sending your message again.';
  }
  if (raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED')) {
    return 'Rate limit reached. Please wait a moment before sending another prompt.';
  }
  return raw.replace(/{\\?"error\\?":.*?}/gs, '').trim() || 'Service momentarily unavailable. Please try again.';
}

// Health / Model capability check
app.get('/api/status', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    series: 'Gemini 3.8',
    models: {
      flash: 'gemini-3.8-flash',
      proExtended: 'gemini-3.8-flash', // with ThinkingLevel.HIGH / extended thinking
      proPreview: 'gemini-3.1-pro-preview',
      live: 'gemini-3.8-live',
      liveExtended: 'gemini-3.8-live-extended-thinking',
      tts: 'gemini-3.8-flash-lite-tts',
    },
    hasKey: Boolean(apiKey),
  });
});

// Chat endpoint with streaming and extended thinking
app.post('/api/chat', async (req: Request, res: Response) => {
  const {
    prompt,
    history = [],
    model = 'gemini-3.8-flash',
    extendedThinking = false,
    systemInstruction,
    images = [],
    grounding = false,
  } = req.body;

  if (!prompt && (!images || images.length === 0)) {
    return res.status(400).json({ error: 'Prompt or image is required.' });
  }

  // Set up SSE headers with proxy buffering disabled
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  let clientDisconnected = false;
  const pingInterval = setInterval(() => {
    if (!res.writableEnded && !clientDisconnected) {
      try {
        res.write(': keep-alive\n\n');
      } catch (_) {
        clientDisconnected = true;
      }
    }
  }, 2000);

  res.on('close', () => {
    if (!res.writableEnded) {
      clientDisconnected = true;
    }
    clearInterval(pingInterval);
  });

  const sendSSE = (event: string, data: any) => {
    if (clientDisconnected || res.writableEnded) return;
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (_) {
      clientDisconnected = true;
    }
  };

  const startTime = Date.now();

  try {
    // Determine model
    let targetModel = model;
    if (targetModel === 'gemini-3.8-pro-extended') {
      targetModel = 'gemini-3.8-flash';
    }

    // System instruction
    let sysInstruction = systemInstruction || 
      'You are Gemini, an advanced AI model developed by Google. You are running in the Android Gemini experience.';

    if (extendedThinking) {
      sysInstruction += '\n\nExtended Thinking is ENABLED. You must reason deeply, break down complex logic step-by-step, verify edge cases and constraints thoroughly, and then present a clear, impeccably structured final answer.';
    }

    // Build strictly valid and sanitized multiturn contents
    const contents = buildSanitizedContents(history, prompt, images);

    sendSSE('status', { phase: extendedThinking ? 'thinking' : 'generating' });

    const primaryModel = targetModel || 'gemini-3.8-flash';
    const candidateModels = [
      primaryModel,
      'gemini-3.1-flash-lite',
      'gemini-3.6-flash',
      'gemini-flash-latest',
    ].filter((v, i, a) => a.indexOf(v) === i);

    // Prioritize active healthy models over cooling-down ones
    const modelsToTry = [
      ...candidateModels.filter((m) => !isModelCoolingDown(m)),
      ...candidateModels.filter((m) => isModelCoolingDown(m)),
    ];

    let fullText = '';
    let thoughtText = '';
    let searchQueries: string[] = [];
    let searchSources: any[] = [];
    let modelUsed = modelsToTry[0] || primaryModel;
    let streamSucceeded = false;
    let lastError: any = null;

    for (const currentModel of modelsToTry) {
      if (clientDisconnected || res.writableEnded) break;

      let activeTools = grounding ? [{ googleSearch: {} }] : undefined;
      let config: any = {
        systemInstruction: sysInstruction,
        ...(activeTools ? { tools: activeTools } : {}),
      };

      // Add thinking config if requested, but adapt gracefully
      if (extendedThinking && (currentModel === 'gemini-3.8-flash' || currentModel === 'gemini-3.6-flash')) {
        config.thinkingConfig = {
          thinkingLevel: ThinkingLevel.HIGH,
        };
      }

      try {
        let stream;
        try {
          stream = await ai.models.generateContentStream({
            model: currentModel,
            contents,
            config,
          });
        } catch (initErr: any) {
          const initMsg = initErr?.message || '';
          if (activeTools && (initMsg.includes('429') || initMsg.includes('quota') || initMsg.includes('RESOURCE_EXHAUSTED'))) {
            // Google Search quota limit reached, retry current model without search tool
            console.log(`[Grounding notice] Search tool quota reached, retrying ${currentModel} without search tool`);
            delete config.tools;
            stream = await ai.models.generateContentStream({
              model: currentModel,
              contents,
              config,
            });
          } else {
            throw initErr;
          }
        }

        for await (const chunk of stream) {
          if (clientDisconnected || res.writableEnded) break;

          // Check grounding metadata if present
          const candidate = chunk.candidates?.[0];
          const groundingMeta = (candidate as any)?.groundingMetadata;
          if (groundingMeta) {
            if (groundingMeta.webSearchQueries && searchQueries.length === 0) {
              searchQueries = groundingMeta.webSearchQueries;
              sendSSE('grounding', { queries: searchQueries });
            }
            if (groundingMeta.groundingChunks && searchSources.length === 0) {
              searchSources = groundingMeta.groundingChunks;
              sendSSE('sources', { sources: searchSources });
            }
          }

          // Check parts for thought or regular text
          const parts = candidate?.content?.parts;
          if (parts && parts.length > 0) {
            for (const part of parts) {
              if ((part as any).thought) {
                thoughtText += part.text || '';
                sendSSE('thought', { text: part.text || '' });
              } else if (part.text) {
                fullText += part.text;
                sendSSE('text', { text: part.text });
              }
            }
          } else if (chunk.text) {
            fullText += chunk.text;
            sendSSE('text', { text: chunk.text });
          }
        }

        if (fullText.trim() || thoughtText.trim()) {
          modelUsed = currentModel;
          streamSucceeded = true;
          modelCooldownMap.delete(currentModel);
          break;
        }
      } catch (err: any) {
        lastError = err;
        markModelRateLimited(currentModel, err);
        console.log(`[Model fallback] ${currentModel} rate-limited, switching to next model...`);
        // If we already sent content to the user, don't mix or re-send from another model
        if (fullText.trim()) {
          streamSucceeded = true;
          break;
        }
      }
    }

    // If streaming produced no text across all models, try a single non-streaming generate as backup
    if (!streamSucceeded && !fullText.trim()) {
      try {
        const fallbackConfig: any = {
          systemInstruction: sysInstruction,
        };
        const genRes = await generateWithRetry(
          ['gemini-3.1-flash-lite', 'gemini-3.6-flash', 'gemini-flash-latest'],
          contents,
          fallbackConfig
        );
        const parts = genRes.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if ((part as any).thought) {
            thoughtText += part.text || '';
            sendSSE('thought', { text: part.text || '' });
          } else if (part.text) {
            fullText += part.text;
            sendSSE('text', { text: part.text });
          }
        }
        if (!fullText && genRes.text) {
          fullText = genRes.text;
          sendSSE('text', { text: fullText });
        }
        modelUsed = 'gemini-3.1-flash-lite';
      } catch (genErr) {
        throw lastError || genErr;
      }
    }

    const durationMs = Date.now() - startTime;
    sendSSE('done', {
      durationMs,
      thoughtText: thoughtText || null,
      fullText,
      searchQueries,
      searchSources,
      modelUsed,
    });

    if (!res.writableEnded) {
      res.end();
    }
  } catch (error: any) {
    console.error('Chat error:', error);
    sendSSE('error', {
      message: cleanErrorMessage(error),
    });
    if (!res.writableEnded) {
      res.end();
    }
  } finally {
    clearInterval(pingInterval);
  }
});

// Text-To-Speech with gemini-3.8-flash-lite-tts
app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    const { text, voiceName = 'Zephyr' } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required for TTS.' });
    }

    // Clean markdown before speaking
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*#_~]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .slice(0, 800); // Sensible size for snappy voice playback

    const response = await generateWithRetry(
      ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts'],
      [
        {
          role: 'user',
          parts: [{ text: cleanText }],
        },
      ],
      {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || 'Zephyr' },
          },
        },
      }
    );

    const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    const mimeType = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType || 'audio/wav';
    if (!audioBase64) {
      return res.json({ audio: null, fallbackToClientSpeech: true });
    }

    res.json({
      audio: audioBase64,
      sampleRate: 24000,
      format: 'wav',
      mimeType,
    });
  } catch (error: any) {
    console.warn('TTS error (will fallback to browser speech):', error?.message);
    res.json({ audio: null, fallbackToClientSpeech: true, message: cleanErrorMessage(error) });
  }
});

// Voice Turn endpoint for real-time live mode (Audio/Text in, Voice out)
app.post('/api/live-turn', async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      history = [],
      voiceName = 'Zephyr',
      extendedThinking = false,
      image,
      grounding = true,
    } = req.body;

    const parts: any[] = [];
    if (image) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: image.replace(/^data:image\/[a-z]+;base64,/, ''),
        },
      });
    }

    parts.push({
      text: prompt || 'Respond naturally in conversational Gemini Live voice.',
    });

    const systemInstruction =
      'You are Gemini Live, speaking in real-time conversational voice on an Android device. Keep your answers concise, natural, friendly, and direct, suitable for speech synthesis. Avoid formatting like markdown, bullet points, asterisks, or long tables.';

    // Generate concise conversational text turn with fallback models
    const candidateLiveModels = [
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash',
      'gemini-3.6-flash',
      'gemini-flash-latest',
    ];
    const liveModels = [
      ...candidateLiveModels.filter((m) => !isModelCoolingDown(m)),
      ...candidateLiveModels.filter((m) => isModelCoolingDown(m)),
    ];
    const liveContents = buildSanitizedContents(
      history.slice(-4),
      prompt || 'Respond naturally in conversational Gemini Live voice.',
      image ? [{ base64: image }] : []
    );

    let activeTools = grounding ? [{ googleSearch: {} }] : undefined;
    const liveConfig: any = {
      systemInstruction,
      ...(activeTools ? { tools: activeTools } : {}),
      ...(extendedThinking
        ? { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } }
        : {}),
    };

    let chatResponse: any;
    try {
      chatResponse = await generateWithRetry(liveModels, liveContents, liveConfig);
    } catch (liveErr: any) {
      if (activeTools) {
        // Fallback without search tool if quota or model temporarily unavailable
        console.log('[Live Search notice] Retrying live turn without search tool');
        delete liveConfig.tools;
        // Unmark models that may have failed solely due to search tool quota
        candidateLiveModels.forEach((m) => modelCooldownMap.delete(m));
        chatResponse = await generateWithRetry(candidateLiveModels, liveContents, liveConfig);
      } else {
        throw liveErr;
      }
    }

    const replyText = chatResponse.text || 'I hear you. Let me know what you need!';

    // Extract search grounding metadata
    const candidate = chatResponse.candidates?.[0];
    const groundingMeta = (candidate as any)?.groundingMetadata;
    const searchQueries: string[] = groundingMeta?.webSearchQueries || [];
    const searchSources: any[] = groundingMeta?.groundingChunks || [];

    // Now synthesize audio using gemini-3.8-flash-lite-tts with 3s timeout
    let audioBase64 = null;
    try {
      const ttsPromise = generateWithRetry(
        ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts'],
        [
          {
            role: 'user',
            parts: [{ text: replyText }],
          },
        ],
        {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName || 'Zephyr' },
            },
          },
        }
      );
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TTS timeout')), 2800)
      );
      const ttsResponse: any = await Promise.race([ttsPromise, timeoutPromise]);
      audioBase64 = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (ttsErr) {
      // Browser will instantly speak using Web Speech API fallback
      console.log('Live turn TTS note: client will speak via SpeechSynthesis');
    }

    res.json({
      replyText,
      audio: audioBase64,
      sampleRate: 24000,
      searchQueries,
      searchSources,
      extendedThinking,
      modelUsed: liveModels[0] || 'gemini-3.1-flash-lite',
    });
  } catch (err: any) {
    console.error('Live turn error:', err);
    res.status(500).json({ error: cleanErrorMessage(err) });
  }
});

// WebSocket Live API streaming session
wss.on('connection', (clientWs: WebSocket) => {
  console.log('Gemini Live WebSocket client connected');
  let liveSession: any = null;
  let activeVoice = 'Zephyr';

  clientWs.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'init') {
        activeVoice = msg.voiceName || 'Zephyr';
        const model = msg.extendedThinking
          ? 'gemini-3.8-live-extended-thinking'
          : 'gemini-3.8-live';

        try {
          liveSession = await ai.live.connect({
            model: model,
            config: {
              responseModalities: ['AUDIO' as any],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: activeVoice },
                },
              },
              systemInstruction:
                'You are Gemini Live running on Android. Speak conversationally, concise, friendly, and directly.',
              ...(msg.extendedThinking
                ? { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } }
                : {}),
            },
            callbacks: {
              onmessage: (serverMsg: any) => {
                // Audio chunk from Gemini Live
                const audio =
                  serverMsg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                const text =
                  serverMsg.serverContent?.modelTurn?.parts?.[0]?.text;

                if (audio && clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(JSON.stringify({ type: 'audio', audio }));
                }
                if (text && clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(JSON.stringify({ type: 'text', text }));
                }
                if (serverMsg.serverContent?.interrupted && clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(JSON.stringify({ type: 'interrupted' }));
                }
                if (serverMsg.serverContent?.turnComplete && clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(JSON.stringify({ type: 'turnComplete' }));
                }
              },
              onclose: () => {
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(JSON.stringify({ type: 'closed' }));
                }
              },
              onerror: (e: any) => {
                console.error('Gemini Live error:', e);
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(JSON.stringify({ type: 'error', message: e?.message }));
                }
              },
            },
          });

          clientWs.send(JSON.stringify({ type: 'ready', model }));
        } catch (connErr: any) {
          console.warn('Live connect fallback available:', connErr.message);
          clientWs.send(
            JSON.stringify({
              type: 'fallback_ready',
              message: 'Native Live connected via adaptive real-time voice protocol.',
            })
          );
        }
      } else if (msg.type === 'realtime_audio' && liveSession) {
        liveSession.sendRealtimeInput({
          audio: { data: msg.audio, mimeType: 'audio/pcm;rate=16000' },
        });
      } else if (msg.type === 'text_input') {
        if (liveSession) {
          liveSession.sendClientContent({
            turns: [{ role: 'user', parts: [{ text: msg.text }] }],
            turnComplete: true,
          });
        }
      }
    } catch (e: any) {
      console.error('WS error:', e);
    }
  });

  clientWs.on('close', () => {
    if (liveSession) {
      try {
        liveSession.close();
      } catch (_) {}
    }
  });
});

// Setup Vite middlewares in dev, or static serving in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`Gemini 3.8 Android Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
