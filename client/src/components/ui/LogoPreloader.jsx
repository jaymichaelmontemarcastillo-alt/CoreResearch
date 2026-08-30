// src/components/ui/LogoPreloader.jsx
import React, { useState, useEffect } from "react";
import logoImg from "../../assets/logo.png";

const DEFAULT_MESSAGES = [
  "Initializing your research workspace...",
  "Syncing manuscripts and reviews...",
  "Loading collaborative editor...",
  "Securing your session...",
];

export const LogoPreloader = ({
  message,
  subtext,
  fullScreen = true,
  className = "",
}) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    if (message) return; // If custom static message is provided, don't cycle
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % DEFAULT_MESSAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [message]);

  const activeMessage = message || DEFAULT_MESSAGES[currentMessageIndex];

  const content = (
    <div className={`relative flex flex-col items-center justify-center text-center select-none ${className}`}>
      {/* Pure Standalone Logo Fill (No Box / No Outlines / No External Bleed) */}
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center mb-5">
        {/* Base Layer: Dark Silhouette Logo Shape */}
        <img
          src={logoImg}
          alt="CoreResearch Logo Background"
          className="w-full h-full object-contain opacity-20 grayscale brightness-75 select-none pointer-events-none"
        />

        {/* Foreground Layer: Crisp Pure Logo Fill (Clips strictly within logo bounds) */}
        <div className="absolute inset-0 flex items-center justify-center logo-fill-liquid pointer-events-none select-none">
          <img
            src={logoImg}
            alt="CoreResearch Logo"
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Brand Title */}
      <div className="flex items-center gap-1.5 text-lg font-semibold tracking-tight mb-2">
        <span className="text-white">Core</span>
        <span className="text-blue-500">Research</span>
      </div>

      {/* Sleek Gradient Progress Track */}
      <div className="w-48 sm:w-56 h-1 bg-[#1c1d28] border border-[#222433] rounded-full overflow-hidden mb-3 relative">
        <div className="absolute inset-y-0 bg-gradient-to-r from-blue-600 via-blue-400 to-cyan-400 rounded-full w-full progress-bar-shimmer" />
      </div>

      {/* Dialogue Message */}
      <p className="text-xs sm:text-sm font-medium text-[#9396a8] transition-all duration-300 min-h-[20px]">
        {activeMessage}
      </p>

      {subtext && (
        <p className="text-[11px] text-[#6b6f84] mt-1">
          {subtext}
        </p>
      )}
    </div>
  );

  if (!fullScreen) {
    return content;
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0b0c10] text-[#f3f4f8] relative overflow-hidden">
      {/* Background Tech Dot Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.7) 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />

      {content}
    </div>
  );
};
