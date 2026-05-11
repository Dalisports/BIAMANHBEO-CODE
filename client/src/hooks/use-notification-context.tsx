import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from "react";

export type NotificationEvent = {
  type: "order" | "kitchen" | "payment" | "message";
  title: string;
  body?: string;
  items?: string[];
  tableNumber?: string;
  orderId?: number;
  username?: string;
  timestamp: Date;
};

export type BatchNotification = {
  id: string;
  events: NotificationEvent[];
  createdAt: Date;
  displayed: boolean;
};

interface NotificationContextType {
  notifications: BatchNotification[];
  currentDisplay: BatchNotification | null;
  currentBatchSize: number;
  isVisible: boolean;
  summary: {
    title: string;
    time: string;
    username: string;
    count: number;
    types: Record<string, number>;
    hasKitchen: boolean;
    hasOrder: boolean;
    hasPayment: boolean;
    primaryEvent: NotificationEvent;
  } | null;
  addEvent: (event: Omit<NotificationEvent, "timestamp">) => void;
  dismiss: () => void;
  showAll: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<BatchNotification[]>([]);
  const [currentBatch, setCurrentBatch] = useState<NotificationEvent[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [currentDisplay, setCurrentDisplay] = useState<BatchNotification | null>(null);

  const debounceMs = 5000;
  const maxEvents = 10;

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Play kitchen bell notification sound
  const playBatchSound = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioContext = audioContextRef.current;

      const playTone = (freq: number, startOffset: number, duration: number, freqEnd?: number) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.setValueAtTime(freq, audioContext.currentTime + startOffset);
        if (freqEnd) {
          osc.frequency.exponentialRampToValueAtTime(freqEnd, audioContext.currentTime + startOffset + duration);
        }
        gain.gain.setValueAtTime(0.5, audioContext.currentTime + startOffset);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + startOffset + duration);
        osc.start(audioContext.currentTime + startOffset);
        osc.stop(audioContext.currentTime + startOffset + duration);
      };

      playTone(880, 0, 0.3, 440);
      setTimeout(() => playTone(1100, 0, 0.3, 550), 150);
      setTimeout(() => playTone(1320, 0, 0.4, 660), 300);
    } catch (err) {
      console.warn("Failed to play notification sound:", err);
    }
  }, []);

  const flushBatch = useCallback(() => {
    if (currentBatch.length === 0) return;

    const batch: BatchNotification = {
      id: `batch-${Date.now()}`,
      events: [...currentBatch],
      createdAt: new Date(),
      displayed: false,
    };

    setCurrentDisplay(batch);
    setIsVisible(true);
    playBatchSound();

    setNotifications(prev => [batch, ...prev].slice(0, 50));

    setCurrentBatch([]);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [currentBatch, playBatchSound]);

  const addEvent = useCallback((event: Omit<NotificationEvent, "timestamp">) => {
    const newEvent: NotificationEvent = {
      ...event,
      timestamp: new Date(),
    };

    setCurrentBatch(prev => {
      const isDuplicate = prev.some(e =>
        e.orderId === newEvent.orderId &&
        e.type === newEvent.type &&
        (new Date().getTime() - e.timestamp.getTime()) < 3000
      );
      if (isDuplicate) return prev;
      return prev.slice(-(maxEvents - 1)).concat(newEvent);
    });

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      flushBatch();
    }, debounceMs);
  }, [debounceMs, flushBatch]);

  const dismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => setCurrentDisplay(null), 300);
  }, []);

  const showAll = useCallback(() => {
    if (currentBatch.length > 0) {
      flushBatch();
    }
  }, [currentBatch, flushBatch]);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setCurrentDisplay(null);
    setIsVisible(false);
  }, []);

  useEffect(() => {
    if (isVisible && currentDisplay) {
      const autoDismiss = setTimeout(() => {
        dismiss();
      }, 10000);
      return () => clearTimeout(autoDismiss);
    }
  }, [isVisible, currentDisplay, dismiss]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getSummary = useCallback((batch: BatchNotification) => {
    const events = batch.events;
    const count = events.length;
    const types = events.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const primaryEvent = events[0];

    let title = "";
    if (primaryEvent.type === "order") {
      const items = primaryEvent.items?.slice(0, 4).join(", ") || "Món mới";
      const more = (primaryEvent.items?.length || 0) > 4 ? ` +${(primaryEvent.items?.length || 0) - 4} món` : "";
      const table = primaryEvent.tableNumber || "?";
      title = `ORDER MỚI: Bàn ${table} - ${items}${more}`;
    } else if (primaryEvent.type === "kitchen") {
      const items = primaryEvent.items?.slice(0, 4).join(", ") || "Món mới";
      const more = (primaryEvent.items?.length || 0) > 4 ? ` +${(primaryEvent.items?.length || 0) - 4} món` : "";
      title = `RA MÓN: ${items}${more}`;
    } else {
      title = primaryEvent.title || "Thông báo";
    }

    const d = new Date(primaryEvent.timestamp);
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

    return {
      title,
      time,
      username: primaryEvent.username || "Staff",
      count,
      types,
      primaryEvent,
      hasKitchen: types.kitchen > 0,
      hasOrder: types.order > 0,
      hasPayment: types.payment > 0,
    };
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        currentDisplay,
        currentBatchSize: currentBatch.length,
        isVisible,
        summary: currentDisplay ? getSummary(currentDisplay) : null,
        addEvent,
        dismiss,
        showAll,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
}

// Legacy hook for backward compatibility
export function useBatchNotification(options = {}) {
  const context = useNotification();
  return context;
}