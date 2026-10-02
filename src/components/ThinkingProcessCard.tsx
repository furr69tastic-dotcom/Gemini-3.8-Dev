import React, { useState } from 'react';
import { ChevronDown, ChevronUp, BrainCircuit, Check, Copy, Sparkles } from 'lucide-react';

interface ThinkingProcessCardProps {
  thoughtText?: string | null;
  durationMs?: number;
  isThinking?: boolean;
}

export const ThinkingProcessCard: React.FC<ThinkingProcessCardProps> = ({
  thoughtText,
  durationMs,
  isThinking = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // If there's no thought text and not currently thinking, do not render
  if (!isThinking && !thoughtText) {
    return null;
  }

  const seconds = durationMs ? (durationMs / 1000).toFixed(1) : '3.8';

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (thoughtText) {
      navigator.clipboard.writeText(thoughtText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="my-2.5 rounded-2xl border border-zinc-700/50 bg-[#1e1f20]/90 backdrop-blur-md overflow-hidden transition-all duration-200">
      {/* Header bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-white/5 transition-colors cursor-pointer text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-full bg-blue-500/15 border border-blue-400/20 flex items-center justify-center shrink-0">
            <BrainCircuit className={`w-3.5 h-3.5 text-blue-400 ${isThinking ? 'animate-pulse' : ''}`} />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-200">
                {isThinking ? 'Thinking with Gemini 3.8...' : `Thought for ${seconds} seconds`}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-medium tracking-tight">
                Extended
              </span>
            </div>
            <span className="text-[11px] text-zinc-400 truncate">
              {isThinking
                ? 'Synthesizing multi-step reasoning, constraints & verification'
                : 'Reasoning trace and logical steps'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {thoughtText && !isThinking && (
            <button
              onClick={handleCopy}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 transition-colors"
              title="Copy thought process"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          )}
        </div>
      </button>

      {/* Accordion Content */}
      {isOpen && (
        <div className="px-4 py-3 border-t border-zinc-800/80 bg-black/20 text-xs text-zinc-300 space-y-2.5 leading-relaxed font-mono selection:bg-blue-500/30">
          <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800 text-[11px] text-zinc-400 font-sans">
            <span className="flex items-center gap-1 text-blue-400">
              <Sparkles className="w-3 h-3" />
              Gemini 3.8 Thinking Budget: High (Max Tokens)
            </span>
            <span>Reasoning Model</span>
          </div>

          <div className="whitespace-pre-wrap font-sans text-xs text-zinc-300 overflow-x-auto">
            {thoughtText || (
              <div className="flex items-center gap-2 py-2 text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                Validating edge cases, decomposing constraints, formulating deductive paths...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
