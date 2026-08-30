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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className={`relative w-full ${maxWidth} bg-white dark:bg-[#15161e] rounded-xl border border-gray-200 dark:border-[#222433] shadow-modal animate-slide-up max-h-[90vh] overflow-y-auto ${className}`}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#222433]">
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
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};
