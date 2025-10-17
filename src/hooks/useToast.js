import { useState, useCallback } from 'react';

let toastIdCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ variant = 'default', title, description, duration = 5000 }) => {
    const id = toastIdCounter++;
    const toast = { id, variant, title, description };

    setToasts((prevToasts) => [...prevToasts, toast]);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback({
    success: (title, description) => addToast({ variant: 'success', title, description }),
    error: (title, description) => addToast({ variant: 'error', title, description }),
    info: (title, description) => addToast({ variant: 'info', title, description }),
    default: (title, description) => addToast({ variant: 'default', title, description }),
  }, [addToast]);

  return {
    toasts,
    toast,
    addToast,
    removeToast,
  };
}
