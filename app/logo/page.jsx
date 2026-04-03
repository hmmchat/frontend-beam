import React from 'react';

export default function AnimatedBearLogo() {
  return (
    // Background container (matches the purple vibe from your video)
    <div className="flex h-screen w-full items-center justify-center bg-[#290066]">
      
      {/* Inline styles for the custom sweep keyframes so you don't have to edit tailwind.config.js */}
      <style>
        {`
          @keyframes sweep {
            0% { transform: translateX(-150%); }
            100% { transform: translateX(150%); }
          }
          .animate-sweep {
            animation: sweep 2.5s infinite ease-in-out;
          }
        `}
      </style>

      {/* Main Logo Container from Figma */}
      <div 
        className="relative flex items-center justify-center overflow-hidden rounded-lg"
        style={{ width: '271px', height: '109.865px' }}
      >
        {/* The Text */}
        <h1 
          className="text-7xl font-black tracking-wider text-[#F2AD00] select-none"
          style={{
            // Creating that chunky 3D extrusion shadow from the video using your dark color
            textShadow: `
              2px 2px 0px #030222, 
              4px 4px 0px #030222, 
              6px 6px 0px #030222, 
              8px 8px 0px #030222, 
              10px 10px 0px #030222
            `,
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
        >
          bear
        </h1>

        {/* The Sweeping Shine Overlay */}
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none animate-sweep">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 203 68" 
            fill="none"
            style={{
              width: '332.486px',
              height: '131.218px',
              transform: 'rotate(68.903deg)',
              mixBlendMode: 'overlay', // This makes it brighten the yellow but hide on the dark shadow
            }}
            className="flex-shrink-0"
          >
            <path 
              d="M57.4834 -38.4161L202.248 262.105L79.8262 309.337L-3.72768 -14.8002L57.4834 -38.4161Z" 
              fill="white" 
              fillOpacity="0.5"
            />
          </svg>
        </div>
        
      </div>
    </div>
  );
}