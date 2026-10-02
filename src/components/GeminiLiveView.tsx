import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  X, 
  Pause, 
  Play, 
  Camera, 
  CameraOff, 
  Sparkles, 
  Volume2, 
  BrainCircuit,
  MessageSquareText,
  Settings2,
  Search,
  Layers,
  Globe,
  ExternalLink
} from 'lucide-react';
import { VoiceName } from '../types/gemini';
import { playAudio, stopCurrentAudioPlayback, float32To16BitPCMBase64, speakWithBrowserSynthesis } from '../utils/audioUtils';
import { LiveArchitectureModal, LiveSearchTurn } from './LiveArchitectureModal';

interface GeminiLiveViewProps {
  isOpen: boolean;
  onClose: () => void;
  activeVoice: VoiceName;
  onVoiceChange: (voice: VoiceName) => void;
  extendedThinking: boolean;
  onToggleExtendedThinking: () => void;
}

export const GeminiLiveView: React.FC<GeminiLiveViewProps> = ({
  isOpen,
  onClose,
  activeVoice,
  onVoiceChange,
  extendedThinking,
  onToggleExtendedThinking,
}) => {
  const [isListening, setIsListening] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [showVoicePicker, setShowVoicePicker] = useState(false);

  // Live Architecture Search & Grounding States
  const [liveSearchEnabled, setLiveSearchEnabled] = useState(true);
  const [isArchitectureModalOpen, setIsArchitectureModalOpen] = useState(false);
  const [recentSearchTurns, setRecentSearchTurns] = useState<LiveSearchTurn[]>([]);
  const [currentGroundedSources, setCurrentGroundedSources] = useState<any[]>([]);
  const [currentSearchQueries, setCurrentSearchQueries] = useState<string[]>([]);

  const [liveState, setLiveState] = useState<'listening' | 'thinking' | 'speaking' | 'ready'>('ready');
  const [transcript, setTranscript] = useState<string>('Say "Hello Gemini" or ask any question to start speaking.');
  const [userInputText, setUserInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioVolumeRef = useRef<number>(0);

  // Initialize Audio & Canvas Orb Visualizer
  useEffect(() => {
    if (!isOpen) {
      stopCurrentAudioPlayback();
      cleanupAudio();
      return;
    }

    setLiveState('listening');
    setTranscript('I am listening... Ask anything or try extended reasoning.');
    setupMicrophone();
    startOrbAnimation();

    return () => {
      cleanupAudio();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen]);

  const cleanupAudio = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  const setupMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx({ sampleRate: 16000 });
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!isMuted && !isPaused) {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          audioVolumeRef.current = avg / 128.0; // 0 to 2
        } else {
          audioVolumeRef.current = 0.05;
        }
        if (isOpen) {
          requestAnimationFrame(checkVolume);
        }
      };
      checkVolume();

      // Speech recognition for live captions/queries if supported
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          if (isMuted || isPaused || isProcessing) return;

          let finalTurn = '';
          let currentInterim = '';

          for (let i = 0; i < event.results.length; ++i) {
            const item = event.results[i];
            const text = item?.[0]?.transcript?.trim() || '';
            if (!text) continue;
            if (item.isFinal) {
              finalTurn += (finalTurn ? ' ' : '') + text;
            } else {
              currentInterim += (currentInterim ? ' ' : '') + text;
            }
          }

          if (finalTurn.length > 2) {
            handleUserVoiceTurn(finalTurn);
          } else if (currentInterim) {
            setTranscript(`You: "${currentInterim}"`);
          }
        };

        recognition.onerror = () => {};
        try {
          recognition.start();
        } catch (_) {}
      }
    } catch (err) {
      console.warn('Microphone permission not available, enabling touch voice turn mode:', err);
    }
  };

  // Canvas Orb animation - Google Gemini Live fluid pulsing celestial orb
  const startOrbAnimation = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.03;
      const width = (canvas.width = canvas.offsetWidth * 2);
      const height = (canvas.height = canvas.offsetHeight * 2);
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // Base radius plus reactivity to audio volume
      const vol = audioVolumeRef.current || 0.1;
      const baseRadius = Math.min(width, height) * 0.24;
      const radius = baseRadius * (1 + vol * 0.4);

      // Deep glowing aura
      const auraGrad = ctx.createRadialGradient(centerX, centerY, radius * 0.2, centerX, centerY, radius * 1.8);
      auraGrad.addColorStop(0, 'rgba(66, 133, 244, 0.45)');
      auraGrad.addColorStop(0.4, 'rgba(155, 81, 224, 0.35)');
      auraGrad.addColorStop(0.7, 'rgba(235, 71, 142, 0.2)');
      auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Fluid morphed organic blob
      ctx.save();
      ctx.beginPath();
      const points = 8;
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const wave = Math.sin(angle * 3 + time) * (15 + vol * 30) + Math.cos(angle * 2 - time * 1.2) * 10;
        const r = radius + wave;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();

      // Gemini signature gradient
      const orbGrad = ctx.createLinearGradient(
        centerX - radius,
        centerY - radius,
        centerX + radius,
        centerY + radius
      );
      orbGrad.addColorStop(0, '#4285f4');
      orbGrad.addColorStop(0.35, '#9b51e0');
      orbGrad.addColorStop(0.7, '#eb478e');
      orbGrad.addColorStop(1, '#ff7754');

      ctx.fillStyle = orbGrad;
      ctx.shadowColor = '#4285f4';
      ctx.shadowBlur = 40 + vol * 35;
      ctx.fill();
      ctx.restore();

      // Inner pulsating light core
      const coreGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 0.6);
      coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      coreGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
      coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.6, 0, Math.PI * 2);
      ctx.fill();

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();
  };

  // Toggle Camera
  const toggleCamera = async () => {
    if (cameraActive) {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
      setCameraActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraActive(true);
      } catch (e) {
        console.warn('Camera not accessible:', e);
      }
    }
  };

  // Handle a live conversation turn
  const handleUserVoiceTurn = async (userVoiceText: string) => {
    if (isProcessing || !userVoiceText) return;

    setIsProcessing(true);
    setLiveState('thinking');
    setTranscript(`You: "${userVoiceText}"`);

    // Capture camera frame snapshot if camera is active
    let imageBase64: string | undefined = undefined;
    if (cameraActive && videoRef.current) {
      try {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = videoRef.current.videoWidth || 640;
        tempCanvas.height = videoRef.current.videoHeight || 480;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(videoRef.current, 0, 0);
          imageBase64 = tempCanvas.toDataURL('image/jpeg', 0.7);
        }
      } catch (_) {}
    }

    // Voice targeting for Live:
    // - For search: British English male ('Charon')
    // - For live extended: American male ('Fenrir')
    // - For live default: American male ('Puck')
    const hasSearchIntent =
      liveSearchEnabled &&
      /search|latest|who|what|news|weather|score|price|current|today|when|where/i.test(userVoiceText);

    const liveVoiceToUse: VoiceName = hasSearchIntent
      ? 'Charon' // British English male for search
      : extendedThinking
      ? 'Fenrir' // American male for live extended
      : (activeVoice || 'Puck'); // American male for live

    try {
      const res = await fetch('/api/live-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userVoiceText,
          voiceName: liveVoiceToUse,
          extendedThinking,
          image: imageBase64,
          grounding: liveSearchEnabled,
        }),
      });

      const data = await res.json();
      if (data.replyText) {
        setTranscript(`Gemini: "${data.replyText}"`);
        setLiveState('speaking');

        // Capture live search grounding metadata
        const queries = data.searchQueries || [];
        const sources = data.searchSources || [];
        setCurrentSearchQueries(queries);
        setCurrentGroundedSources(sources);

        const turnVoice: VoiceName = queries.length > 0 ? 'Charon' : liveVoiceToUse;

        if (userVoiceText) {
          setRecentSearchTurns((prev) => [
            {
              id: `live-turn-${Date.now()}`,
              timestamp: Date.now(),
              query: userVoiceText,
              replySnippet: data.replyText,
              searchQueries: queries,
              sources,
              modelUsed: data.modelUsed,
            },
            ...prev.slice(0, 19),
          ]);
        }

        // Play voice audio
        if (data.audio) {
          await playAudio(data.audio, data.sampleRate || 24000, () => {
            setLiveState('listening');
            setIsProcessing(false);
          });
        } else {
          // Native browser speech synthesis fallback
          speakWithBrowserSynthesis(data.replyText, () => {
            setLiveState('listening');
            setIsProcessing(false);
          }, turnVoice);
        }
      } else {
        setLiveState('listening');
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Live turn error:', err);
      setTranscript('Sorry, I had trouble connecting. Tap anywhere to try again.');
      setLiveState('listening');
      setIsProcessing(false);
    }
  };

  const handleManualSend = () => {
    if (userInputText.trim()) {
      const text = userInputText.trim();
      setUserInputText('');
      handleUserVoiceTurn(text);
    }
  };

  if (!isOpen) return null;

  const voices: VoiceName[] = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir'];

  return (
    <div className="absolute inset-0 z-50 bg-[#101014] flex flex-col text-white animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-4 z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-wide">Gemini Live</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 font-mono text-zinc-300">
                {extendedThinking ? '3.8 Live Extended' : '3.8 Live'}
              </span>
            </div>
            <span className="text-[11px] text-zinc-400">
              Voice: <strong className="text-blue-400">{activeVoice}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Extended Thinking Voice Toggle */}
          <button
            onClick={onToggleExtendedThinking}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
              extendedThinking
                ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300'
                : 'bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:text-white'
            }`}
            title="Toggle Live Extended Reasoning"
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Extended</span>
          </button>

          {/* Live Search Grounding Toggle */}
          <button
            onClick={() => setLiveSearchEnabled(!liveSearchEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
              liveSearchEnabled
                ? 'bg-blue-600/25 border-blue-400 text-blue-300'
                : 'bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:text-white'
            }`}
            title="Toggle Live Google Search Grounding"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Search</span>
          </button>

          {/* Architecture & Grounding Inspector */}
          <button
            onClick={() => setIsArchitectureModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 transition-all cursor-pointer"
            title="Inspect Extended Live Architecture & Search Log"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">Architecture</span>
          </button>

          {/* Voice Settings */}
          <button
            onClick={() => setShowVoicePicker(!showVoicePicker)}
            className="p-2 rounded-full bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors cursor-pointer"
            title="Voice Persona"
          >
            <Settings2 className="w-4 h-4" />
          </button>

          {/* Close Live Session */}
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors cursor-pointer"
            title="End Gemini Live"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Voice Selection Sheet Popup */}
      {showVoicePicker && (
        <div className="absolute top-16 right-6 z-30 bg-[#1e1f20] border border-zinc-700/80 rounded-2xl p-3 shadow-2xl w-64 text-xs">
          <div className="font-semibold text-zinc-200 mb-2 px-1 flex items-center justify-between">
            <span>Gemini Live Voice</span>
            <Volume2 className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="grid grid-cols-1 gap-1">
            {voices.map((v) => (
              <button
                key={v}
                onClick={() => {
                  onVoiceChange(v);
                  setShowVoicePicker(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                  activeVoice === v
                    ? 'bg-blue-600/30 text-blue-300 font-semibold border border-blue-500/40'
                    : 'text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <span>{v}</span>
                {activeVoice === v && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Camera Preview overlay if enabled */}
      {cameraActive && (
        <div className="absolute top-20 left-6 z-20 w-32 h-44 rounded-2xl overflow-hidden border-2 border-blue-500/50 shadow-2xl bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Center Fluid Orb Visualizer */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6">
        <div className="relative w-full max-w-[320px] aspect-square flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className="w-full h-full block cursor-pointer"
            onClick={() => {
              if (liveState === 'ready' || liveState === 'listening') {
                handleUserVoiceTurn('Tell me what makes the Gemini 3.8 series special.');
              }
            }}
          />
        </div>

        {/* Live State & Transcript Card */}
        <div className="w-full max-w-sm mt-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300 mb-2">
            <span
              className={`w-2 h-2 rounded-full ${
                liveState === 'speaking'
                  ? 'bg-emerald-400 animate-ping'
                  : liveState === 'thinking'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-blue-400 animate-pulse'
              }`}
            />
            <span className="capitalize font-medium">
              {liveState === 'speaking'
                ? 'Speaking...'
                : liveState === 'thinking'
                ? 'Thinking with 3.8...'
                : isMuted
                ? 'Microphone Muted'
                : 'Listening...'}
            </span>
          </div>

          {showCaptions && (
            <p className="text-sm text-zinc-300 font-medium px-4 line-clamp-3 min-h-[3rem] transition-all">
              {transcript}
            </p>
          )}

          {/* Live Search Grounding Result Badge */}
          {currentSearchQueries.length > 0 && (
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-500/40 text-blue-200 text-xs shadow-lg animate-in fade-in duration-200 max-w-[90%]">
              <Search className="w-3 h-3 text-blue-400 shrink-0" />
              <span className="truncate text-[11px] font-medium">
                Grounded: "{currentSearchQueries[0]}"
              </span>
              <button
                onClick={() => setIsArchitectureModalOpen(true)}
                className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-500/30 hover:bg-blue-500/50 text-[10px] text-blue-200 font-semibold cursor-pointer shrink-0"
              >
                Inspect
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Live Controls */}
      <div className="px-6 pb-6 pt-3 flex flex-col gap-3 z-20">
        {/* Quick Voice Prompt Shortcuts */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => handleUserVoiceTurn("Search what are the top world news headlines right now.")}
            className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-blue-950/60 hover:bg-blue-900/60 border border-blue-500/30 text-blue-200 cursor-pointer flex items-center gap-1"
          >
            <Search className="w-3 h-3 text-blue-400" />
            <span>Search live news</span>
          </button>
          <button
            onClick={() => handleUserVoiceTurn("Explain quantum computing with extended thinking.")}
            className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 cursor-pointer"
          >
            ⚛️ Quantum computing
          </button>
          <button
            onClick={() => handleUserVoiceTurn("What are the latest James Webb telescope discoveries?")}
            className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 cursor-pointer"
          >
            🔭 James Webb discoveries
          </button>
          <button
            onClick={() => handleUserVoiceTurn("Solve a logic puzzle with extended thinking.")}
            className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 cursor-pointer"
          >
            🧠 Logic puzzle
          </button>
        </div>

        {/* Text fallback input during live call */}
        <div className="flex items-center gap-2 bg-[#1e1f20] border border-zinc-800 rounded-full px-4 py-2">
          <input
            type="text"
            placeholder="Type a message to Gemini Live..."
            value={userInputText}
            onChange={(e) => setUserInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleManualSend()}
            className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
          />
          {userInputText.trim() && (
            <button
              onClick={handleManualSend}
              className="text-xs text-blue-400 font-semibold px-2 hover:underline cursor-pointer"
            >
              Send
            </button>
          )}
        </div>

        {/* Iconic Gemini Live Android Control Buttons */}
        <div className="flex items-center justify-around pt-2">
          {/* Camera Button */}
          <button
            onClick={toggleCamera}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              cameraActive ? 'bg-blue-600 text-white' : 'bg-zinc-800/90 text-zinc-300 hover:bg-zinc-700'
            }`}
            title="Gemini Live Vision / Camera"
          >
            {cameraActive ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
          </button>

          {/* Pause / Resume Button */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isPaused ? 'bg-amber-600 text-white' : 'bg-zinc-800/90 text-zinc-300 hover:bg-zinc-700'
            }`}
            title={isPaused ? 'Resume Session' : 'Hold / Pause'}
          >
            {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </button>

          {/* Mic Mute / Unmute Button */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg cursor-pointer ${
              isMuted
                ? 'bg-red-500/20 border-2 border-red-500 text-red-400'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          {/* Captions Toggle */}
          <button
            onClick={() => setShowCaptions(!showCaptions)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              showCaptions ? 'bg-zinc-800 text-blue-400' : 'bg-zinc-800/60 text-zinc-500 hover:bg-zinc-700'
            }`}
            title="Toggle Live Transcripts"
          >
            <MessageSquareText className="w-5 h-5" />
          </button>

          {/* End Call Button */}
          <button
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg transition-all cursor-pointer"
            title="End Gemini Live"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Live Architecture & Search Inspector Modal */}
      <LiveArchitectureModal
        isOpen={isArchitectureModalOpen}
        onClose={() => setIsArchitectureModalOpen(false)}
        extendedThinking={extendedThinking}
        onToggleExtendedThinking={onToggleExtendedThinking}
        liveSearchEnabled={liveSearchEnabled}
        onToggleLiveSearch={() => setLiveSearchEnabled(!liveSearchEnabled)}
        activeVoice={activeVoice}
        onVoiceChange={onVoiceChange}
        recentTurns={recentSearchTurns}
        onTriggerSearchTest={(testPrompt) => handleUserVoiceTurn(testPrompt)}
      />
    </div>
  );
};
