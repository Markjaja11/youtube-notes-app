import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Custom hook for auto-saving content with debouncing
 * @param {string} value - The value to save
 * @param {Function} onSave - Function to call when saving (should return a Promise)
 * @param {Object} options - Configuration options
 * @param {number} options.delay - Debounce delay in milliseconds (default: 2000)
 * @param {boolean} options.enabled - Whether auto-save is enabled (default: true)
 */
export function useAutoSave(value, onSave, options = {}) {
  const { delay = 2000, enabled = true } = options;

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const timeoutRef = useRef(null);
  const previousValueRef = useRef(value);
  const isMountedRef = useRef(true);

  // Save function that can be called manually
  const save = useCallback(async () => {
    if (!enabled || isSaving) return;

    setIsSaving(true);
    setHasUnsavedChanges(false);

    try {
      await onSave(value);
      if (isMountedRef.current) {
        setLastSaved(new Date());
        previousValueRef.current = value;
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
      if (isMountedRef.current) {
        setHasUnsavedChanges(true);
      }
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [value, onSave, enabled, isSaving]);

  // Auto-save effect with debouncing
  useEffect(() => {
    if (!enabled) return;

    // Check if value has actually changed
    if (value === previousValueRef.current) {
      return;
    }

    setHasUnsavedChanges(true);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for auto-save
    timeoutRef.current = setTimeout(() => {
      save();
    }, delay);

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay, enabled, save]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    saveNow: save, // Manual save function
  };
}
