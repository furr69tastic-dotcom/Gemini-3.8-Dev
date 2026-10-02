import React from 'react';

interface GeminiSparkleProps {
  className?: string;
  size?: number;
}

export const GeminiSparkleIcon: React.FC<GeminiSparkleProps> = ({
  className = 'w-6 h-6',
  size,
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      <defs>
        <linearGradient id="gemini-grad-icon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4285F4" />
          <stop offset="45%" stopColor="#9B51E0" />
          <stop offset="75%" stopColor="#EB478E" />
          <stop offset="100%" stopColor="#FF7754" />
        </linearGradient>
        <radialGradient id="gemini-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4285F4" stopOpacity="0.8" />
          <stop offset="60%" stopColor="#9B51E0" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#9B51E0" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* 4-point celestial Gemini Star */}
      <path
        d="M12 1C12 7.07513 7.07513 12 1 12C7.07513 12 12 16.9249 12 23C12 16.9249 16.9249 12 23 12C16.9249 12 12 7.07513 12 1Z"
        fill="url(#gemini-grad-icon)"
      />
    </svg>
  );
};
