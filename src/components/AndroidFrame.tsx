import React, { useState, useEffect } from 'react';
import { Wifi, BatteryMedium, Sparkles, Smartphone, Maximize2 } from 'lucide-react';

interface AndroidFrameProps {
  children: React.ReactNode;
  isFrameEnabled: boolean;
  onToggleFrame: () => void;
}

export const AndroidFrame: React.FC<AndroidFrameProps> = ({
  children,
  isFrameEnabled,
  onToggleFrame,
}) => {
  const [time, setTime] = useState('12:25');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setTime(`${hours}:${minutes}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#0c0c0d] flex flex-col items-center justify-center p-0 md:p-4 overflow-hidden select-none">
      {/* Floating frame toggle badge */}
      <div className="fixed top-3 right-3 z-50 flex items-center gap-2 bg-zinc-900/80 backdrop-blur-md border border-zinc-700/60 rounded-full px-3 py-1.5 shadow-lg text-xs text-zinc-300">
        <span className="hidden sm:inline text-zinc-400 font-medium">Gemini 3.8 Android</span>
        <button
          onClick={onToggleFrame}
          className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer py-0.5 px-1.5 rounded-full hover:bg-zinc-800"
          title="Toggle Android Device Shell"
        >
          {isFrameEnabled ? (
            <>
              <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Full Screen</span>
            </>
          ) : (
            <>
              <Smartphone className="w-3.5 h-3.5 text-blue-400" />
              <span>Pixel Frame</span>
            </>
          )}
        </button>
      </div>

      {/* Main Container: Pixel Phone Frame or Full Window */}
      <div
        className={`relative flex flex-col bg-[#131314] text-[#e3e3e3] overflow-hidden transition-all duration-300 ${
          isFrameEnabled
            ? 'w-full max-w-[430px] h-[100dvh] md:h-[880px] md:rounded-[46px] md:border-[9px] md:border-[#2b2b2e] shadow-2xl md:ring-1 md:ring-white/10'
            : 'w-full h-[100dvh]'
        }`}
      >
        {/* Pixel Speaker Slit (Frame mode only) */}
        {isFrameEnabled && (
          <div className="hidden md:block absolute top-2 left-1/2 -translate-x-1/2 w-14 h-1 bg-zinc-700 rounded-full z-40" />
        )}

        {/* Android Status Bar */}
        <div className="h-10 w-full px-6 flex items-center justify-between text-xs font-medium text-zinc-300 bg-[#131314] shrink-0 z-30 select-none">
          {/* Time & App Icons */}
          <div className="flex items-center gap-2">
            <span className="font-semibold tracking-tight">{time}</span>
            <div className="flex items-center gap-1 text-zinc-400">
              <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            </div>
          </div>

          {/* Punch Hole Camera Cutout */}
          <div className="w-3.5 h-3.5 rounded-full bg-black border border-zinc-800/80 mx-auto" />

          {/* System Icons: 5G, Wi-Fi, Battery */}
          <div className="flex items-center gap-2 text-zinc-300">
            <span className="text-[10px] font-bold tracking-wider text-zinc-400">5G</span>
            <Wifi className="w-3.5 h-3.5 text-zinc-300" />
            <div className="flex items-center gap-0.5">
              <span className="text-[10px] font-medium text-zinc-400">98%</span>
              <BatteryMedium className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Inner App Content */}
        <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden bg-[#131314]">
          {children}
        </div>

        {/* Android Gesture Navigation Indicator Bar */}
        <div className="h-5 w-full flex items-center justify-center bg-[#131314] shrink-0 pb-1 z-30">
          <div className="w-32 h-1 bg-zinc-500/60 rounded-full active:bg-zinc-400 transition-colors" />
        </div>
      </div>
    </div>
  );
};
