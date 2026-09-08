// src/components/ui/LogoPreloader.jsx
import React, { useState, useEffect } from "react";
import logoImg from "../../assets/logo.png";
import { useTheme } from "../../context/ThemeContext";

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
  let isDark = false;
  try {
    const themeContext = useTheme();
    isDark = themeContext?.theme === 'dark';
  } catch {
    isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  }

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
      {/* Crisp Logo with Ambient Glow and Gentle Breathe Animation */}
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center mb-5">
        {/* Ambient Soft Glow Behind Logo */}
        <div className="absolute inset-0 bg-blue-500/25 dark:bg-blue-500/20 blur-2xl rounded-full animate-pulse pointer-events-none" />

        {/* Clean, Full-Color Logo with Smooth Breathe Effect */}
        <img
          src={logoImg}
          alt="CoreResearch Logo"
          className="relative w-full h-full object-contain select-none pointer-events-none drop-shadow-md animate-logo-breathe"
        />
      </div>

      {/* Brand Title */}
      <div className="flex items-center gap-1.5 text-lg font-bold tracking-tight mb-2">
        <span className="text-gray-900 dark:text-white">Core</span>
        <span className="text-blue-600 dark:text-blue-500">Research</span>
      </div>

      {/* Sleek Gradient Progress Track (Fluid Forward Motion) */}
      <div className="w-48 sm:w-56 h-1.5 bg-gray-200/90 dark:bg-[#1c1d28] border border-gray-300/60 dark:border-[#222433] rounded-full overflow-hidden mb-3 relative shadow-inner">
        <div className="absolute inset-y-0 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 rounded-full progress-bar-fluid" />
      </div>

      {/* Dialogue Message */}
      <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-[#9396a8] transition-all duration-300 min-h-[20px]">
        {activeMessage}
      </p>

      {subtext && (
        <p className="text-[11px] text-gray-400 dark:text-[#6b6f84] mt-1">
          {subtext}
        </p>
      )}
    </div>
  );

  if (!fullScreen) {
    return content;
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-[#0b0c10] text-gray-900 dark:text-[#f3f4f8] relative overflow-hidden transition-colors duration-200">
      {/* Background Tech Dot Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-[0.03]"
        style={{
          backgroundImage: isDark
            ? `radial-gradient(rgba(255, 255, 255, 0.7) 1px, transparent 1px)`
            : `radial-gradient(rgba(0, 0, 0, 0.15) 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />

      {content}
    </div>
  );
};
