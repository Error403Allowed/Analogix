import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

interface UseTextToSpeechOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voiceName?: string;
}

interface UseTextToSpeechReturn {
  isSpeaking: boolean;
  isPaused: boolean;
  supported: boolean;
  voices: SpeechSynthesisVoice[];
  speak: (text: string, options?: UseTextToSpeechOptions) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

/**
 * Hook for browser speech synthesis (text-to-speech)
 * Uses the Web Speech API - works in most modern browsers
 */
export function useTextToSpeech(): UseTextToSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setSupported(true);

      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
      };

      loadVoices();

      // Chrome loads voices asynchronously
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  const speak = useCallback((text: string, options?: UseTextToSpeechOptions) => {
    if (!supported) {
      toast.error("Text-to-speech is not supported in your browser");
      return;
    }

    // Stop any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    if (options) {
      if (options.rate) utterance.rate = Math.max(0.5, Math.min(2.0, options.rate));
      if (options.pitch) utterance.pitch = Math.max(0.5, Math.min(2.0, options.pitch));
      if (options.volume) utterance.volume = Math.max(0, Math.min(1, options.volume));
      
      if (options.voiceName) {
        const voice = voices.find(v => v.name === options.voiceName);
        if (voice) utterance.voice = voice;
      }
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = (event) => {
      // Silently handle errors - speech synthesis can fail for many benign reasons
      // (user cancelled, browser doesn't support, etc.)
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [supported, voices]);

  const pause = useCallback(() => {
    if (supported && isSpeaking && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [supported, isSpeaking, isPaused]);

  const resume = useCallback(() => {
    if (supported && isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, [supported, isPaused]);

  const stop = useCallback(() => {
    if (supported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  }, [supported]);

  return {
    isSpeaking,
    isPaused,
    supported,
    voices,
    speak,
    pause,
    resume,
    stop,
  };
}
