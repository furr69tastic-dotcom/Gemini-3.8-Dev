/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { AndroidFrame } from './components/AndroidFrame';
import { GeminiHeader } from './components/GeminiHeader';
import { GeminiBottomBar } from './components/GeminiBottomBar';
import { NavigationDrawer } from './components/NavigationDrawer';
import { ChatMessageItem } from './components/ChatMessageItem';
import { GeminiWelcomeScreen } from './components/GeminiWelcomeScreen';
import { GeminiLiveView } from './components/GeminiLiveView';
import { SpeechControlBar } from './components/SpeechControlBar';
import { ChatMessage, ChatSession, GeminiModelId, VoiceName } from './types/gemini';
import { playSpeech, stopCurrentAudioPlayback } from './utils/audioUtils';

export default function App() {
  // Device Frame Mode (Default: Pixel phone frame)
  const [isFrameEnabled, setIsFrameEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      return false; // Mobile screens default to full screen
    }
    return true;
  });

  // Active Model & Settings
  const [currentModel, setCurrentModel] = useState<GeminiModelId>('gemini-3.8-flash');
  const [extendedThinking, setExtendedThinking] = useState<boolean>(true);
  const [groundingEnabled, setGroundingEnabled] = useState<boolean>(false);
  // Default voice: American male (Puck)
  const [activeVoice, setActiveVoice] = useState<VoiceName>('Puck');

  // Automatic Speech Response toggle (persisted in localStorage)
  const [autoSpeechEnabled, setAutoSpeechEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('gemini_38_auto_speech');
        if (saved !== null) {
          return saved === 'true';
        }
      } catch (_) {}
    }
    return false; // Default: off, user can turn on via toggle
  });

  // Drawer & Live Overlays
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLiveOpen, setIsLiveOpen] = useState(false);

  const STORAGE_KEY = 'gemini_38_chat_sessions';
  const ACTIVE_SESSION_STORAGE_KEY = 'gemini_38_active_session_id';
  const AUTO_SPEECH_STORAGE_KEY = 'gemini_38_auto_speech';

  // Chat Sessions with localStorage initial hydration
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Restore sessions and reset any interrupted transient stream states
            return parsed.map((s: ChatSession) => ({
              ...s,
              messages: (s.messages || []).map((m: ChatMessage) => ({
                ...m,
                isStreaming: false,
                isThinking: false,
              })),
            }));
          }
        }
      } catch (e) {
        console.warn('Failed to load chat sessions from localStorage:', e);
      }
    }
    const initialSession: ChatSession = {
      id: 'session-1',
      title: 'Gemini 3.8 Series',
      createdAt: Date.now(),
      messages: [],
      model: 'gemini-3.8-flash',
      extendedThinking: true,
    };
    return [initialSession];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedActive = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
        if (savedActive) return savedActive;
      } catch (_) {}
    }
    return 'session-1';
  });
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Sync sessions to localStorage whenever sessions state changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.warn('Failed to save sessions to localStorage:', e);
    }
  }, [sessions]);

  // Sync activeSessionId to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, activeSessionId);
    } catch (e) {
      console.warn('Failed to save active session ID to localStorage:', e);
    }
  }, [activeSessionId]);

  // Sync autoSpeechEnabled to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(AUTO_SPEECH_STORAGE_KEY, String(autoSpeechEnabled));
    } catch (e) {
      console.warn('Failed to save auto speech setting:', e);
    }
  }, [autoSpeechEnabled]);

  const handleToggleAutoSpeech = () => {
    setAutoSpeechEnabled((prev) => !prev);
  };

  // Current session helper
  const currentSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const messages = currentSession ? currentSession.messages : [];

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Model selection handler
  const handleSelectModel = (model: GeminiModelId) => {
    setCurrentModel(model);
    if (model === 'gemini-3.8-pro-extended' || model === 'gemini-3.8-live-extended-thinking') {
      setExtendedThinking(true);
    }
  };

  // Create New Chat (American male voice: Puck for standard, Fenrir for extended)
  const handleNewChat = () => {
    stopCurrentAudioPlayback();
    const americanMaleVoice: VoiceName = extendedThinking ? 'Fenrir' : 'Puck';
    setActiveVoice(americanMaleVoice);
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: 'New conversation',
      createdAt: Date.now(),
      messages: [],
      model: currentModel,
      extendedThinking,
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  // Delete Chat Session
  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    stopCurrentAudioPlayback();
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      if (filtered.length === 0) {
        const fresh: ChatSession = {
          id: `session-${Date.now()}`,
          title: 'New conversation',
          createdAt: Date.now(),
          messages: [],
          model: currentModel,
          extendedThinking,
        };
        setActiveSessionId(fresh.id);
        return [fresh];
      }
      if (activeSessionId === id) {
        setActiveSessionId(filtered[0].id);
      }
      return filtered;
    });
  };

  // Clear All Sessions
  const handleClearAll = () => {
    stopCurrentAudioPlayback();
    const fresh: ChatSession = {
      id: `session-${Date.now()}`,
      title: 'New conversation',
      createdAt: Date.now(),
      messages: [],
      model: currentModel,
      extendedThinking,
    };
    setSessions([fresh]);
    setActiveSessionId(fresh.id);
    setIsDrawerOpen(false);
  };

  // Send Message with SSE streaming support
  const handleSendMessage = async (
    userText: string,
    attachedImages?: Array<{ base64: string, name?: string }>,
    forceExtended?: boolean
  ) => {
    if (!userText.trim() && (!attachedImages || attachedImages.length === 0)) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      text: userText,
      timestamp: Date.now(),
      images: attachedImages,
    };

    const isExtended = forceExtended !== undefined ? forceExtended : extendedThinking;

    const assistantMessageId = `msg-${Date.now()}-model`;
    const pendingAssistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'model',
      text: '',
      timestamp: Date.now(),
      isThinking: isExtended,
      isStreaming: true,
      thoughtText: '',
    };

    // Update session title if first message
    const shouldUpdateTitle = messages.length === 0 && userText.trim().length > 0;
    const newTitle = shouldUpdateTitle
      ? userText.slice(0, 32) + (userText.length > 32 ? '...' : '')
      : currentSession.title;

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            title: newTitle,
            messages: [...s.messages, userMessage, pendingAssistantMessage],
          };
        }
        return s;
      })
    );

    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userText,
          history: messages.slice(-10).map((m) => ({
            role: m.role,
            text: m.text,
          })),
          model: currentModel,
          extendedThinking: isExtended,
          images: attachedImages,
          grounding: groundingEnabled,
        }),
      });

      if (!response.ok) {
        let errMessage = 'Server error';
        try {
          const errData = await response.json();
          errMessage = errData.error || errData.message || `Server returned ${response.status}`;
        } catch {
          errMessage = `Server error ${response.status}: ${response.statusText}`;
        }
        throw new Error(errMessage);
      }

      if (!response.body) {
        throw new Error('No response stream available');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      let streamedText = '';
      let streamedThought = '';
      let searchQueries: string[] = [];
      let searchSources: any[] = [];
      let thoughtDurationMs = 0;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          // SSE format: event: <event>\ndata: <json>
          let eventType = 'message';
          let dataStr = '';

          const eventMatch = trimmed.match(/^event:\s*(.+)$/m);
          if (eventMatch) {
            eventType = eventMatch[1].trim();
          }

          const dataMatch = trimmed.match(/^data:\s*(.+)$/m);
          if (dataMatch) {
            dataStr = dataMatch[1].trim();
          }

          if (dataStr) {
            try {
              const data = JSON.parse(dataStr);

              if (eventType === 'thought') {
                streamedThought += data.text || '';
              } else if (eventType === 'text') {
                streamedText += data.text || '';
              } else if (eventType === 'grounding') {
                searchQueries = data.queries || [];
              } else if (eventType === 'sources') {
                searchSources = data.sources || [];
              } else if (eventType === 'error') {
                if (!streamedText) {
                  streamedText = data.message || 'Gemini servers are currently experiencing high demand. Please try sending your message again.';
                }
              } else if (eventType === 'done') {
                thoughtDurationMs = data.durationMs || 0;
                if (data.fullText && !streamedText) {
                  streamedText = data.fullText;
                }
                if (data.thoughtText && !streamedThought) {
                  streamedThought = data.thoughtText;
                }
              }

              // Update message in state
              setSessions((prev) =>
                prev.map((s) => {
                  if (s.id === activeSessionId) {
                    return {
                      ...s,
                      messages: s.messages.map((m) => {
                        if (m.id === assistantMessageId) {
                          return {
                            ...m,
                            text: streamedText,
                            thoughtText: streamedThought || null,
                            searchQueries,
                            searchSources,
                            thoughtDurationMs,
                            isThinking: !streamedText && isExtended,
                          };
                        }
                        return m;
                      }),
                    };
                  }
                  return s;
                })
              );
            } catch (e) {
              console.warn('Failed to parse SSE line:', line);
            }
          }
        }
      }

      // Finalize message state
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              messages: s.messages.map((m) => {
                if (m.id === assistantMessageId) {
                  return {
                    ...m,
                    isThinking: false,
                    isStreaming: false,
                  };
                }
                return m;
              }),
            };
          }
          return s;
        })
      );

      // Contextual voice routing:
      // - For search: British English male ('Charon')
      // - For extended option: American male ('Fenrir')
      // - For new chat: American male ('Puck')
      const hasSearchGrounding =
        (searchQueries && searchQueries.length > 0) ||
        (searchSources && searchSources.length > 0);
      const contextualVoice: VoiceName = hasSearchGrounding
        ? 'Charon' // British English male for search
        : isExtended
        ? 'Fenrir' // American male for extended thinking
        : activeVoice || 'Puck'; // American male for chat

      // Automatic speech response: speak reply if auto-speech is enabled
      if (autoSpeechEnabled && streamedText.trim()) {
        playSpeech({
          text: streamedText,
          messageId: assistantMessageId,
          voiceName: contextualVoice,
        });
      }
    } catch (err: any) {
      console.warn('Send message notice:', err?.message || err);
      const isNetworkErr =
        err?.name === 'TypeError' ||
        err?.message?.toLowerCase().includes('network') ||
        err?.message?.toLowerCase().includes('fetch');
      const fallbackMsg = isNetworkErr
        ? 'Gemini connection interrupted. Please tap retry or send again.'
        : err?.message || 'Sorry, I encountered an issue connecting to Gemini. Please try again.';

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              messages: s.messages.map((m) => {
                if (m.id === assistantMessageId) {
                  return {
                    ...m,
                    text: m.text || fallbackMsg,
                    isThinking: false,
                    isStreaming: false,
                  };
                }
                return m;
              }),
            };
          }
          return s;
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AndroidFrame
      isFrameEnabled={isFrameEnabled}
      onToggleFrame={() => setIsFrameEnabled(!isFrameEnabled)}
    >
      {/* Top Header */}
      <GeminiHeader
        onOpenDrawer={() => setIsDrawerOpen(true)}
        currentModel={currentModel}
        onSelectModel={handleSelectModel}
        extendedThinking={extendedThinking}
        onToggleExtendedThinking={() => setExtendedThinking(!extendedThinking)}
        onLaunchLive={() => setIsLiveOpen(true)}
        autoSpeechEnabled={autoSpeechEnabled}
        onToggleAutoSpeech={handleToggleAutoSpeech}
      />

      {/* Main Content Area: Chat stream or Welcome screen */}
      <div 
        ref={chatScrollRef}
        className="flex-1 overflow-y-auto no-scrollbar flex flex-col bg-[#131314]"
      >
        {messages.length === 0 ? (
          <GeminiWelcomeScreen
            onSelectPrompt={(p, opts) => {
              if (opts?.extendedThinking) setExtendedThinking(true);
              if (opts?.grounding) setGroundingEnabled(true);
              handleSendMessage(p, undefined, opts?.extendedThinking);
            }}
            onLaunchLive={() => setIsLiveOpen(true)}
          />
        ) : (
          <div className="py-2 flex-1">
            {messages.map((msg, index) => (
              <ChatMessageItem
                key={msg.id}
                message={msg}
                activeVoice={activeVoice}
                onRetryExtended={
                  msg.role === 'model' && index > 0
                    ? () => {
                        const prevUserMsg = messages[index - 1];
                        if (prevUserMsg && prevUserMsg.role === 'user') {
                          handleSendMessage(prevUserMsg.text, prevUserMsg.images, true);
                        }
                      }
                    : undefined
                }
              />
            ))}
            <div ref={messagesEndRef} className="h-2" />
          </div>
        )}
      </div>

      {/* Floating Speech Control Bar with Play & Pause button */}
      <SpeechControlBar
        autoSpeechEnabled={autoSpeechEnabled}
        onToggleAutoSpeech={handleToggleAutoSpeech}
      />

      {/* Android Gemini Bottom Bar */}
      <GeminiBottomBar
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        onLaunchLive={() => setIsLiveOpen(true)}
        extendedThinking={extendedThinking}
        onToggleExtendedThinking={() => setExtendedThinking(!extendedThinking)}
        groundingEnabled={groundingEnabled}
        onToggleGrounding={() => setGroundingEnabled(!groundingEnabled)}
      />

      {/* Navigation Drawer */}
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => {
          stopCurrentAudioPlayback();
          setActiveSessionId(id);
        }}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onClearAll={handleClearAll}
        activeVoice={activeVoice}
        onVoiceChange={setActiveVoice}
        extendedThinking={extendedThinking}
        onToggleExtendedThinking={() => setExtendedThinking(!extendedThinking)}
        groundingEnabled={groundingEnabled}
        onToggleGrounding={() => setGroundingEnabled(!groundingEnabled)}
        isFrameEnabled={isFrameEnabled}
        onToggleFrame={() => setIsFrameEnabled(!isFrameEnabled)}
        autoSpeechEnabled={autoSpeechEnabled}
        onToggleAutoSpeech={handleToggleAutoSpeech}
      />

      {/* Full-Screen Gemini Live Overlay */}
      <GeminiLiveView
        isOpen={isLiveOpen}
        onClose={() => setIsLiveOpen(false)}
        activeVoice={activeVoice}
        onVoiceChange={setActiveVoice}
        extendedThinking={extendedThinking}
        onToggleExtendedThinking={() => setExtendedThinking(!extendedThinking)}
      />
    </AndroidFrame>
  );
}
