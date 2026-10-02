import React from 'react';
import { Play, Pause, Square, Volume2 } from 'lucide-react';
import { useAudioPlayback } from '../hooks/useAudioPlayback';

interface SpeechControlBarProps {
  autoSpeechEnabled: boolean;
  onToggleAutoSpeech?: () => void;
}

export const SpeechControlBar: React.FC<SpeechControlBarProps> = ({
  autoSpeechEnabled,
}) => {
  const { isPlaying, isPaused, isLoading, text, pause, resume, stop, voiceName } = useAudioPlayback();

  if (!isPlaying && !isPaused && !isLoading) {
    return null;
  }

  return (
    <div className="w-full px-3 pb-1 shrink-0 z-30 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-blue-950/90 via-zinc-900/95 to-indigo-950/90 border border-blue-500/40 shadow-xl flex items-center justify-between gap-3">
        {/* Left: Audio waveform + state info */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Audio Bars Equalizer */}
          <div className="flex items-center gap-1 shrink-0 h-4 px-1">
            <span
              className={`w-1 bg-[#4285F4] rounded-full transition-all duration-300 ${
                isPlaying ? 'animate-bounce [animation-delay:0ms] h-4' : 'h-1.5 opacity-50'
              }`}
            />
            <span
              className={`w-1 bg-[#EA4335] rounded-full transition-all duration-300 ${
                isPlaying ? 'animate-bounce [animation-delay:150ms] h-5' : 'h-2.5 opacity-50'
              }`}
            />
            <span
              className={`w-1 bg-[#FBBC05] rounded-full transition-all duration-300 ${
                isPlaying ? 'animate-bounce [animation-delay:300ms] h-3.5' : 'h-1.5 opacity-50'
              }`}
            />
            <span
              className={`w-1 bg-[#34A853] rounded-full transition-all duration-300 ${
                isPlaying ? 'animate-bounce [animation-delay:450ms] h-2.5' : 'h-1 opacity-50'
              }`}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-blue-400 animate-ping' : 'bg-amber-400'}`} />
              <span className="text-[11px] font-semibold tracking-wide uppercase text-blue-300">
                {isLoading ? 'Preparing voice...' : isPlaying ? 'Speaking Response' : 'Audio Paused'}
              </span>
              {voiceName && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-200 border border-blue-500/30">
                  {voiceName}
                </span>
              )}
              {autoSpeechEnabled && (
                <span className="hidden sm:inline-flex text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Auto-speak on
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-300 truncate max-w-[240px] sm:max-w-md italic">
              {text || 'Gemini 3.8 speech synthesis...'}
            </p>
          </div>
        </div>

        {/* Right: Play/Pause button + Stop button */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Play / Pause Button */}
          <button
            onClick={() => {
              if (isPlaying) {
                pause();
              } else {
                resume();
              }
            }}
            disabled={isLoading}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-medium text-xs transition-all cursor-pointer border shadow-sm ${
              isPlaying
                ? 'bg-blue-600/30 hover:bg-blue-600/50 text-blue-100 border-blue-500/50'
                : 'bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-100 border-emerald-500/50'
            }`}
            title={isPlaying ? 'Pause speech' : 'Resume speech'}
            aria-label={isPlaying ? 'Pause speech' : 'Resume speech'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Resume</span>
              </>
            )}
          </button>

          {/* Stop Button */}
          <button
            onClick={stop}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer border border-transparent hover:border-zinc-700"
            title="Stop audio playback"
            aria-label="Stop audio playback"
          >
            <Square className="w-3.5 h-3.5 fill-current text-zinc-400 hover:text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
