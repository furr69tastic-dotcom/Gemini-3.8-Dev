import React from 'react';
import { 
  BrainCircuit, 
  Radio, 
  Code2, 
  Compass, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { GeminiSparkleIcon } from './GeminiSparkleIcon';

interface GeminiWelcomeScreenProps {
  onSelectPrompt: (prompt: string, options?: { extendedThinking?: boolean, grounding?: boolean }) => void;
  onLaunchLive: () => void;
}

export const GeminiWelcomeScreen: React.FC<GeminiWelcomeScreenProps> = ({
  onSelectPrompt,
  onLaunchLive,
}) => {
  const suggestions = [
    {
      title: 'Extended Reasoning',
      prompt: 'Solve this step-by-step with your full extended thinking process: A train leaves Station A traveling at 80 km/h. Two hours later, a high-speed express train leaves Station A at 140 km/h in the same direction. When and at what distance from Station A does the express train overtake the first train?',
      desc: 'Deep multi-step math with thinking trace',
      icon: <BrainCircuit className="w-4 h-4 text-indigo-400" />,
      extended: true,
      tag: 'Extended 3.8',
    },
    {
      title: 'Gemini Live Voice',
      prompt: 'Launch Live voice conversation',
      desc: 'Real-time two-way voice with Zephyr',
      icon: <Radio className="w-4 h-4 text-blue-400" />,
      action: onLaunchLive,
      tag: 'Live Audio',
    },
    {
      title: 'Coding Architecture',
      prompt: 'Design an efficient distributed rate limiter in TypeScript using a token bucket algorithm with sliding log fallback. Provide complete code and complexity analysis.',
      desc: 'Senior systems engineering logic',
      icon: <Code2 className="w-4 h-4 text-emerald-400" />,
      extended: true,
      tag: 'Code Master',
    },
    {
      title: 'Google Search Grounding',
      prompt: "What are the latest breakthrough announcements and capabilities of Google's Gemini 3 series?",
      desc: 'Live grounded web search results',
      icon: <Compass className="w-4 h-4 text-amber-400" />,
      grounding: true,
      tag: 'Search Grounding',
    },
  ];

  return (
    <div className="flex-1 flex flex-col justify-center px-5 py-6 max-w-lg mx-auto w-full animate-in fade-in duration-300">
      {/* Brand Hero Header */}
      <div className="mb-6 space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500/20 via-purple-500/20 to-pink-500/20 border border-blue-500/30 flex items-center justify-center shadow-lg mb-3">
          <GeminiSparkleIcon className="w-7 h-7" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-pink-400 bg-clip-text text-transparent">
          Hello, there
        </h1>

        <p className="text-sm text-zinc-400 font-medium">
          How can Gemini 3.8 help you today?
        </p>
      </div>

      {/* Suggestion Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {suggestions.map((item, idx) => (
          <button
            key={idx}
            onClick={() => {
              if (item.action) {
                item.action();
              } else {
                onSelectPrompt(item.prompt, {
                  extendedThinking: item.extended,
                  grounding: item.grounding,
                });
              }
            }}
            className="group flex flex-col text-left p-3.5 rounded-2xl bg-[#1e1f20] hover:bg-[#282a2c] border border-zinc-800/80 hover:border-zinc-700 transition-all cursor-pointer shadow-sm relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 rounded-xl bg-black/40 border border-white/5">
                {item.icon}
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-zinc-300">
                {item.tag}
              </span>
            </div>

            <div className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors">
              {item.title}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5 leading-snug line-clamp-2">
              {item.desc}
            </div>

            <div className="mt-2 flex items-center gap-1 text-[11px] text-blue-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Try now</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
