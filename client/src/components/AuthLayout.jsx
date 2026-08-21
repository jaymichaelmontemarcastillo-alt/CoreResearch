// src/components/AuthLayout.jsx
import React from "react";
import { Link } from "react-router-dom";
import logoImg from "../assets/logo.png";

export const AuthLayout = ({
  children,
  title,
  subtitle,
  quoteTitle = "From the first title proposal to the last published page.",
  quoteSubtitle = "Streamline student research, adviser reviews, defense scheduling, and institutional repository publication all in one unified workspace.",
  cardWidthClass = "lg:w-[480px] xl:w-[530px]",
}) => {
  return (
    <div className="min-h-screen lg:h-screen w-full relative flex p-3 sm:p-5 lg:p-6 xl:p-8 bg-[#070c18] text-slate-100 overflow-y-auto lg:overflow-hidden selection:bg-blue-500 selection:text-white">
      {/* Immersive Ambient Gradient & Mesh Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Base multi-stop deep navy & slate gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#050811] via-[#091021] to-[#060b17]" />

        {/* Soft glowing ambient orbs */}
        <div className="absolute -top-[10%] -left-[10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full bg-blue-600/12 blur-[140px]" />
        <div className="absolute top-[35%] -left-[5%] w-[45vw] h-[45vw] max-w-[600px] max-h-[600px] rounded-full bg-indigo-500/10 blur-[150px]" />
        <div className="absolute -bottom-[10%] right-[25%] w-[50vw] h-[50vw] max-w-[700px] max-h-[700px] rounded-full bg-blue-700/15 blur-[140px]" />
        <div className="absolute top-[10%] right-[10%] w-[35vw] h-[35vw] max-w-[450px] max-h-[450px] rounded-full bg-cyan-500/8 blur-[130px]" />

        {/* Subtle high-tech geometric grid dots */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.6) 1px, transparent 1px)`,
            backgroundSize: "28px 28px",
          }}
        />

        {/* Subtle geometric line aesthetic overlay */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.025] stroke-white"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="auth-grid"
              width="100"
              height="100"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 100 0 L 0 0 0 100"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#auth-grid)" />
        </svg>
      </div>

      {/* Main Container Layout */}
      <div className="relative z-10 w-full h-full flex flex-col lg:flex-row justify-between gap-6">
        
        {/* LEFT COLUMN: Top-Left Logo & Lower-Left Quotes */}
        <div className="flex-1 flex flex-col justify-between p-4 sm:p-6 lg:p-8 xl:p-10 z-10 min-h-[140px] lg:min-h-full">
          
          {/* Top-Left Logo */}
          <header className="flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-3.5 group cursor-pointer"
            >
              <img
                src={logoImg}
                alt="CoreResearch Logo"
                className="w-10 h-10 sm:w-11 sm:h-11 object-contain drop-shadow-[0_0_18px_rgba(59,130,246,0.6)] transition-transform duration-300 group-hover:scale-105"
              />
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center">
                <span>Core</span>
                <span className="text-blue-500">Research</span>
              </span>
            </Link>
          </header>

          {/* Lower-Left Quotes & Tagline */}
          <div className="hidden lg:block space-y-5 max-w-xl pb-4 xl:pb-8">
            <h1 className="text-3xl sm:text-4xl xl:text-5xl font-extrabold text-white tracking-tight leading-[1.15]">
              {quoteTitle}
            </h1>
            <p className="text-sm xl:text-base text-slate-300/80 font-normal leading-relaxed max-w-lg">
              {quoteSubtitle}
            </p>
            {/* Slide / Carousel Indicator Accent */}
            <div className="flex items-center gap-2 pt-2">
              <div className="w-8 h-1.5 bg-white rounded-full" />
              <div className="w-2 h-1.5 bg-white/30 rounded-full" />
              <div className="w-2 h-1.5 bg-white/30 rounded-full" />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Floating Tall White Card */}
        <div className={`w-full ${cardWidthClass} h-full bg-white dark:bg-slate-900 rounded-[28px] sm:rounded-[36px] shadow-[0_25px_80px_-15px_rgba(0,0,0,0.7)] border border-white/80 dark:border-slate-800/90 flex flex-col justify-between p-6 sm:p-9 xl:p-12 z-20 shrink-0 overflow-y-auto text-gray-900 dark:text-gray-100 my-auto lg:my-0`}>
          
          {/* Card Top & Body Container */}
          <div className="w-full flex-1 flex flex-col justify-center">
            {/* Header inside floating card */}
            {(title || subtitle) && (
              <div className="mb-6 xl:mb-8">
                {title && (
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                    {subtitle}
                  </p>
                )}
              </div>
            )}

            {/* Form Content */}
            {children}
          </div>

          {/* Card Bottom Footer */}
          <div className="pt-4 text-center text-[11px] text-gray-400 dark:text-gray-500 shrink-0">
            © 2026 CoreResearch
          </div>
        </div>

      </div>
    </div>
  );
};




