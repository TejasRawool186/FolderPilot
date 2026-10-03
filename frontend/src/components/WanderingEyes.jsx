'use client';

import React from 'react';

/**
 * WanderingEyes
 * Renders two organic animated eyes that look around and blink.
 * Designed for discovery, scanning, queue watching, and active search states.
 */
export default function WanderingEyes({
  className = "",
  size = "lg", // 'sm' | 'md' | 'lg' | 'xl'
  eyeColor = "rgba(96, 165, 250, 0.15)",
  pupilColor = "#60a5fa",
  duration = "3.6s",
}) {
  // Dimension scales based on size
  const sizeConfig = {
    sm: {
      socket: "w-10 h-10",
      pupil: "w-4 h-4",
      core: "w-2.5 h-2.5",
      light: "w-1 h-1",
      gap: "space-x-3",
      container: "w-[120px] h-[52px]",
      travel: 4
    },
    md: {
      socket: "w-14 h-14",
      pupil: "w-6 h-6",
      core: "w-3.5 h-3.5",
      light: "w-1.5 h-1.5",
      gap: "space-x-4",
      container: "w-[160px] h-[72px]",
      travel: 6
    },
    lg: {
      socket: "w-20 h-20",
      pupil: "w-9 h-9",
      core: "w-5 h-5",
      light: "w-2 h-2",
      gap: "space-x-6",
      container: "w-[240px] h-[108px]",
      travel: 9
    },
    xl: {
      socket: "w-24 h-24",
      pupil: "w-11 h-11",
      core: "w-6 h-6",
      light: "w-2.5 h-2.5",
      gap: "space-x-8",
      container: "w-[280px] h-[124px]",
      travel: 12
    }
  };

  const config = sizeConfig[size] || sizeConfig.lg;

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${config.container} ${className}`}
      style={{
        '--eye-color': eyeColor,
        '--pupil-color': pupilColor,
        '--duration': duration
      }}
      aria-label="Scanning in progress..."
      role="status"
    >
      <style jsx>{`
        @keyframes wander-pupil-left {
          0%, 100% {
            transform: translate(0px, 0px);
          }
          12% {
            transform: translate(8px, -6px);
          }
          28% {
            transform: translate(10px, 3px);
          }
          45% {
            transform: translate(-9px, 4px);
          }
          62% {
            transform: translate(-8px, -7px);
          }
          78% {
            transform: translate(6px, 5px);
          }
          90% {
            transform: translate(0px, 0px);
          }
        }

        @keyframes wander-pupil-right {
          0%, 100% {
            transform: translate(0px, 0px);
          }
          12% {
            transform: translate(8px, -6px);
          }
          28% {
            transform: translate(10px, 3px);
          }
          45% {
            transform: translate(-9px, 4px);
          }
          62% {
            transform: translate(-8px, -7px);
          }
          78% {
            transform: translate(6px, 5px);
          }
          90% {
            transform: translate(0px, 0px);
          }
        }

        @keyframes organic-blink {
          0%, 46%, 52%, 94%, 98%, 100% {
            transform: scaleY(1);
          }
          49% {
            transform: scaleY(0.08);
          }
          96% {
            transform: scaleY(0.08);
          }
        }

        @keyframes eye-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(96, 165, 250, 0.25), inset 0 0 10px rgba(96, 165, 250, 0.15);
          }
          50% {
            box-shadow: 0 0 35px rgba(96, 165, 250, 0.55), inset 0 0 16px rgba(96, 165, 250, 0.35);
          }
        }

        .eye-socket {
          animation: organic-blink var(--duration) cubic-bezier(0.4, 0, 0.2, 1) infinite,
                     eye-glow 2.4s ease-in-out infinite;
          transform-origin: center;
        }

        .pupil-left {
          animation: wander-pupil-left var(--duration) ease-in-out infinite;
        }

        .pupil-right {
          animation: wander-pupil-right var(--duration) ease-in-out infinite;
        }
      `}</style>

      {/* Eyes Container */}
      <div className={`flex items-center ${config.gap}`}>
        {/* Left Eye */}
        <div className={`eye-socket relative ${config.socket} rounded-full bg-[#080d14] border-2 border-blue-400/50 flex items-center justify-center overflow-hidden shadow-2xl backdrop-blur-md`}>
          {/* Sclera tint */}
          <div
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: 'var(--eye-color)' }}
          />
          {/* Pupil with catchlight */}
          <div className={`pupil-left relative ${config.pupil} rounded-full bg-gradient-to-tr from-blue-600 via-blue-400 to-cyan-300 shadow-[0_0_16px_rgba(96,165,250,0.9)] flex items-center justify-center`}>
            {/* Pupil core */}
            <div className={`${config.core} rounded-full bg-[#030712]`} />
            {/* Catchlight reflection */}
            <div className={`absolute top-1.5 right-1.5 ${config.light} rounded-full bg-white opacity-95 shadow-sm`} />
          </div>
        </div>

        {/* Right Eye */}
        <div className={`eye-socket relative ${config.socket} rounded-full bg-[#080d14] border-2 border-blue-400/50 flex items-center justify-center overflow-hidden shadow-2xl backdrop-blur-md`}>
          {/* Sclera tint */}
          <div
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: 'var(--eye-color)' }}
          />
          {/* Pupil with catchlight */}
          <div className={`pupil-right relative ${config.pupil} rounded-full bg-gradient-to-tr from-blue-600 via-blue-400 to-cyan-300 shadow-[0_0_16px_rgba(96,165,250,0.9)] flex items-center justify-center`}>
            {/* Pupil core */}
            <div className={`${config.core} rounded-full bg-[#030712]`} />
            {/* Catchlight reflection */}
            <div className={`absolute top-1.5 right-1.5 ${config.light} rounded-full bg-white opacity-95 shadow-sm`} />
          </div>
        </div>
      </div>
    </div>
  );
}
