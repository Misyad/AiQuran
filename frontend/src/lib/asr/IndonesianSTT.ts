'use client';

import { useState, useRef, useCallback } from 'react';

interface IndonesianSTTProps {
  onResult: (text: string) => void;
  onInterim?: (text: string) => void;
}

export default function IndonesianSTT({ onResult, onInterim }: IndonesianSTTProps) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalRef = useRef('');

  const start = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'id';
    recognitionRef.current = recognition;
    finalRef.current = '';
    setListening(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalRef.current += event.results[i][0].transcript;
        } else {
          interim = event.results[i][0].transcript;
        }
      }
      onInterim?.(finalRef.current + interim);
    };

    recognition.onend = () => {
      setListening(false);
      onResult(finalRef.current.trim());
    };

    recognition.onerror = () => { setListening(false); };
    recognition.start();
  }, [onResult, onInterim]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  return { listening, start, stop };
}
