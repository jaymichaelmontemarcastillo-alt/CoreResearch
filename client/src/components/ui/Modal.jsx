// src/components/ui/Modal.jsx
import React, { useEffect } from "react";
import { HiXMark } from "react-icons/hi2";

export const Modal = ({
  isOpen,
  onClose,
  title,
  icon: Icon,
  children,
  maxWidth = "max-w-lg",
  className = "",
  fullScreen = false,
  noHeaderBorder = false,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center ${fullScreen ? '' : 'p-4'}`}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className={`relative w-full bg-white dark:bg-[#15161e] border border-gray-200 dark:border-[#222433] shadow-modal animate-slide-up overflow-y-auto ${className} ${
          fullScreen 
            ? 'h-full max-w-full rounded-none border-0' 
            : `${maxWidth} max-h-[90vh] rounded-xl`
        }`}
      >
        {/* Header */}
        {title && (
          <div className={`flex items-center justify-between px-6 py-4 ${noHeaderBorder ? '' : 'border-b border-gray-200 dark:border-[#222433]'}`}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              {Icon && <Icon className="w-5 h-5 text-primary" />}
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1c1d28] text-gray-400 dark:text-[#9396a8] hover:text-gray-600 dark:hover:text-white transition"
            >
              <HiXMark className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className={`p-6 ${fullScreen ? 'max-w-4xl mx-auto' : ''}`}>{children}</div>
      </div>
    </div>
  );
};
