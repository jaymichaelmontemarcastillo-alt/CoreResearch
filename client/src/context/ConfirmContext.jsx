import React, { createContext, useContext, useState, useCallback } from 'react';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';

const ConfirmContext = createContext();

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

export const ConfirmProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'danger',
  });
  
  const [resolveFn, setResolveFn] = useState(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        title: options.title || 'Confirm Action',
        message: options.message || 'Are you sure you want to proceed?',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        variant: options.variant || 'danger',
      });
      setResolveFn(() => resolve);
    });
  }, []);

  const handleConfirm = () => {
    if (resolveFn) resolveFn(true);
    closeModal();
  };

  const handleCancel = () => {
    if (resolveFn) resolveFn(false);
    closeModal();
  };

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    setResolveFn(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmationModal
        isOpen={modalState.isOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title={modalState.title}
        message={modalState.message}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        variant={modalState.variant}
      />
    </ConfirmContext.Provider>
  );
};
