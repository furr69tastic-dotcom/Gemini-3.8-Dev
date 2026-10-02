/**
 * Audio helpers for Gemini Live and Gemini 3.8 Flash TTS
 * Full support for Play, Pause, Resume, Stop, and Automatic Speech Response
 */

import { VoiceName } from '../types/gemini';

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused';

export interface ActivePlaybackInfo {
  messageId?: string;
  text?: string;
  status: PlaybackStatus;
  voiceName?: VoiceName;
}

let globalAudioCtx: AudioContext | null = null;
let currentSourceNode: AudioBufferSourceNode | null = null;
let currentHtmlAudio: HTMLAudioElement | null = null;
let activeEngine: 'none' | 'html5' | 'webaudio' | 'speechSynthesis' = 'none';

let activePlayback: ActivePlaybackInfo = {
  status: 'idle',
};

const listeners = new Set<(info: ActivePlaybackInfo) => void>();

function notifyListeners() {
  const current = { ...activePlayback };
  listeners.forEach((cb) => {
    try {
      cb(current);
    } catch (_) {}
  });
}

export function getPlaybackStatus(): PlaybackStatus {
  return activePlayback.status;
}

export function getActivePlayback(): ActivePlaybackInfo {
  return { ...activePlayback };
}

export function subscribePlayback(callback: (info: ActivePlaybackInfo) => void): () => void {
  listeners.add(callback);
  callback({ ...activePlayback });
  return () => {
    listeners.delete(callback);
  };
}

export function getAudioContext(sampleRate = 24000): AudioContext {
  if (!globalAudioCtx || globalAudioCtx.state === 'closed') {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    globalAudioCtx = new AudioCtx({ sampleRate });
  }
  return globalAudioCtx;
}

/**
 * Stop any currently running audio playback across all engines
 */
export function stopCurrentAudioPlayback() {
  if (currentSourceNode) {
    try {
      currentSourceNode.stop();
      currentSourceNode.disconnect();
    } catch (_) {}
    currentSourceNode = null;
  }

  if (currentHtmlAudio) {
    try {
      currentHtmlAudio.pause();
      currentHtmlAudio.currentTime = 0;
      currentHtmlAudio.src = '';
    } catch (_) {}
    currentHtmlAudio = null;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (_) {}
  }

  activeEngine = 'none';
  if (activePlayback.status !== 'idle') {
    activePlayback = { status: 'idle' };
    notifyListeners();
  }
}

export const stopSpeech = stopCurrentAudioPlayback;

/**
 * Pause the currently playing speech response
 */
export function pauseSpeech() {
  if (activePlayback.status !== 'playing') return;

  if (activeEngine === 'html5' && currentHtmlAudio) {
    try {
      currentHtmlAudio.pause();
    } catch (_) {}
  } else if (activeEngine === 'webaudio' && globalAudioCtx) {
    try {
      globalAudioCtx.suspend();
    } catch (_) {}
  } else if (activeEngine === 'speechSynthesis' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.pause();
    } catch (_) {}
  }

  activePlayback = { ...activePlayback, status: 'paused' };
  notifyListeners();
}

/**
 * Resume the currently paused speech response
 */
export async function resumeSpeech(): Promise<void> {
  if (activePlayback.status !== 'paused') return;

  if (activeEngine === 'html5' && currentHtmlAudio) {
    try {
      await currentHtmlAudio.play();
    } catch (err) {
      console.warn('HTML5 resume failed:', err);
    }
  } else if (activeEngine === 'webaudio' && globalAudioCtx) {
    try {
      await globalAudioCtx.resume();
    } catch (err) {
      console.warn('WebAudio resume failed:', err);
    }
  } else if (activeEngine === 'speechSynthesis' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.resume();
    } catch (_) {}
  }

  activePlayback = { ...activePlayback, status: 'playing' };
  notifyListeners();
}

/**
 * Clean markdown and technical syntax for natural sounding speech
 */
export function cleanTextForSpeech(text: string): string {
  if (!text) return '';
  return text
    .replace(/```[\s\S]*?```/g, ' [Code omitted] ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*#_~>]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Play a text message using Gemini 3.8 Flash TTS with resilient browser fallback
 */
export async function playSpeech(options: {
  text: string;
  messageId?: string;
  voiceName?: VoiceName;
  onEnded?: () => void;
}): Promise<void> {
  const { text, messageId, voiceName = 'Zephyr', onEnded } = options;

  stopCurrentAudioPlayback();

  const cleaned = cleanTextForSpeech(text);
  if (!cleaned) {
    if (onEnded) onEnded();
    return;
  }

  activePlayback = {
    messageId,
    text: cleaned,
    voiceName,
    status: 'loading',
  };
  notifyListeners();

  const handleFinish = () => {
    activeEngine = 'none';
    activePlayback = { status: 'idle' };
    notifyListeners();
    if (onEnded) onEnded();
  };

  try {
    // Controller with 6 second timeout for server TTS
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: cleaned.slice(0, 800), // Optimal length for quick synthesis
        voiceName,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.audio) {
        activePlayback = {
          messageId,
          text: cleaned,
          voiceName,
          status: 'playing',
        };
        notifyListeners();

        await playAudio(data.audio, data.sampleRate || 24000, handleFinish);
        return;
      }
    }
  } catch (err) {
    console.log('Gemini TTS fetch notice, switching to instant browser speech synthesis:', err);
  }

  // Instant browser speech synthesis fallback
  activePlayback = {
    messageId,
    text: cleaned,
    voiceName,
    status: 'playing',
  };
  notifyListeners();

  activeEngine = 'speechSynthesis';
  const started = speakWithBrowserSynthesis(cleaned, handleFinish, voiceName);
  if (!started) {
    handleFinish();
  }
}

/**
 * Toggle Play / Pause for a speech message
 */
export async function togglePlayPauseSpeech(options?: {
  text?: string;
  messageId?: string;
  voiceName?: VoiceName;
  onEnded?: () => void;
}): Promise<void> {
  if (activePlayback.status === 'playing') {
    if (!options?.messageId || activePlayback.messageId === options.messageId) {
      pauseSpeech();
      return;
    }
  } else if (activePlayback.status === 'paused') {
    if (!options?.messageId || activePlayback.messageId === options.messageId) {
      await resumeSpeech();
      return;
    }
  }

  if (options && options.text) {
    await playSpeech({
      text: options.text,
      messageId: options.messageId,
      voiceName: options.voiceName,
      onEnded: options.onEnded,
    });
  }
}

/**
 * Converts Float32Array PCM from mic to 16-bit Linear PCM Base64
 */
export function float32To16BitPCMBase64(input: Float32Array): string {
  const buffer = new ArrayBuffer(input.length * 2);
  const output = new DataView(buffer);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Universal audio player: handles Gemini 3.8 WAV base64, raw PCM base64,
 * and falls back to Web Audio.
 */
export async function playAudio(
  base64Data: string,
  sampleRate = 24000,
  onEnded?: () => void
): Promise<void> {
  if (!base64Data) {
    if (onEnded) onEnded();
    return;
  }

  // Convert base64 to Uint8Array safely
  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Check if starts with 'RIFF' signature (standard WAV format from Gemini 3.8 TTS)
  const isWav =
    bytes.length >= 4 &&
    bytes[0] === 0x52 && // 'R'
    bytes[1] === 0x49 && // 'I'
    bytes[2] === 0x46 && // 'F'
    bytes[3] === 0x46;   // 'F'

  // Strategy 1: Try HTML5 Audio element for standard WAV
  if (isWav) {
    try {
      const audioUrl = `data:audio/wav;base64,${base64Data}`;
      const audio = new Audio(audioUrl);
      currentHtmlAudio = audio;
      activeEngine = 'html5';

      audio.onended = () => {
        if (currentHtmlAudio === audio) {
          currentHtmlAudio = null;
        }
        if (onEnded) onEnded();
      };

      audio.onerror = (e) => {
        console.warn('HTML5 Audio playback error, falling back to Web Audio:', e);
        fallbackWebAudio(bytes, isWav, sampleRate, onEnded);
      };

      await audio.play();
      return;
    } catch (err) {
      console.warn('HTML5 Audio play rejected, attempting Web Audio API:', err);
    }
  }

  // Strategy 2: Web Audio API decoding
  await fallbackWebAudio(bytes, isWav, sampleRate, onEnded);
}

/**
 * Web Audio API fallback for decoding and playing audio buffers
 */
async function fallbackWebAudio(
  bytes: Uint8Array,
  isWav: boolean,
  sampleRate: number,
  onEnded?: () => void
): Promise<void> {
  try {
    const ctx = getAudioContext(sampleRate);
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    let audioBuffer: AudioBuffer | null = null;

    if (isWav) {
      try {
        const copyBuffer = new ArrayBuffer(bytes.byteLength);
        new Uint8Array(copyBuffer).set(bytes);
        audioBuffer = await ctx.decodeAudioData(copyBuffer);
      } catch (decodeErr) {
        console.warn('Web Audio decodeAudioData error:', decodeErr);
      }
    }

    if (!audioBuffer) {
      const alignedLength = bytes.length - (bytes.length % 2);
      const int16Count = alignedLength / 2;
      const dataView = new DataView(bytes.buffer, bytes.byteOffset, alignedLength);
      const float32 = new Float32Array(int16Count);

      const startSample = isWav ? Math.min(22, int16Count) : 0;
      for (let i = startSample; i < int16Count; i++) {
        float32[i - startSample] = dataView.getInt16(i * 2, true) / 32768.0;
      }

      const validLength = int16Count - startSample;
      if (validLength <= 0) {
        if (onEnded) onEnded();
        return;
      }

      audioBuffer = ctx.createBuffer(1, validLength, sampleRate);
      audioBuffer.copyToChannel(float32.subarray(0, validLength), 0);
    }

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    currentSourceNode = source;
    activeEngine = 'webaudio';

    source.onended = () => {
      if (currentSourceNode === source) {
        currentSourceNode = null;
      }
      if (onEnded) onEnded();
    };

    source.start();
  } catch (err) {
    console.error('All Web Audio playback methods failed:', err);
    if (onEnded) onEnded();
  }
}

export const playPcmAudio = playAudio;

/**
 * Resilient browser SpeechSynthesis fallback with locale and gender mapping
 */
export function speakWithBrowserSynthesis(
  text: string,
  onEnded?: () => void,
  voiceName: VoiceName = 'Puck'
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEnded) onEnded();
    return false;
  }

  try {
    window.speechSynthesis.cancel();

    const clean = cleanTextForSpeech(text);
    if (!clean) {
      if (onEnded) onEnded();
      return false;
    }

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.0;
    utterance.pitch = voiceName === 'Fenrir' ? 0.92 : 1.0;

    const isBritish = voiceName === 'Charon';

    if ('speechSynthesis' in window) {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices && availableVoices.length > 0) {
        if (isBritish) {
          // British English Male preference for search
          const ukMale = availableVoices.find(
            (v) =>
              (v.lang.includes('GB') || v.lang.includes('en-GB') || v.lang.includes('uk')) &&
              /male|george|david|oliver|daniel|arthur|uk/i.test(v.name)
          ) || availableVoices.find((v) => v.lang.includes('GB') || v.lang.includes('en-GB'));
          if (ukMale) {
            utterance.voice = ukMale;
            utterance.lang = ukMale.lang;
          } else {
            utterance.lang = 'en-GB';
          }
        } else {
          // American English Male preference (Puck / Fenrir)
          const usMale = availableVoices.find(
            (v) =>
              (v.lang.includes('US') || v.lang.includes('en-US')) &&
              /male|david|guy|mark|alex|fred|aaron/i.test(v.name)
          ) || availableVoices.find((v) => v.lang.includes('US') || v.lang.includes('en-US'));
          if (usMale) {
            utterance.voice = usMale;
            utterance.lang = usMale.lang;
          } else {
            utterance.lang = 'en-US';
          }
        }
      } else {
        utterance.lang = isBritish ? 'en-GB' : 'en-US';
      }
    }

    let hasEnded = false;
    const finish = () => {
      if (!hasEnded) {
        hasEnded = true;
        (window as any).__activeUtterance = null;
        if (onEnded) onEnded();
      }
    };

    utterance.onend = finish;
    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis notice:', e);
      finish();
    };

    (window as any).__activeUtterance = utterance;

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.warn('Failed to speak with SpeechSynthesis:', err);
    if (onEnded) onEnded();
    return false;
  }
}
