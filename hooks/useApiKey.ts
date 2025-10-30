
import { useState, useCallback, useEffect } from 'react';

declare global {
  // Fix: Define the AIStudio interface globally to align with other declarations
  // and resolve the type conflict for window.aistudio.
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio: AIStudio;
  }
}

export const useApiKey = () => {
  const [isKeySelected, setIsKeySelected] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const checkApiKey = useCallback(async () => {
    if (window.aistudio) {
      try {
        setIsChecking(true);
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsKeySelected(hasKey);
      } catch (error) {
        console.error('Error checking API key:', error);
        setIsKeySelected(false);
      } finally {
        setIsChecking(false);
      }
    } else {
        setIsChecking(false);
        // aistudio might not be available in all environments.
        // Assume key is available via process.env.API_KEY
        setIsKeySelected(true); 
    }
  }, []);

  useEffect(() => {
    checkApiKey();
  }, [checkApiKey]);

  const selectApiKey = useCallback(async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        // Assume selection is successful and update state optimistically.
        setIsKeySelected(true);
      } catch (error) {
        console.error('Error opening API key selection:', error);
        setIsKeySelected(false);
      }
    } else {
        alert("API Key selection is not available in this environment.");
    }
  }, []);

  return { isKeySelected, isChecking, selectApiKey, recheckApiKey: checkApiKey };
};
