import { useState, useEffect, useCallback } from "react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  action?: {
    type: "CONFIRM" | "EXECUTE" | "REPLY" | "ERROR" | "SUCCESS";
    apiPath?: string;
    apiMethod?: string;
    apiBody?: any;
    confirmText?: string;
    message?: string;
  };
}

const STORAGE_KEY = "soi_agent_history";
export const MAX_AGENT_MESSAGES = 10;

export function useAgentHistory(sessionId = "default") {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${sessionId}`);
      if (stored) {
        const parsed = JSON.parse(stored) as ChatMessage[];
        setMessages(parsed);
      }
    } catch {
      setMessages([]);
    }
  }, [sessionId]);

  const addMessage = useCallback((msg: Omit<ChatMessage, "timestamp">) => {
    setMessages((prev) => {
      const updated = [...prev, { ...msg, timestamp: Date.now() }];
      // Keep only last 10 messages
      const trimmed = updated.slice(-MAX_AGENT_MESSAGES);
      try {
        localStorage.setItem(`${STORAGE_KEY}_${sessionId}`, JSON.stringify(trimmed));
      } catch {
        // localStorage full - try to clear old data
        try {
          localStorage.removeItem(`${STORAGE_KEY}_${sessionId}`);
          localStorage.setItem(`${STORAGE_KEY}_${sessionId}`, JSON.stringify(trimmed));
        } catch {
          // Give up
        }
      }
      return trimmed;
    });
  }, [sessionId]);

  const updateMessage = useCallback((index: number, updatedFields: Partial<ChatMessage>) => {
    setMessages((prev) => {
      const next = prev.map((m, i) => (i === index ? { ...m, ...updatedFields } : m));
      try {
        localStorage.setItem(`${STORAGE_KEY}_${sessionId}`, JSON.stringify(next));
      } catch {
        // Ignore write failures
      }
      return next;
    });
  }, [sessionId]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(`${STORAGE_KEY}_${sessionId}`);
  }, [sessionId]);

  return { messages, addMessage, updateMessage, clearHistory };
}