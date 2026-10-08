// src/components/ui/Avatar.jsx
import React, { useState, useEffect } from "react";

const sizeVariants = {
  xs: "w-6 h-6 min-w-[24px] min-h-[24px] text-[10px]",
  sm: "w-8 h-8 min-w-[32px] min-h-[32px] text-xs",
  md: "w-10 h-10 min-w-[40px] min-h-[40px] text-sm",
  lg: "w-12 h-12 min-w-[48px] min-h-[48px] text-base",
  xl: "w-16 h-16 min-w-[64px] min-h-[64px] text-xl",
};

const colorVariants = {
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  purple: "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
  gray: "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400",
};

export const Avatar = ({
  name,
  src,
  size = "md",
  color = "blue",
  className = "",
  ...props
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const initials = name
    ? name
        .trim()
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  if (src && !imgError && typeof src === "string" && src.trim() !== "") {
    return (
      <img
        src={src}
        alt={name || "Avatar"}
        onError={() => setImgError(true)}
        className={`rounded-full shrink-0 aspect-square object-cover ${sizeVariants[size]} ${className}`}
        {...props}
      />
    );
  }

  return (
    <div
      className={`rounded-full shrink-0 aspect-square flex items-center justify-center font-semibold select-none overflow-hidden ${sizeVariants[size]} ${colorVariants[color]} ${className}`}
      {...props}
    >
      <span className="leading-none text-center">{initials}</span>
    </div>
  );
};

