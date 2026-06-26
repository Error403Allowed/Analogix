import { useCallback, useRef, useState } from "react";
import * as Speech from "expo-speech";

interface TTSState {
  isSpeaking: boolean;
  isPaused: boolean;
  rate: number;
  pitch: number;
}

export function useTextToSpeech() {
  const [state, setState] = useState<TTSState>({
    isSpeaking: false,
    isPaused: false,
    rate: 1.0,
    pitch: 1.0,
  });
  const utteranceIdRef = useRef<string | null>(null);

  const speak = useCallback((text: string, options?: { rate?: number; pitch?: number }) => {
    if (state.isSpeaking) {
      Speech.stop();
    }
    const rate = options?.rate ?? state.rate;
    const pitch = options?.pitch ?? state.pitch;

    Speech.speak(text, {
      rate,
      pitch,
      onStart: () => {
        setState(prev => ({ ...prev, isSpeaking: true, isPaused: false }));
      },
      onDone: () => {
        setState(prev => ({ ...prev, isSpeaking: false, isPaused: false }));
        utteranceIdRef.current = null;
      },
      onStopped: () => {
        setState(prev => ({ ...prev, isSpeaking: false, isPaused: false }));
        utteranceIdRef.current = null;
      },
      onError: () => {
        setState(prev => ({ ...prev, isSpeaking: false, isPaused: false }));
        utteranceIdRef.current = null;
      },
    });
  }, [state.isSpeaking, state.rate, state.pitch]);

  const pause = useCallback(() => {
    Speech.pause();
    setState(prev => ({ ...prev, isPaused: true }));
  }, []);

  const resume = useCallback(() => {
    Speech.resume();
    setState(prev => ({ ...prev, isPaused: false }));
  }, []);

  const stop = useCallback(() => {
    Speech.stop();
    setState(prev => ({ ...prev, isSpeaking: false, isPaused: false }));
    utteranceIdRef.current = null;
  }, []);

  const setRate = useCallback((rate: number) => {
    setState(prev => ({ ...prev, rate }));
  }, []);

  const setPitch = useCallback((pitch: number) => {
    setState(prev => ({ ...prev, pitch }));
  }, []);

  return {
    ...state,
    speak,
    pause,
    resume,
    stop,
    setRate,
    setPitch,
  };
}
