import React, { useState } from 'react';
import { 
  X, 
  Search, 
  Cpu, 
  BrainCircuit, 
  ExternalLink, 
  Radio, 
  Mic, 
  Volume2, 
  Globe, 
  Layers, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { VoiceName } from '../types/gemini';
import { playSpeech } from '../utils/audioUtils';

export interface LiveSearchTurn {
  id: string;
  timestamp: number;
  query: string;
  replySnippet: string;
  sources?: Array<{
    title?: string;
    uri?: string;
  }>;
  searchQueries?: string[];
  modelUsed?: string;
}

interface LiveArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
  extendedThinking: boolean;
  onToggleExtendedThinking: () => void;
  liveSearchEnabled: boolean;
  onToggleLiveSearch: () => void;
  activeVoice: VoiceName;
  onVoiceChange: (voice: VoiceName) => void;
  recentTurns: LiveSearchTurn[];
  onTriggerSearchTest: (query: string) => void;
}

export const LiveArchitectureModal: React.FC<LiveArchitectureModalProps> = ({
  isOpen,
  onClose,
  extendedThinking,
  onToggleExtendedThinking,
  liveSearchEnabled,
  onToggleLiveSearch,
  activeVoice,
  onVoiceChange,
  recentTurns,
  onTriggerSearchTest,
}) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'search_log' | 'test'>('architecture');
  const [testQuery, setTestQuery] = useState('');

  if (!isOpen) return null;

  const voices: VoiceName[] = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir'];

  const handleTestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuery.trim()) return;
    onTriggerSearchTest(testQuery.trim());
    setTestQuery('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#18191b] border border-zinc-700/80 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-zinc-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-[#1e1f20]/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-white">Extended Live Architecture & Search</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono border border-blue-500/30">
                  Gemini 3.8 Series
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Multi-modal voice pipeline with real-time Google Search grounding
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-zinc-800 bg-[#161719] px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'architecture'
                ? 'border-blue-400 text-blue-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Pipeline Architecture</span>
          </button>
          <button
            onClick={() => setActiveTab('search_log')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'search_log'
                ? 'border-blue-400 text-blue-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search Grounding Log ({recentTurns.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'test'
                ? 'border-blue-400 text-blue-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Live Query Test</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
          {activeTab === 'architecture' && (
            <div className="space-y-4">
              {/* Architecture Diagram Steps */}
              <div className="space-y-3">
                {/* Step 1: Input Layer */}
                <div className="p-3.5 rounded-2xl bg-[#202124] border border-zinc-700/60 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                    <Mic className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">1. Audio & Vision Ingestion</span>
                      <span className="text-[10px] text-zinc-400 font-mono">16kHz PCM / Video JPEG</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                      Captures real-time user microphone audio and camera frames with continuous client-side VAD (Voice Activity Detection).
                    </p>
                  </div>
                </div>

                <div className="flex justify-center -my-1 text-zinc-600">
                  <ArrowRight className="w-4 h-4 rotate-90" />
                </div>

                {/* Step 2: Extended Thinking Core */}
                <div className="p-3.5 rounded-2xl bg-[#202124] border border-indigo-500/40 ring-1 ring-indigo-500/20 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                    <BrainCircuit className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-indigo-200">2. Thinker-Talker Reasoning Core</span>
                      <span className="text-[10px] text-indigo-300 font-mono">32,768 Token Budget</span>
                    </div>
                    <p className="text-[11px] text-zinc-300 mt-0.5 leading-relaxed">
                      Powers reasoning on-the-fly with <code className="text-indigo-300 font-mono">ThinkingLevel.HIGH</code>. Computes multi-step deductions before delivering concise conversational speech.
                    </p>
                    <div className="mt-2 flex items-center justify-between pt-2 border-t border-zinc-800">
                      <span className="text-[11px] text-zinc-400">Extended Thinking Mode</span>
                      <button
                        onClick={onToggleExtendedThinking}
                        className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                          extendedThinking ? 'bg-indigo-600' : 'bg-zinc-700'
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.5 left-0.5 ${
                            extendedThinking ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center -my-1 text-zinc-600">
                  <ArrowRight className="w-4 h-4 rotate-90" />
                </div>

                {/* Step 3: Google Search Grounding */}
                <div className="p-3.5 rounded-2xl bg-[#202124] border border-blue-500/40 ring-1 ring-blue-500/20 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-blue-200">3. Real-Time Search Grounding</span>
                      <span className="text-[10px] text-blue-300 font-mono">Google Search Engine</span>
                    </div>
                    <p className="text-[11px] text-zinc-300 mt-0.5 leading-relaxed">
                      Automatically queries live web indices when real-time facts, events, or external data are required, generating grounded citation metadata.
                    </p>
                    <div className="mt-2 flex items-center justify-between pt-2 border-t border-zinc-800">
                      <span className="text-[11px] text-zinc-400">Live Search Grounding</span>
                      <button
                        onClick={onToggleLiveSearch}
                        className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                          liveSearchEnabled ? 'bg-blue-600' : 'bg-zinc-700'
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.5 left-0.5 ${
                            liveSearchEnabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center -my-1 text-zinc-600">
                  <ArrowRight className="w-4 h-4 rotate-90" />
                </div>

                {/* Step 4: TTS Speech Synthesis */}
                <div className="p-3.5 rounded-2xl bg-[#202124] border border-zinc-700/60 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">4. Low-Latency Voice Synthesizer</span>
                      <span className="text-[10px] text-zinc-400 font-mono">24kHz 16-bit WAV</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                      Synthesizes natural, human-like voice responses with instantaneous client playback and interruption handling.
                    </p>

                    {/* Architecture Voice Audio Briefing */}
                    <div className="mt-3 p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <div>
                          <div className="text-[11px] font-medium text-indigo-200">Architecture Audio Briefing</div>
                          <div className="text-[10px] text-zinc-400">Voice: Fenrir (Architecture Voice)</div>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          playSpeech({
                            text: 'Welcome to the Extended Live Architecture. In this system, user audio is processed at 16 kilohertz with Gemini 3.8 real-time reasoning. High-reasoning turns activate a 32,000 token thinking trace, while live Google Search grounding queries real-world indices. Speech output is dynamically mapped to specialized American and British male personas.',
                            voiceName: 'Fenrir',
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium transition-colors cursor-pointer shrink-0"
                      >
                        Play Briefing
                      </button>
                    </div>

                    {/* Dedicated Voice Allocation Matrix */}
                    <div className="mt-3 pt-2.5 border-t border-zinc-800">
                      <div className="text-[11px] font-semibold text-zinc-300 mb-1.5">Voice Allocation Matrix</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px]">
                        <div className="p-2 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between">
                          <span className="text-zinc-400">💬 New Chat & Standard:</span>
                          <span className="font-semibold text-blue-300">Puck (American Male)</span>
                        </div>
                        <div className="p-2 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between">
                          <span className="text-zinc-400">🧠 Extended Thinking:</span>
                          <span className="font-semibold text-indigo-300">Fenrir (American Male)</span>
                        </div>
                        <div className="p-2 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between">
                          <span className="text-zinc-400">🎙️ Gemini Live:</span>
                          <span className="font-semibold text-blue-300">Puck / Fenrir (American)</span>
                        </div>
                        <div className="p-2 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between">
                          <span className="text-zinc-400">🌐 Search Grounding:</span>
                          <span className="font-semibold text-amber-300">Charon (British Male)</span>
                        </div>
                        <div className="p-2 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between sm:col-span-2">
                          <span className="text-zinc-400">🏗️ Architecture Overview:</span>
                          <span className="font-semibold text-purple-300">Fenrir (Architecture Voice)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'search_log' && (
            <div className="space-y-3">
              {recentTurns.length === 0 ? (
                <div className="py-10 text-center text-zinc-500">
                  <Search className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                  <p className="text-xs">No live search grounding queries yet in this session.</p>
                  <p className="text-[11px] text-zinc-600 mt-1">
                    Ask Gemini Live a question about recent events, scores, or facts to trigger live grounding!
                  </p>
                </div>
              ) : (
                recentTurns.map((turn) => (
                  <div
                    key={turn.id}
                    className="p-3.5 rounded-2xl bg-[#202124] border border-zinc-700/60 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                      <span className="font-semibold text-blue-300 flex items-center gap-1">
                        <Search className="w-3 h-3 text-blue-400" />
                        Prompt: "{turn.query}"
                      </span>
                      <span>{new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>

                    <p className="text-zinc-200 text-xs bg-black/20 p-2.5 rounded-xl border border-white/5">
                      {turn.replySnippet}
                    </p>

                    {/* Executed Web Search Queries */}
                    {turn.searchQueries && turn.searchQueries.length > 0 && (
                      <div className="pt-1">
                        <div className="text-[10px] font-medium text-zinc-400 mb-1">Generated Search Queries:</div>
                        <div className="flex flex-wrap gap-1">
                          {turn.searchQueries.map((q, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 text-[10px] font-mono border border-blue-500/30"
                            >
                              🔍 {q}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sources Grounded */}
                    {turn.sources && turn.sources.length > 0 && (
                      <div className="pt-1">
                        <div className="text-[10px] font-medium text-zinc-400 mb-1">Grounded Web Citations:</div>
                        <div className="flex flex-wrap gap-1.5">
                          {turn.sources.slice(0, 3).map((src: any, idx) => {
                            const title = src.web?.title || src.title || 'Source article';
                            const uri = src.web?.uri || src.uri || '#';
                            return (
                              <a
                                key={idx}
                                href={uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-blue-300 text-[10px] border border-zinc-700 truncate max-w-[200px]"
                              >
                                <span className="truncate">{title}</span>
                                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'test' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-xs">
                <div className="font-semibold text-blue-300 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  <span>Interactive Live Search Architecture Test</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Send a query through the live architecture pipeline to test Search Grounding and Extended Thinking in real time.
                </p>
              </div>

              <form onSubmit={handleTestSubmit} className="space-y-2">
                <label className="text-xs font-medium text-zinc-300 block">
                  Test Query or Prompt:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testQuery}
                    onChange={(e) => setTestQuery(e.target.value)}
                    placeholder="e.g. What is the latest James Webb telescope discovery?"
                    className="flex-1 bg-[#202124] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!testQuery.trim()}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-xs cursor-pointer"
                  >
                    Execute
                  </button>
                </div>
              </form>

              {/* Quick suggestions */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] text-zinc-400">Quick Test Prompts:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "What are the top world news headlines today?",
                    "What was the score of the latest Champions League game?",
                    "Current weather and forecast in Tokyo",
                    "Recent AI breakthroughs in 2026",
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        onTriggerSearchTest(preset);
                        onClose();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] border border-zinc-700 cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-zinc-800 bg-[#161719] flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Live Search Engine Online
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
