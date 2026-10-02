import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  ArrowUp, 
  Mic, 
  MicOff,
  Image as ImageIcon, 
  X, 
  Radio, 
  Sparkles, 
  BrainCircuit, 
  Search,
  Camera,
  Check,
  AlertCircle
} from 'lucide-react';
import { GeminiSparkleIcon } from './GeminiSparkleIcon';

interface GeminiBottomBarProps {
  onSendMessage: (text: string, images?: Array<{ base64: string, name?: string }>) => void;
  isLoading: boolean;
  onLaunchLive: () => void;
  extendedThinking: boolean;
  onToggleExtendedThinking: () => void;
  groundingEnabled: boolean;
  onToggleGrounding: () => void;
}

/**
 * Remove duplicate consecutive n-grams and repeating substrings from a transcript.
 * Catches 1-word stutters ("hello hello hello" -> "hello")
 * and multi-word phrase repetitions ("how are you how are you" -> "how are you").
 */
function cleanTranscript(text: string): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (!trimmed) return '';

  const words = trimmed.split(/\s+/);
  if (words.length <= 1) return trimmed;

  const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/gi, '');

  let resultWords = [...words];
  let changed = true;

  // Run passes to eliminate consecutive duplicate word sequences of length k
  while (changed) {
    changed = false;
    const maxK = Math.min(Math.floor(resultWords.length / 2), 12);

    for (let k = maxK; k >= 1; k--) {
      for (let i = 0; i <= resultWords.length - 2 * k; i++) {
        let match = true;
        for (let j = 0; j < k; j++) {
          const w1 = norm(resultWords[i + j]);
          const w2 = norm(resultWords[i + k + j]);
          if (!w1 || !w2 || w1 !== w2) {
            match = false;
            break;
          }
        }

        if (match) {
          // Remove the duplicate slice [i + k ... i + 2k]
          resultWords.splice(i + k, k);
          changed = true;
          break; // restart outer loop with updated array
        }
      }
      if (changed) break;
    }
  }

  return resultWords.join(' ');
}

/**
 * Safely merge two text strings by finding and removing word overlaps and repeating substrings,
 * preventing duplicate text when speech recognition restarts or sends overlapping chunks.
 */
function mergeTwoTranscripts(base: string, addition: string): string {
  const b = (base || '').trim();
  const a = (addition || '').trim();
  if (!b) return cleanTranscript(a);
  if (!a) return cleanTranscript(b);

  const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/gi, '');

  const bWords = b.split(/\s+/);
  const aWords = a.split(/\s+/);

  const bNorm = bWords.map(norm).filter(Boolean).join(' ');
  const aNorm = aWords.map(norm).filter(Boolean).join(' ');

  // 1. If normalized texts are identical, return the cleaner base
  if (bNorm === aNorm) {
    return cleanTranscript(b);
  }

  // 2. If addition already starts with base, addition is the full transcript
  if (aNorm.startsWith(bNorm)) {
    return cleanTranscript(a);
  }

  // 3. If base already ends with addition, base already contains the full transcript
  if (bNorm.endsWith(aNorm)) {
    return cleanTranscript(b);
  }

  // 4. If base already contains addition as a complete sub-phrase
  if (bNorm.includes(aNorm)) {
    return cleanTranscript(b);
  }

  // 5. Check for suffix-prefix overlap: does end of base match start of addition?
  const maxOverlap = Math.min(bWords.length, aWords.length);
  let bestOverlap = 0;

  for (let k = maxOverlap; k >= 1; k--) {
    const bSlice = bWords.slice(-k).map(norm).join(' ');
    const aSlice = aWords.slice(0, k).map(norm).join(' ');
    if (bSlice && bSlice === aSlice) {
      bestOverlap = k;
      break;
    }
  }

  if (bestOverlap > 0) {
    const nonOverlapping = aWords.slice(bestOverlap).join(' ');
    const merged = nonOverlapping ? `${b} ${nonOverlapping}` : b;
    return cleanTranscript(merged);
  }

  // 6. Check if last word of base was a partial prefix of the first word of addition
  // e.g. "photo" vs "photosynthesis"
  const lastBaseNorm = norm(bWords[bWords.length - 1]);
  const firstAddNorm = norm(aWords[0]);
  if (lastBaseNorm && firstAddNorm && firstAddNorm.startsWith(lastBaseNorm) && firstAddNorm !== lastBaseNorm) {
    const withoutLast = bWords.slice(0, -1).join(' ');
    const merged = withoutLast ? `${withoutLast} ${a}` : a;
    return cleanTranscript(merged);
  }

  // 7. General concatenation with cleanTranscript
  return cleanTranscript(`${b} ${a}`);
}

type SpeechState = 'idle' | 'starting' | 'listening' | 'stopping';

export const GeminiBottomBar: React.FC<GeminiBottomBarProps> = ({
  onSendMessage,
  isLoading,
  onLaunchLive,
  extendedThinking,
  onToggleExtendedThinking,
  groundingEnabled,
  onToggleGrounding,
}) => {
  const [inputText, setInputText] = useState('');
  const [images, setImages] = useState<Array<{ base64: string, name?: string }>>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const prefixTextRef = useRef<string>('');
  const committedFinalTextRef = useRef<string>('');
  const sessionFinalTextRef = useRef<string>('');
  const isRecordingMicRef = useRef<boolean>(false);
  const speechStateRef = useRef<SpeechState>('idle');
  const restartTimerRef = useRef<any>(null);
  const sessionEpochRef = useRef<number>(0);

  // Debounce transcription update timer to prevent rapid re-rendering & stutter
  const debounceTimerRef = useRef<any>(null);
  const pendingCompositeRef = useRef<string | null>(null);

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const flushDebouncedTranscription = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (pendingCompositeRef.current !== null) {
      const finalClean = cleanTranscript(pendingCompositeRef.current).trim();
      setInputText(finalClean);
      pendingCompositeRef.current = null;
      adjustTextareaHeight();
    }
  };

  const scheduleDebouncedTranscription = (compositeText: string) => {
    pendingCompositeRef.current = compositeText;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      if (pendingCompositeRef.current !== null) {
        const cleaned = cleanTranscript(pendingCompositeRef.current);
        setInputText(cleaned);
        adjustTextareaHeight();
      }
    }, 60);
  };

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      isRecordingMicRef.current = false;
      speechStateRef.current = 'idle';
      sessionEpochRef.current++;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onresult = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }
    };
  }, []);

  // Stop recording helper with clean state transition and de-duplication
  const stopSpeechRecognition = () => {
    if (speechStateRef.current === 'idle' && !isRecordingMicRef.current) return;
    speechStateRef.current = 'stopping';
    isRecordingMicRef.current = false;
    sessionEpochRef.current++;

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    flushDebouncedTranscription();

    // Merge committed text and session final text without duplicate boundary words or substrings
    let combinedSpoken = mergeTwoTranscripts(
      committedFinalTextRef.current,
      sessionFinalTextRef.current
    );
    combinedSpoken = cleanTranscript(combinedSpoken);

    const fullResult = prefixTextRef.current
      ? mergeTwoTranscripts(prefixTextRef.current, combinedSpoken)
      : combinedSpoken;

    const finalClean = cleanTranscript(fullResult).trim();
    if (finalClean) {
      setInputText(finalClean);
      adjustTextareaHeight();
    }

    setIsRecordingMic(false);
    setInterimTranscript('');
    sessionFinalTextRef.current = '';
    committedFinalTextRef.current = '';
    speechStateRef.current = 'idle';
  };

  const handleSend = () => {
    flushDebouncedTranscription();
    if (isRecordingMicRef.current || speechStateRef.current !== 'idle') {
      stopSpeechRecognition();
    }

    const trimmed = inputText.trim();
    if ((trimmed || images.length > 0) && !isLoading) {
      onSendMessage(trimmed, images);
      setInputText('');
      setImages([]);
      setInterimTranscript('');
      prefixTextRef.current = '';
      committedFinalTextRef.current = '';
      sessionFinalTextRef.current = '';
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64 = uploadEvent.target?.result as string;
        if (base64) {
          setImages((prev) => [...prev, { base64, name: file.name }]);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
    setShowAttachMenu(false);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Real-time Web Speech API voice-to-text dictation with debounce & state check
  const startRecognitionSession = (SpeechRec: any) => {
    if (!isRecordingMicRef.current || speechStateRef.current === 'stopping') return;

    speechStateRef.current = 'starting';
    const currentEpoch = ++sessionEpochRef.current;

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.abort();
      } catch (_) {}
      recognitionRef.current = null;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = navigator.language || 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        if (currentEpoch !== sessionEpochRef.current || !isRecordingMicRef.current) return;
        speechStateRef.current = 'listening';
        setIsRecordingMic(true);
      };

      recognition.onresult = (event: any) => {
        if (
          currentEpoch !== sessionEpochRef.current ||
          !isRecordingMicRef.current ||
          speechStateRef.current === 'stopping' ||
          speechStateRef.current === 'idle'
        ) {
          return;
        }

        let sessionFinal = '';
        let sessionInterim = '';

        // Extract session results
        for (let i = 0; i < event.results.length; ++i) {
          const item = event.results[i];
          const transcript = item?.[0]?.transcript || '';
          if (item?.isFinal) {
            sessionFinal += (sessionFinal ? ' ' : '') + transcript.trim();
          } else {
            sessionInterim += (sessionInterim ? ' ' : '') + transcript.trim();
          }
        }

        sessionFinal = cleanTranscript(sessionFinal);
        sessionInterim = cleanTranscript(sessionInterim);

        sessionFinalTextRef.current = sessionFinal;
        setInterimTranscript(sessionInterim);

        // Merge spoken text: committed from prior restarts + current session final + interim
        let spokenSoFar = mergeTwoTranscripts(
          committedFinalTextRef.current,
          sessionFinalTextRef.current
        );
        if (sessionInterim) {
          spokenSoFar = mergeTwoTranscripts(spokenSoFar, sessionInterim);
        }
        spokenSoFar = cleanTranscript(spokenSoFar);

        const composite = prefixTextRef.current
          ? mergeTwoTranscripts(prefixTextRef.current, spokenSoFar)
          : spokenSoFar;

        scheduleDebouncedTranscription(composite);
      };

      recognition.onerror = (event: any) => {
        if (currentEpoch !== sessionEpochRef.current) return;
        console.warn('Speech recognition notice:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setSpeechError('Microphone permission blocked. Please allow mic access in your browser settings.');
          setTimeout(() => setSpeechError(null), 5000);
          stopSpeechRecognition();
        } else if (event.error === 'network') {
          setSpeechError('Voice network glitch. Reconnecting...');
          setTimeout(() => setSpeechError(null), 3000);
        }
      };

      recognition.onend = () => {
        if (currentEpoch !== sessionEpochRef.current) return;

        if (!isRecordingMicRef.current || speechStateRef.current === 'stopping') {
          flushDebouncedTranscription();
          setIsRecordingMic(false);
          setInterimTranscript('');
          speechStateRef.current = 'idle';
          return;
        }

        // Commit finalized text from this session before restarting with boundary overlap merge
        if (sessionFinalTextRef.current) {
          committedFinalTextRef.current = cleanTranscript(
            mergeTwoTranscripts(
              committedFinalTextRef.current,
              sessionFinalTextRef.current
            )
          );
          sessionFinalTextRef.current = '';
        }

        // Restart fresh session on browser silence timeout
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          if (isRecordingMicRef.current && currentEpoch === sessionEpochRef.current) {
            startRecognitionSession(SpeechRec);
          }
        }, 150);
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (startErr: any) {
        if (startErr?.name !== 'InvalidStateError') {
          console.warn('Speech recognition start notice:', startErr);
        }
      }
    } catch (err: any) {
      console.error('Failed to initialize speech recognition:', err);
      setIsRecordingMic(false);
      isRecordingMicRef.current = false;
      speechStateRef.current = 'idle';
      setSpeechError('Could not start voice recognition. Tapping Live voice mode instead.');
      setTimeout(() => {
        setSpeechError(null);
        onLaunchLive();
      }, 1800);
    }
  };

  const handleMicToggle = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRec) {
      setSpeechError('Voice dictation is not supported in this browser. You can launch Gemini Live voice instead.');
      setTimeout(() => setSpeechError(null), 4000);
      return;
    }

    if (isRecordingMicRef.current || speechStateRef.current !== 'idle') {
      stopSpeechRecognition();
      return;
    }

    setSpeechError(null);
    flushDebouncedTranscription();

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    speechStateRef.current = 'starting';
    isRecordingMicRef.current = true;
    setIsRecordingMic(true);
    prefixTextRef.current = inputText.trim();
    committedFinalTextRef.current = '';
    sessionFinalTextRef.current = '';
    setInterimTranscript('');

    startRecognitionSession(SpeechRec);
  };

  // Auto resize textarea with debounce flush on manual edits
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    pendingCompositeRef.current = null;

    setInputText(e.target.value);
    prefixTextRef.current = e.target.value.trim();
    committedFinalTextRef.current = '';
    sessionFinalTextRef.current = '';
    adjustTextareaHeight();
  };

  return (
    <div className="w-full px-3 pb-2 pt-1 bg-[#131314] shrink-0 z-20">
      {/* Speech Error Banner */}
      {speechError && (
        <div className="mb-2 px-3 py-1.5 rounded-xl bg-red-950/80 border border-red-800/80 text-red-200 text-xs flex items-center justify-between gap-2 shadow-lg animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>{speechError}</span>
          </div>
          <button 
            onClick={() => setSpeechError(null)}
            className="p-1 text-red-300 hover:text-white"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Real-time Voice Dictation Active Overlay */}
      {isRecordingMic && (
        <div className="mb-2 px-3 py-2 rounded-2xl bg-gradient-to-r from-blue-950/80 via-zinc-900/90 to-purple-950/80 border border-blue-500/40 shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Pulsing Google 4-Color Audio Wave Bars */}
            <div className="flex items-center gap-1 shrink-0 h-4">
              <span className="w-1 bg-[#4285F4] rounded-full animate-bounce [animation-delay:0ms] h-3.5" />
              <span className="w-1 bg-[#EA4335] rounded-full animate-bounce [animation-delay:150ms] h-5" />
              <span className="w-1 bg-[#FBBC05] rounded-full animate-bounce [animation-delay:300ms] h-4" />
              <span className="w-1 bg-[#34A853] rounded-full animate-bounce [animation-delay:450ms] h-2.5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                <span className="text-[11px] font-semibold text-blue-300 tracking-wide uppercase">
                  Listening...
                </span>
              </div>
              <p className="text-xs text-zinc-300 truncate max-w-[200px] sm:max-w-[260px] italic">
                {interimTranscript || 'Speak your prompt clearly...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => {
                if (debounceTimerRef.current) {
                  clearTimeout(debounceTimerRef.current);
                  debounceTimerRef.current = null;
                }
                pendingCompositeRef.current = null;
                sessionEpochRef.current++;
                committedFinalTextRef.current = '';
                sessionFinalTextRef.current = '';
                setInterimTranscript('');
                setInputText(prefixTextRef.current);
                adjustTextareaHeight();

                const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                if (SpeechRec && isRecordingMicRef.current) {
                  startRecognitionSession(SpeechRec);
                }
              }}
              className="px-2 py-1 rounded-lg text-[11px] text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Clear current voice input"
            >
              Clear
            </button>
            <button
              onClick={stopSpeechRecognition}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 text-xs font-medium border border-blue-500/40 transition-colors"
              title="Done speaking"
            >
              <Check className="w-3 h-3" />
              <span>Done</span>
            </button>
          </div>
        </div>
      )}

      {/* Attached Images Preview Row */}
      {images.length > 0 && (
        <div className="flex items-center gap-2 mb-2 px-2 overflow-x-auto no-scrollbar">
          {images.map((img, idx) => (
            <div key={idx} className="relative group shrink-0">
              <img
                src={img.base64}
                alt="Preview"
                className="w-16 h-16 object-cover rounded-xl border border-zinc-700 shadow-md"
              />
              <button
                onClick={() => removeImage(idx)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zinc-800 border border-zinc-600 text-white flex items-center justify-center hover:bg-red-600 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Input Pill Capsule */}
      <div className="flex items-end gap-2">
        {/* Attachment menu popover button */}
        <div className="relative">
          <button
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className="w-10 h-10 rounded-full bg-[#1e1f20] hover:bg-[#282a2c] text-zinc-300 border border-zinc-700/60 flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-sm"
            title="Attach images or prompt tools"
          >
            <Plus className="w-5 h-5 text-zinc-300" />
          </button>

          {/* Attachment Menu Popup */}
          {showAttachMenu && (
            <div className="absolute bottom-12 left-0 z-30 bg-[#1e1f20] border border-zinc-700 rounded-2xl p-2 shadow-2xl w-48 text-xs space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-200 hover:bg-zinc-800 cursor-pointer"
              >
                <ImageIcon className="w-4 h-4 text-blue-400" />
                <span>Upload Photos</span>
              </button>

              <button
                onClick={() => {
                  onToggleExtendedThinking();
                  setShowAttachMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-200 hover:bg-zinc-800 cursor-pointer"
              >
                <BrainCircuit className="w-4 h-4 text-purple-400" />
                <span>{extendedThinking ? 'Disable' : 'Enable'} Extended</span>
              </button>

              <button
                onClick={() => {
                  onToggleGrounding();
                  setShowAttachMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-200 hover:bg-zinc-800 cursor-pointer"
              >
                <Search className="w-4 h-4 text-emerald-400" />
                <span>{groundingEnabled ? 'Disable' : 'Enable'} Grounding</span>
              </button>
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            multiple
            className="hidden"
          />
        </div>

        {/* Text Input Pill */}
        <div className={`flex-1 bg-[#1e1f20] border rounded-3xl px-3.5 py-2 shadow-inner transition-colors ${
          isRecordingMic 
            ? 'border-blue-500 ring-2 ring-blue-500/20' 
            : 'border-zinc-700/70 focus-within:border-blue-500/70'
        }`}>
          {/* Active toggles badges inside pill */}
          {(extendedThinking || groundingEnabled || isRecordingMic) && (
            <div className="flex items-center gap-1.5 pb-1 mb-1 border-b border-zinc-800/80">
              {isRecordingMic && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] font-medium animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  Voice Dictation Active
                </span>
              )}
              {extendedThinking && (
                <span
                  onClick={onToggleExtendedThinking}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-medium cursor-pointer hover:bg-blue-500/30"
                >
                  <BrainCircuit className="w-2.5 h-2.5" />
                  Extended Thinking
                </span>
              )}
              {groundingEnabled && (
                <span
                  onClick={onToggleGrounding}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-medium cursor-pointer hover:bg-emerald-500/30"
                >
                  <Search className="w-2.5 h-2.5" />
                  Grounding
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={isRecordingMic ? "Listening... speak now" : "Ask Gemini..."}
              rows={1}
              className={`flex-1 bg-transparent text-[13px] placeholder-zinc-400 focus:outline-none resize-none leading-tight py-1 max-h-[120px] ${
                isRecordingMic ? 'text-blue-100' : 'text-white'
              }`}
            />

            {/* Mic / Dictate button with active pulse animation */}
            <div className="relative">
              {isRecordingMic && (
                <span className="absolute -inset-1 rounded-full bg-red-500/30 animate-ping pointer-events-none" />
              )}
              <button
                onClick={handleMicToggle}
                className={`relative p-1.5 rounded-full transition-all cursor-pointer ${
                  isRecordingMic 
                    ? 'text-white bg-red-600 hover:bg-red-500 shadow-md shadow-red-600/40' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
                title={isRecordingMic ? "Stop voice dictation" : "Voice-to-text input"}
                aria-label={isRecordingMic ? "Stop voice dictation" : "Voice-to-text input"}
              >
                {isRecordingMic ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Send Button or Gemini Live Button */}
        {inputText.trim() || images.length > 0 ? (
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-md"
            title="Send Message"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        ) : (
          /* The Iconic Android Gemini Live Button */
          <button
            onClick={onLaunchLive}
            className="group relative w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 via-purple-600 to-pink-500 p-[1.5px] shrink-0 shadow-lg cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            title="Start Gemini Live Voice Session"
          >
            <div className="w-full h-full rounded-full bg-[#1e1f20] group-hover:bg-[#282a2c] flex items-center justify-center transition-colors">
              <div className="relative flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-blue-400 group-hover:text-pink-400 transition-colors animate-pulse" />
              </div>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};

