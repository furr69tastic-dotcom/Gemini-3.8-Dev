import React, { useState } from 'react';
import { 
  Menu, 
  ChevronDown, 
  Sparkles, 
  Zap, 
  BrainCircuit, 
  Radio, 
  Check, 
  X,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { GeminiModelId } from '../types/gemini';
import { GeminiSparkleIcon } from './GeminiSparkleIcon';

interface GeminiHeaderProps {
  onOpenDrawer: () => void;
  currentModel: GeminiModelId;
  onSelectModel: (model: GeminiModelId) => void;
  extendedThinking: boolean;
  onToggleExtendedThinking: () => void;
  onLaunchLive: () => void;
  autoSpeechEnabled: boolean;
  onToggleAutoSpeech: () => void;
}

export const GeminiHeader: React.FC<GeminiHeaderProps> = ({
  onOpenDrawer,
  currentModel,
  onSelectModel,
  extendedThinking,
  onToggleExtendedThinking,
  onLaunchLive,
  autoSpeechEnabled,
  onToggleAutoSpeech,
}) => {
  const [isModelSheetOpen, setIsModelSheetOpen] = useState(false);

  const getModelLabel = () => {
    switch (currentModel) {
      case 'gemini-3.8-pro-extended':
        return 'Gemini 3.8 Pro Extended';
      case 'gemini-3.8-live':
        return 'Gemini 3.8 Live';
      case 'gemini-3.8-live-extended-thinking':
        return 'Gemini 3.8 Live Extended';
      case 'gemini-3.8-flash':
      default:
        return extendedThinking ? 'Gemini 3.8 Extended' : 'Gemini 3.8 Flash';
    }
  };

  const modelOptions = [
    {
      id: 'gemini-3.8-pro-extended' as GeminiModelId,
      name: 'Gemini 3.8 Pro Extended',
      tag: 'Extended Reasoning',
      description: 'Maximum intelligence, step-by-step thinking trace, math & advanced coding logic.',
      icon: <BrainCircuit className="w-5 h-5 text-indigo-400" />,
      badge: 'Advanced',
    },
    {
      id: 'gemini-3.8-flash' as GeminiModelId,
      name: 'Gemini 3.8 Flash',
      tag: 'Fast & Versatile',
      description: 'Lightning-fast responses for everyday tasks, text creation, and image understanding.',
      icon: <Zap className="w-5 h-5 text-amber-400" />,
      badge: 'Default',
    },
    {
      id: 'gemini-3.8-live' as GeminiModelId,
      name: 'Gemini 3.8 Live',
      tag: 'Real-time Voice',
      description: 'Fluid natural voice dialogue with instant interruption handling.',
      icon: <Radio className="w-5 h-5 text-blue-400" />,
      badge: 'Live Voice',
      isLiveLauncher: true,
    },
    {
      id: 'gemini-3.8-live-extended-thinking' as GeminiModelId,
      name: 'Gemini 3.8 Live Extended',
      tag: 'Thinker-Talker Voice',
      description: 'Real-time conversational voice equipped with deep on-the-fly reasoning.',
      icon: <Sparkles className="w-5 h-5 text-purple-400" />,
      badge: 'Live + Reason',
      isLiveLauncher: true,
    },
  ];

  return (
    <>
      <header className="h-14 px-4 flex items-center justify-between border-b border-zinc-800/80 bg-[#131314] z-20 shrink-0">
        {/* Left: Drawer Hamburger Button */}
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenDrawer}
            className="p-2 -ml-1.5 rounded-full hover:bg-zinc-800/80 text-zinc-300 transition-colors cursor-pointer"
            aria-label="Navigation drawer"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Center: Model Selector Dropdown Pill */}
        <button
          onClick={() => setIsModelSheetOpen(true)}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1e1f20] hover:bg-[#282a2c] border border-zinc-700/60 transition-all cursor-pointer shadow-sm group"
        >
          <GeminiSparkleIcon className="w-4 h-4" />
          <span className="text-xs font-semibold text-zinc-200 tracking-tight group-hover:text-white">
            {getModelLabel()}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-200 transition-transform" />
        </button>

        {/* Right: Auto-Speech Toggle, Gemini Advanced Pill & User Avatar */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Automatic Speech Response Toggle */}
          <button
            onClick={onToggleAutoSpeech}
            className={`p-1.5 sm:px-2.5 sm:py-1 rounded-full flex items-center gap-1.5 transition-all cursor-pointer border ${
              autoSpeechEnabled
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 shadow-sm shadow-blue-500/10'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 border-transparent'
            }`}
            title={
              autoSpeechEnabled
                ? 'Automatic speech response: ON (Gemini speaks answers automatically)'
                : 'Automatic speech response: OFF (Tap to auto-speak answers)'
            }
            aria-label="Toggle automatic speech response"
          >
            {autoSpeechEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-blue-400" />
                <span className="hidden md:inline text-[11px] font-medium text-blue-300">Auto-speech</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-zinc-500" />
                <span className="hidden md:inline text-[11px] text-zinc-500">Speech off</span>
              </>
            )}
          </button>

          <span className="hidden sm:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-600/30 via-purple-600/30 to-pink-600/30 border border-blue-500/40 text-blue-300">
            Advanced
          </span>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-zinc-700/50 cursor-pointer shadow-md">
            G
          </div>
        </div>
      </header>

      {/* Model Selection Bottom Sheet (Android Modal) */}
      {isModelSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#1e1f20] border border-zinc-700/80 rounded-t-[28px] sm:rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-250 max-h-[90vh] overflow-y-auto">
            {/* Sheet Handle */}
            <div className="w-10 h-1 bg-zinc-600 rounded-full mx-auto mb-4 sm:hidden" />

            <div className="flex items-center justify-between pb-3 mb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <GeminiSparkleIcon className="w-5 h-5" />
                <div>
                  <h3 className="text-sm font-semibold text-white">Gemini 3.8 Model Series</h3>
                  <p className="text-[11px] text-zinc-400">Select model and reasoning configuration</p>
                </div>
              </div>
              <button
                onClick={() => setIsModelSheetOpen(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Model List */}
            <div className="space-y-2.5 my-3">
              {modelOptions.map((opt) => {
                const isSelected = currentModel === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => {
                      if (opt.isLiveLauncher) {
                        onSelectModel(opt.id);
                        setIsModelSheetOpen(false);
                        onLaunchLive();
                      } else {
                        onSelectModel(opt.id);
                        setIsModelSheetOpen(false);
                      }
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500/80 ring-1 ring-blue-500/40'
                        : 'bg-[#282a2c]/60 border-zinc-700/50 hover:bg-[#282a2c] hover:border-zinc-600'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-black/30 border border-white/5 shrink-0 mt-0.5">
                      {opt.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-white truncate">
                          {opt.name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 font-medium">
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                        {opt.description}
                      </p>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0 mt-1">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Extended Thinking Quick Toggle */}
            <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="text-xs font-medium text-zinc-200">Extended Thinking Mode</div>
                  <div className="text-[10px] text-zinc-400">High reasoning budget (32k tokens)</div>
                </div>
              </div>
              <button
                onClick={onToggleExtendedThinking}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  extendedThinking ? 'bg-blue-600' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 left-1 ${
                    extendedThinking ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Auto-Speech Quick Toggle */}
            <div className="mt-2.5 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="text-xs font-medium text-zinc-200">Automatic Speech Output</div>
                  <div className="text-[10px] text-zinc-400">Read responses aloud automatically</div>
                </div>
              </div>
              <button
                onClick={onToggleAutoSpeech}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  autoSpeechEnabled ? 'bg-blue-600' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 left-1 ${
                    autoSpeechEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
