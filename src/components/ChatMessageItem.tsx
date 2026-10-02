import React, { useState } from 'react';
import { 
  Volume2, 
  Copy, 
  Check, 
  ThumbsUp, 
  ThumbsDown, 
  ExternalLink,
  Search,
  RotateCcw,
  Play,
  Pause,
  Square,
  Loader2
} from 'lucide-react';
import { marked } from 'marked';
import { ChatMessage, VoiceName } from '../types/gemini';
import { ThinkingProcessCard } from './ThinkingProcessCard';
import { GeminiSparkleIcon } from './GeminiSparkleIcon';
import { useAudioPlayback } from '../hooks/useAudioPlayback';

interface ChatMessageItemProps {
  message: ChatMessage;
  onRetryExtended?: () => void;
  activeVoice: VoiceName;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  onRetryExtended,
  activeVoice,
}) => {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  const {
    messageId: activeMessageId,
    isPlaying,
    isPaused,
    isLoading: isAudioLoading,
    play,
    pause,
    resume,
    stop,
  } = useAudioPlayback();

  const isCurrentActive = activeMessageId === message.id;
  const isCurrentPlaying = isCurrentActive && isPlaying;
  const isCurrentPaused = isCurrentActive && isPaused;
  const isCurrentLoading = isCurrentActive && isAudioLoading;

  const isUser = message.role === 'user';

  // Voice targeting:
  // - For search: British English male ('Charon')
  // - For extended option: American male ('Fenrir')
  // - For new chat: American male ('Puck' / activeVoice)
  const isSearchGrounded = Boolean(
    (message.searchQueries && message.searchQueries.length > 0) ||
    (message.searchSources && message.searchSources.length > 0)
  );
  const isExtendedResponse = Boolean(message.thoughtText);

  const messageTargetVoice: VoiceName = isSearchGrounded
    ? 'Charon' // British English male
    : isExtendedResponse
    ? 'Fenrir' // American male for extended
    : activeVoice || 'Puck'; // American male for chat

  const handleTogglePlayPause = () => {
    if (isCurrentPlaying) {
      pause();
    } else if (isCurrentPaused) {
      resume();
    } else {
      play(message.text, message.id, messageTargetVoice);
    }
  };

  const handleCopy = () => {
    if (!message.text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(message.text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = message.text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Clipboard copy error:', err);
    }
  };

  if (isUser) {
    return (
      <div className="flex flex-col items-end my-3 px-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
        {/* User image attachments */}
        {message.images && message.images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 justify-end">
            {message.images.map((img, idx) => (
              <img
                key={idx}
                src={img.base64}
                alt="Attachment"
                className="w-32 h-32 object-cover rounded-2xl border border-zinc-700 shadow-md"
              />
            ))}
          </div>
        )}

        {/* User bubble */}
        <div className="max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-3xl rounded-br-lg bg-[#282a2c] text-white text-[13.5px] leading-relaxed shadow-sm font-sans selection:bg-blue-500/30">
          <p className="whitespace-pre-wrap">{message.text}</p>
        </div>
      </div>
    );
  }

  // Model response
  const rawHtml = marked.parse(message.text || '') as string;

  return (
    <div className="my-4 px-4 animate-in fade-in duration-200">
      <div className="flex items-start gap-3">
        {/* Gemini Sparkle Avatar */}
        <div className="w-7 h-7 rounded-full bg-[#1e1f20] border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
          <GeminiSparkleIcon className="w-4 h-4" />
        </div>

        {/* Message Content Container */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Extended Thinking Accordion */}
          <ThinkingProcessCard
            thoughtText={message.thoughtText}
            durationMs={message.thoughtDurationMs}
            isThinking={message.isThinking}
          />

          {/* Search Grounding Sources */}
          {message.searchSources && message.searchSources.length > 0 && (
            <div className="p-2.5 rounded-xl bg-[#1e1f20] border border-zinc-800 text-xs text-zinc-300 mb-2">
              <div className="flex items-center gap-1.5 text-zinc-400 font-medium mb-1.5 text-[11px]">
                <Search className="w-3 h-3 text-blue-400" />
                <span>Sources from Google Search</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {message.searchSources.slice(0, 4).map((src: any, idx) => {
                  const title = src.web?.title || src.title || 'Source';
                  const uri = src.web?.uri || src.uri;
                  return (
                    <a
                      key={idx}
                      href={uri || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-blue-300 text-[11px] truncate max-w-[200px] border border-zinc-700/50"
                    >
                      <span className="truncate">{title}</span>
                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Message Bubble */}
          <div className="relative group/bubble bg-[#1e1f20]/60 hover:bg-[#1e1f20]/90 border border-zinc-800/80 rounded-2xl rounded-tl-sm p-4 shadow-sm transition-colors">
            {/* Quick Actions toolbar inside the bubble: Play/Pause and Copy */}
            {!message.isThinking && message.text && (
              <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
                {/* Play / Pause button inside bubble */}
                <button
                  onClick={handleTogglePlayPause}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border shadow-sm ${
                    isCurrentPlaying
                      ? 'bg-blue-600/30 text-blue-200 border-blue-500/50 shadow-sm'
                      : isCurrentPaused
                      ? 'bg-amber-600/30 text-amber-200 border-amber-500/50 shadow-sm'
                      : isCurrentLoading
                      ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      : 'bg-[#282a2c]/90 hover:bg-[#333538] text-zinc-300 hover:text-white border-zinc-700/70 hover:border-zinc-600'
                  }`}
                  title={
                    isCurrentPlaying
                      ? 'Pause speech'
                      : isCurrentPaused
                      ? 'Resume speech'
                      : 'Play speech response'
                  }
                  aria-label={
                    isCurrentPlaying
                      ? 'Pause speech'
                      : isCurrentPaused
                      ? 'Resume speech'
                      : 'Play speech response'
                  }
                >
                  {isCurrentLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                      <span className="text-[11px]">Loading...</span>
                    </>
                  ) : isCurrentPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current text-blue-300" />
                      <span className="text-[11px] font-medium">Pause</span>
                    </>
                  ) : isCurrentPaused ? (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current text-amber-300" />
                      <span className="text-[11px] font-medium">Resume</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-zinc-400 group-hover/bubble:text-zinc-200 fill-current" />
                      <span className="text-[11px]">Listen</span>
                    </>
                  )}
                </button>

                {/* Stop button when active */}
                {isCurrentActive && (isCurrentPlaying || isCurrentPaused) && (
                  <button
                    onClick={stop}
                    className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-red-400 border border-zinc-700 transition-colors cursor-pointer"
                    title="Stop audio playback"
                    aria-label="Stop audio playback"
                  >
                    <Square className="w-3 h-3 fill-current" />
                  </button>
                )}

                {/* Copy to clipboard button inside bubble */}
                <button
                  onClick={handleCopy}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border shadow-sm ${
                    copied
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 ring-1 ring-emerald-500/30'
                      : 'bg-[#282a2c]/90 hover:bg-[#333538] text-zinc-300 hover:text-white border-zinc-700/70 hover:border-zinc-600'
                  }`}
                  title="Copy to clipboard"
                  aria-label="Copy to clipboard"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[11px] font-medium text-emerald-300">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-zinc-400 group-hover/bubble:text-zinc-200" />
                      <span className="text-[11px]">Copy</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Rendered Text or Skeleton Loader */}
            {message.isThinking && !message.text ? (
              <div className="py-2 space-y-2">
                <div className="h-3.5 bg-zinc-800 rounded-md w-4/5 animate-shimmer" />
                <div className="h-3.5 bg-zinc-800 rounded-md w-3/5 animate-shimmer" />
              </div>
            ) : (
              <div
                className="prose-gemini text-[13.5px] text-[#e3e3e3] leading-relaxed break-words font-sans selection:bg-blue-500/30 pr-32"
                dangerouslySetInnerHTML={{ __html: rawHtml }}
              />
            )}
          </div>

          {/* Gemini Action Footer */}
          {!message.isThinking && message.text && (
            <div className="flex items-center gap-1.5 pt-2 text-zinc-400">
              {/* Play & Pause button */}
              <button
                onClick={handleTogglePlayPause}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs border ${
                  isCurrentPlaying
                    ? 'text-blue-300 bg-blue-500/20 border-blue-500/40'
                    : isCurrentPaused
                    ? 'text-amber-300 bg-amber-500/20 border-amber-500/40'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 border-transparent'
                }`}
                title={
                  isCurrentPlaying
                    ? 'Pause voice'
                    : isCurrentPaused
                    ? 'Resume voice'
                    : 'Play voice response'
                }
              >
                {isCurrentLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                    <span className="text-[11px]">Loading...</span>
                  </>
                ) : isCurrentPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current text-blue-400" />
                    <span className="text-[11px] font-medium text-blue-300">Pause</span>
                  </>
                ) : isCurrentPaused ? (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current text-amber-400" />
                    <span className="text-[11px] font-medium text-amber-300">Resume</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Listen</span>
                  </>
                )}
              </button>

              {/* Stop button when active */}
              {isCurrentActive && (isCurrentPlaying || isCurrentPaused) && (
                <button
                  onClick={stop}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800/80 transition-colors cursor-pointer"
                  title="Stop playback"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              )}

              {/* Copy Message */}
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors cursor-pointer"
                title="Copy response"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>

              {/* Thumbs Up / Down */}
              <button
                onClick={() => setFeedback(feedback === 'up' ? null : 'up')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  feedback === 'up' ? 'text-blue-400 bg-blue-500/10' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80'
                }`}
                title="Good response"
              >
                <ThumbsUp className="w-4 h-4" />
              </button>

              <button
                onClick={() => setFeedback(feedback === 'down' ? null : 'down')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  feedback === 'down' ? 'text-red-400 bg-red-500/10' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80'
                }`}
                title="Bad response"
              >
                <ThumbsDown className="w-4 h-4" />
              </button>

              {/* Retry with Extended Thinking if not used */}
              {!message.thoughtText && onRetryExtended && (
                <button
                  onClick={onRetryExtended}
                  className="flex items-center gap-1 ml-auto px-2 py-1 rounded-full text-[11px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 cursor-pointer"
                  title="Rerun with Extended Thinking"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Think deeper</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
