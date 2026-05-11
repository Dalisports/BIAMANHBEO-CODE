import { useState, useCallback, useRef, useEffect } from "react";

export type NotificationEvent = {
  type: "order" | "kitchen" | "payment" | "message";
  title: string;
  body?: string;
  items?: string[];  // List of item names
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

interface UseBatchNotificationOptions {
  debounceMs?: number;
  maxEvents?: number;
}

const NOTIFICATIONS_STORAGE_KEY = "batch_notifications";

function loadFromStorage(): BatchNotification[] {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((n: any) => ({
        ...n,
        createdAt: new Date(n.createdAt),
        events: n.events.map((e: any) => ({
          ...e,
          timestamp: new Date(e.timestamp),
        })),
      }));
    }
  } catch (err) {
    console.warn("Failed to load notifications from storage:", err);
  }
  return [];
}

function saveToStorage(notifications: BatchNotification[]) {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
  } catch (err) {
    console.warn("Failed to save notifications to storage:", err);
  }
}

export function useBatchNotification(options: UseBatchNotificationOptions = {}) {
  const { debounceMs = 5000, maxEvents = 10 } = options;

  const [notifications, setNotifications] = useState<BatchNotification[]>(() => loadFromStorage());
  const [currentBatch, setCurrentBatch] = useState<NotificationEvent[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [currentDisplay, setCurrentDisplay] = useState<BatchNotification | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const batchStartRef = useRef<Date | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Persist notifications to localStorage whenever they change
  useEffect(() => {
    saveToStorage(notifications);
  }, [notifications]);

  // Play Ting Ting notification sound
  const playBatchSound = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioContext = audioContextRef.current;

      const playTing = (freq: number, startTime: number) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();

        osc.connect(gain);
        gain.connect(audioContext.destination);

        osc.frequency.value = freq;
        osc.type = "sine";

        gain.gain.setValueAtTime(0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

        osc.start(startTime);
        osc.stop(startTime + 0.15);
      };

      // Ting Ting - 2 short high-pitched sounds
      const now = audioContext.currentTime;
      playTing(1200, now);
      playTing(1500, now + 0.18);
    } catch (err) {
      console.warn("Failed to play batch notification sound:", err);
    }
  }, []);

  // Flush current batch and show notification
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

    // Add to history (store last 50)
    setNotifications(prev => [batch, ...prev].slice(0, 50));

    // Reset batch
    setCurrentBatch([]);
    batchStartRef.current = null;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [currentBatch, playBatchSound]);

  // Add event to batch
  const addEvent = useCallback((event: Omit<NotificationEvent, "timestamp">) => {
    const newEvent: NotificationEvent = {
      ...event,
      timestamp: new Date(),
    };

    setCurrentBatch(prev => {
      // Prevent duplicate events (same orderId and type within 3 seconds)
      const isDuplicate = prev.some(e =>
        e.orderId === newEvent.orderId &&
        e.type === newEvent.type &&
        (new Date().getTime() - e.timestamp.getTime()) < 3000
      );
      if (isDuplicate) return prev;
      return prev.slice(-(maxEvents - 1)).concat(newEvent);
    });

    // Start or reset timer
    if (!batchStartRef.current) {
      batchStartRef.current = new Date();
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set timeout to flush
    timeoutRef.current = setTimeout(() => {
      flushBatch();
    }, debounceMs);
  }, [debounceMs, maxEvents, flushBatch]);

  // Dismiss current notification
  const dismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => setCurrentDisplay(null), 300);
  }, []);

  // Manual show all events
  const showAll = useCallback(() => {
    if (currentBatch.length > 0) {
      flushBatch();
    }
  }, [currentBatch, flushBatch]);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    setCurrentDisplay(null);
    setIsVisible(false);
    localStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
  }, []);

  // Mark all notifications as displayed (when user opens dropdown)
  const markAllAsDisplayed = useCallback(() => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, displayed: true }))
    );
  }, []);

  // Auto-dismiss after 10 seconds
  useEffect(() => {
    if (isVisible && currentDisplay) {
      const autoDismiss = setTimeout(() => {
        dismiss();
      }, 10000);
      return () => clearTimeout(autoDismiss);
    }
  }, [isVisible, currentDisplay, dismiss]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Get formatted summary for display
  const getSummary = useCallback((batch: BatchNotification) => {
    const events = batch.events;
    const count = events.length;
    const types = events.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Collect ALL items from ALL events
    const allItems: string[] = [];
    const allTableNumbers: string[] = [];
    events.forEach(e => {
      if (e.items) {
        allItems.push(...e.items);
      }
      if (e.tableNumber && !allTableNumbers.includes(e.tableNumber)) {
        allTableNumbers.push(e.tableNumber);
      }
    });

    // Format: ICON - TIÊU ĐỀ - BÀN - NỘI DUNG - USER - TIME
    const primaryEvent = events[0];
    const tableStr = allTableNumbers.length > 0 ? `Bàn ${allTableNumbers.join(", ")}` : "";
    const itemCount = allItems.length;
    const itemPreview = allItems.slice(0, 3).join(", ") || "Món mới";
    const more = itemCount > 3 ? ` +${itemCount - 3}` : "";
    const content = `${itemPreview}${more}`;

    let title = primaryEvent.title || "Thông báo";
    if (count > 1) {
      title = `${title} x${count}`;
    }

    const time = format(primaryEvent.timestamp, "HH:mm");
    const username = primaryEvent.username || "Staff";

    // Single line format: "ORDER MỚI - Bàn 5 - 4 bia, 1 mặt lợn - Nam 14:30"
    const compactTitle = `${title} ${tableStr ? `- ${tableStr}` : ""} - ${content} - ${username} ${time}`;

    return {
      title: compactTitle,
      shortTitle: title,
      tableStr,
      content,
      time,
      username,
      count,
      types,
      primaryEvent,
      allItems,
      allTableNumbers,
      hasKitchen: types.kitchen > 0,
      hasOrder: types.order > 0,
      hasPayment: types.payment > 0,
    };
  }, []);

  return {
    // State
    notifications,
    currentDisplay,
    currentBatchSize: currentBatch.length,
    isVisible,
    summary: currentDisplay ? getSummary(currentDisplay) : null,

    // Actions
    addEvent,
    dismiss,
    showAll,
    clearAll,
    markAllAsDisplayed,
  };
}

// Helper to format time
function format(date: Date, formatStr: string): string {
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}