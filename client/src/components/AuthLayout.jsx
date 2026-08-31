// src/components/AuthLayout.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import logoImg from "../assets/logo.png";

const DEFAULT_SLIDES = [
  {
    title: "From the first title proposal to the last published page.",
    subtitle:
      "Streamline student research, adviser reviews, defense scheduling, and institutional repository publication all in one unified workspace.",
  },
  {
    title: "Automated defense scheduling with zero panel conflicts.",
    subtitle:
      "Coordinate panelist availabilities, allocate smart time slots, and conduct seamless title and oral defense presentations effortlessly.",
  },
  {
    title: "Empowering research groups & advisership in real-time.",
    subtitle:
      "Track chapter submissions, exchange rubric-based revisions, and achieve academic milestones collaboratively.",
  },
  {
    title: "Preserving institutional research for future scholars.",
    subtitle:
      "Discover, cite, and archive peer-reviewed university manuscripts in an accessible, searchable digital repository.",
  },
  {
    title: "Transparent milestone tracking from draft to defense.",
    subtitle:
      "Monitor progress percentages, resolve chapter action items, and qualify for graduation requirements without paperwork friction.",
  },
];

export const AuthLayout = ({
  children,
  title,
  subtitle,
  quoteTitle,
  quoteSubtitle,
  cardWidthClass = "lg:w-[48%] xl:w-[46%] 2xl:w-[44%] max-w-[650px] xl:max-w-[720px]",
}) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const slides =
    quoteTitle && quoteSubtitle
      ? [
          { title: quoteTitle, subtitle: quoteSubtitle },
          ...DEFAULT_SLIDES.slice(1),
        ]
      : DEFAULT_SLIDES;

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused, slides.length]);

  return (
    <div className="min-h-screen lg:h-screen w-full relative flex p-3 sm:p-5 lg:p-6 xl:p-8 bg-[#050508] text-slate-100 overflow-y-auto lg:overflow-hidden selection:bg-blue-500 selection:text-white">
      {/* Deep Black & Elegant Wavy Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-[#050508]">
        {/* Ambient glowing depth behind waves */}
        <div className="absolute top-[-15%] left-[-10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full bg-blue-600/12 blur-[140px]" />
        <div className="absolute bottom-[-15%] left-[20%] w-[50vw] h-[50vw] max-w-[700px] max-h-[700px] rounded-full bg-indigo-600/10 blur-[150px]" />
        <div className="absolute top-[30%] right-[-5%] w-[45vw] h-[45vw] max-w-[600px] max-h-[600px] rounded-full bg-blue-500/8 blur-[160px]" />

        {/* Flowing Layered Vector Waves */}
        <svg
          className="absolute inset-0 w-full h-full object-cover"
          viewBox="0 0 1440 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Wave Gradients */}
            <linearGradient id="wave-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.22" />
              <stop offset="50%" stopColor="#1d4ed8" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#050508" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="wave-grad-2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.18" />
              <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#050508" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="wave-stroke-1" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
              <stop offset="40%" stopColor="#3b82f6" stopOpacity="0.30" />
              <stop offset="80%" stopColor="#1d4ed8" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="wave-stroke-2" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.05" />
              <stop offset="30%" stopColor="#3b82f6" stopOpacity="0.40" />
              <stop offset="70%" stopColor="#2563eb" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.05" />
            </linearGradient>

            <linearGradient id="wave-stroke-3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.35" />
              <stop offset="50%" stopColor="#6366f1" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#050508" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Layer 1: Deep Broad Background Waves (Filled) */}
          <path
            d="M-100 900 C 200 850, 350 650, 700 700 C 1050 750, 1200 550, 1550 580 L 1550 900 Z"
            fill="url(#wave-grad-1)"
          />
          <path
            d="M-100 900 C 250 720, 500 880, 800 620 C 1100 360, 1300 620, 1550 500 L 1550 900 Z"
            fill="url(#wave-grad-2)"
          />

          {/* Layer 2: Main Flowing Ribbon Curves (Strokes) */}
          <path
            d="M -50 450 C 250 320, 450 680, 800 480 C 1150 280, 1350 520, 1550 380"
            stroke="url(#wave-stroke-1)"
            strokeWidth="2.5"
            fill="none"
          />
          <path
            d="M -50 490 C 270 360, 470 710, 810 520 C 1150 330, 1360 550, 1550 420"
            stroke="url(#wave-stroke-1)"
            strokeWidth="1.5"
            strokeOpacity="0.75"
            fill="none"
          />
          <path
            d="M -50 530 C 290 400, 490 740, 820 560 C 1150 380, 1370 580, 1550 460"
            stroke="url(#wave-stroke-1)"
            strokeWidth="1"
            strokeOpacity="0.5"
            fill="none"
          />

          {/* Layer 3: Secondary Harmonious Wave Mesh */}
          <path
            d="M -50 250 C 350 450, 600 200, 950 380 C 1300 560, 1400 300, 1550 320"
            stroke="url(#wave-stroke-2)"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M -50 290 C 360 480, 620 240, 960 410 C 1300 580, 1410 340, 1550 350"
            stroke="url(#wave-stroke-2)"
            strokeWidth="1.2"
            strokeOpacity="0.65"
            fill="none"
          />
          <path
            d="M -50 330 C 370 510, 640 280, 970 440 C 1300 600, 1420 380, 1550 380"
            stroke="url(#wave-stroke-2)"
            strokeWidth="0.8"
            strokeOpacity="0.4"
            fill="none"
          />

          {/* Layer 4: Lower Sweeping Wave Strands */}
          <path
            d="M -50 680 C 300 520, 550 780, 900 600 C 1250 420, 1400 650, 1550 560"
            stroke="url(#wave-stroke-3)"
            strokeWidth="1.8"
            fill="none"
          />
          <path
            d="M -50 720 C 320 560, 570 810, 910 630 C 1250 450, 1410 680, 1550 590"
            stroke="url(#wave-stroke-3)"
            strokeWidth="1.2"
            strokeOpacity="0.6"
            fill="none"
          />
          <path
            d="M -50 760 C 340 600, 590 840, 920 660 C 1250 480, 1420 710, 1550 620"
            stroke="url(#wave-stroke-3)"
            strokeWidth="0.8"
            strokeOpacity="0.35"
            fill="none"
          />
        </svg>

        {/* Subtle vignette for deep focus & contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-transparent to-[#050508]/50" />
      </div>

      {/* Main Container Layout */}
      <div className="relative z-10 w-full h-full flex flex-col lg:flex-row justify-between gap-6">
        {/* LEFT COLUMN: Top-Left Logo & Lower-Left Dialogues Slideshow */}
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
              <span className="text-2xl sm:text-3xl font-medium tracking-tight text-white flex items-center">
                <span>Core</span>
                <span className="text-blue-500">Research</span>
              </span>
            </Link>
          </header>

          {/* Lower-Left Quotes & Dialogues Slideshow */}
          <div
            className="hidden lg:block space-y-5 max-w-xl pb-4 xl:pb-8"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Sliding Track Viewport */}
            <div className="overflow-hidden w-full min-h-[175px] flex items-end">
              <div
                className="flex w-full transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
                style={{ transform: `translateX(-${activeSlide * 100}%)` }}
              >
                {slides.map((slide, index) => (
                  <div
                    key={index}
                    className={`w-full flex-shrink-0 space-y-3 transition-opacity duration-700 ${
                      index === activeSlide ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                  >
                    <h1 className="text-3xl sm:text-4xl xl:text-5xl font-medium text-white tracking-tight leading-[1.15]">
                      {slide.title}
                    </h1>
                    <p className="text-sm xl:text-base text-[#9396a8] font-normal leading-relaxed max-w-lg">
                      {slide.subtitle}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Slide / Carousel Indicator Pills */}
            <div className="flex items-center gap-2 pt-2">
              {slides.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setActiveSlide(index)}
                  aria-label={`Go to slide ${index + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-500 cursor-pointer ${
                    index === activeSlide
                      ? "w-8 bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8)]"
                      : "w-2 bg-white/20 hover:bg-white/40 hover:w-3"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Floating Card with Crisp Outlines */}
        <div
          className={`w-full ${cardWidthClass} h-full bg-white dark:bg-[#15161e] rounded-2xl shadow-[0_25px_80px_-15px_rgba(0,0,0,0.9)] border border-gray-200 dark:border-[#222433] z-20 shrink-0 overflow-hidden text-gray-900 dark:text-gray-100 my-auto lg:my-0 flex flex-col`}
        >
          {/* Scrollable Inner Container with Clean Inset Scrollbar */}
          <div className="w-full h-full overflow-y-auto p-6 sm:p-8 xl:p-11 flex flex-col justify-between custom-scrollbar">
            {/* Card Top & Body Container */}
            <div className="w-full flex-1 flex flex-col justify-center py-2">
              {/* Header inside floating card with top logo badge */}
              <div className="flex flex-col items-center text-center mb-6 xl:mb-7">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-blue-500/10 dark:bg-white/[0.04] border border-blue-500/20 dark:border-white/10 flex items-center justify-center mb-3.5 shadow-[0_0_25px_rgba(59,130,246,0.15)]">
                  <img
                    src={logoImg}
                    alt="CoreResearch"
                    className="w-7 h-7 sm:w-8 sm:h-8 object-contain drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]"
                  />
                </div>
                {title && (
                  <h2 className="text-2xl sm:text-3xl font-medium text-gray-900 dark:text-white tracking-tight">
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-[#9396a8] mt-1.5 leading-relaxed">
                    {subtitle}
                  </p>
                )}
              </div>

              {/* Form Content */}
              {children}
            </div>

            {/* Card Bottom Footer */}
            <div className="pt-4 text-center text-[11px] text-gray-400 dark:text-[#6b6f84] shrink-0">
              © 2026 CoreResearch
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
