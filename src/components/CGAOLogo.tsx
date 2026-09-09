import React from 'react';

interface CGAOLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const CGAOLogo: React.FC<CGAOLogoProps> = ({ size = 'md', showText = true }) => {
  const dimensions = {
    sm: { box: 28, text: 'text-sm' },
    md: { box: 36, text: 'text-base' },
    lg: { box: 48, text: 'text-xl' },
  }[size];

  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className="relative flex items-center justify-center" style={{ width: dimensions.box, height: dimensions.box }}>
        {/* Soft glowing ambient halo */}
        <div className="absolute inset-0 rounded-full bg-[#10b981]/20 blur-md pointer-events-none" />
        
        {/* Outer capsule curve like Image 2 & 3 */}
        <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
          <defs>
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="50%" stopColor="#059669" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
            <linearGradient id="outerPillGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c0c1ff" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#8083ff" stopOpacity="0.7" />
            </linearGradient>
          </defs>
          
          {/* Subtle outer curved capsule accent */}
          <path
            d="M 28 6 C 37 6 42 14 42 24 C 42 34 37 42 28 42"
            stroke="url(#outerPillGrad)"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />

          {/* Primary iridescent emerald-blue circle ring */}
          <circle
            cx="20"
            cy="24"
            r="14"
            stroke="url(#ringGrad)"
            strokeWidth="3.6"
            className="drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
          />
          
          {/* Inner specular shine dot */}
          <circle
            cx="16"
            cy="18"
            r="1.6"
            fill="#ffffff"
            opacity="0.8"
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold tracking-wider text-white font-display text-base">
              CGAO
            </span>
          </div>
          <span className="text-[10px] font-semibold tracking-wider text-[#39a900] uppercase font-display mt-0.5">
            CAFETERÍA SENA
          </span>
        </div>
      )}
    </div>
  );
};
