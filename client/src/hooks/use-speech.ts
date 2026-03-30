import { useState, useCallback, useEffect, useRef } from "react";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function useSpeech(onResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const femaleVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadFemaleVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;

      const viVoices = voices.filter(v => v.lang.startsWith("vi"));
      const femaleKeywords = ["female", "woman", "girl", "nữ", "huong", "lan", "linh", "mai", "thu", "yen", "hoa", "ngoc", "phuong", "thanh", "tuyen", "an", "microsoft"];

      let selected: SpeechSynthesisVoice | null = null;

      for (const kw of femaleKeywords) {
        const match = viVoices.find(v => v.name.toLowerCase().includes(kw));
        if (match) { selected = match; break; }
      }

      if (!selected && viVoices.length > 0) {
        selected = viVoices[0];
      }

      if (!selected) {
        const enFemale = voices.find(v =>
          (v.lang.startsWith("en")) &&
          femaleKeywords.some(kw => v.name.toLowerCase().includes(kw))
        );
        selected = enFemale || null;
      }

      femaleVoiceRef.current = selected;
    };

    loadFemaleVoice();
    window.speechSynthesis.onvoiceschanged = loadFemaleVoice;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "vi-VN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      onResult(text);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, [onResult]);

  const listen = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Could not start speech recognition", e);
      }
    }
  }, [isListening]);

  const stop = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "vi-VN";

    if (femaleVoiceRef.current) {
      utterance.voice = femaleVoiceRef.current;
    }

    utterance.rate = 1.1;
    utterance.pitch = 1.4;
    utterance.volume = 1.0;

    window.speechSynthesis.speak(utterance);
  }, []);

  return { isListening, listen, stop, speak, supported };
}
