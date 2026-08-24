// src/components/ui/Toast.jsx
import React, { useEffect, useState } from "react";
import {
  HiCheckCircle,
  HiExclamationTriangle,
  HiXCircle,
  HiInformationCircle,
  HiXMark,
} from "react-icons/hi2";

const icons = {
  success: HiCheckCircle,
  warning: HiExclamationTriangle,
  error: HiXCircle,
  info: HiInformationCircle,
};

const styles = {
  success: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400",
  warning: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400",
  error: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400",
  info: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400",
};

export const Toast = ({
  message,
  variant = "success",
  onClose,
  duration = 3500,
  className = "",
}) => {
  const [visible, setVisible] = useState(true);
  const Icon = icons[variant] || icons.info;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => onClose?.(), 200);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!message) return null;

  return (
    <div
      className={`flex items-center gap-2 p-3.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      } ${styles[variant]} ${className}`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1">{message}</span>
      {onClose && (
        <button
          onClick={() => {
            setVisible(false);
            setTimeout(() => onClose(), 200);
          }}
          className="p-0.5 rounded hover:opacity-70 transition"
        >
          <HiXMark className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
