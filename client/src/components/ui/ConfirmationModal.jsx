import React from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { HiExclamationTriangle, HiInformationCircle, HiQuestionMarkCircle, HiCheckCircle } from "react-icons/hi2";

export const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger", // 'danger', 'warning', 'info', 'success', 'primary'
}) => {
  const getIcon = () => {
    switch (variant) {
      case "danger":
      case "warning":
        return HiExclamationTriangle;
      case "success":
        return HiCheckCircle;
      case "info":
        return HiInformationCircle;
      default:
        return HiQuestionMarkCircle;
    }
  };

  const getIconColors = () => {
    switch (variant) {
      case "danger":
        return "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/20";
      case "warning":
        return "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/20";
      case "success":
        return "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/20";
      case "primary":
      case "info":
        return "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/20";
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800";
    }
  };

  const getButtonVariant = () => {
    switch (variant) {
      case "danger":
        return "danger"; 
      case "primary":
      case "info":
      case "success":
      case "warning":
        return "primary";
      default:
        return "primary";
    }
  };

  const Icon = getIcon();

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="flex flex-col items-center text-center p-2">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${getIconColors()}`}>
          <Icon className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 whitespace-pre-line">
          {title}
        </h3>
        <p className="text-sm text-gray-500 dark:text-[#9396a8] mb-6 whitespace-pre-line">
          {message}
        </p>
        <div className="flex items-center justify-center gap-3 w-full">
          <Button variant="outline" onClick={onClose} className="w-full">
            {cancelText}
          </Button>
          <Button 
            variant={getButtonVariant()} 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`w-full ${variant === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white border-transparent' : ''}`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
