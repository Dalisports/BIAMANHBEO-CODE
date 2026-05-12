import { useState, useEffect } from "react";
import { useMenuItems } from "./use-menu";
import { useOrders } from "./use-orders";
import { subDays, isAfter } from "date-fns";
import { getAuthHeaders } from "./use-auth";

const SHORTCUT_CACHE_KEY = 'daily_shortcuts_cache';
interface ShortcutCache {
  date: string;
  lastUpdateHour: number;
  topItemIds: number[];
}

function getShortcutCache(): ShortcutCache | null {
  try {
    const cached = localStorage.getItem(SHORTCUT_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch { return null; }
}

function setShortcutCache(topItemIds: number[]) {
  const now = new Date();
  localStorage.setItem(SHORTCUT_CACHE_KEY, JSON.stringify({
    date: now.toISOString().split('T')[0],
    lastUpdateHour: now.getHours(),
    topItemIds
  }));
}

interface ShortcutCache {
  date: string;
  lastUpdateHour: number;
  topItemIds: number[];
}

export function useShortcuts() {
  const [shortcuts, setShortcuts] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { data: menuItems } = useMenuItems();
  const { data: orders } = useOrders();
  const [cachedTopItemIds, setCachedTopItemIds] = useState<number[]>(() => {
    const cached = getShortcutCache();
    return cached ? cached.topItemIds : [];
  });

  useEffect(() => {
    fetch("/api/shortcuts", { credentials: "include", headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const map: Record<number, number> = {};
          data.forEach((s: any) => {
            if (s.menu_item_id) map[s.position] = s.menu_item_id;
          });
          setShortcuts(map);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const checkAndUpdateCache = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const today = now.toISOString().split('T')[0];
      const cached = getShortcutCache();

      if (currentHour >= 23 && (!cached || cached.date !== today)) {
        const sortedMenuItems = getSortedByPopularity(menuItems as any[] | undefined, orders as any[] | undefined);
        const newTopIds = (sortedMenuItems || []).slice(0, 7).map(item => item.id);
        setCachedTopItemIds(newTopIds);
        setShortcutCache(newTopIds);
      } else if (cached) {
        setCachedTopItemIds(cached.topItemIds);
      }
    };

    checkAndUpdateCache();
    const interval = setInterval(checkAndUpdateCache, 3600000);
    return () => clearInterval(interval);
  }, [menuItems, orders]);

  const updateShortcut = async (position: number, menuItemId: number | null) => {
    try {
      await fetch("/api/shortcuts", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ position, menuItemId }),
        credentials: "include",
      });
      setShortcuts(prev => ({ ...prev, [position]: menuItemId || 0 }));
    } catch (err) {
      console.error("Failed to update shortcut:", err);
    }
  };

  const getShortcutItem = (pos: number, menuItems: any[] | undefined) => {
    if (pos >= 1 && pos <= 3) {
      return shortcuts[pos] ? menuItems?.find(m => m.id === shortcuts[pos]) || null : null;
    }
    if (pos >= 4 && pos <= 10) {
      const idx = pos - 4;
      const itemId = cachedTopItemIds[idx];
      return itemId ? menuItems?.find(m => m.id === itemId) || null : null;
    }
    return null;
  };

  return { shortcuts, updateShortcut, isLoading, cachedTopItemIds, getShortcutItem, menuItems };
}

function getSortedByPopularity(menuItems: any[] | undefined, orders: any[] | undefined) {
  const popularity: Record<number, number> = {};
  const fourteenDaysAgo = subDays(new Date(), 14);
  
  (orders || []).forEach(order => {
    const orderDate = order.createdAt ? new Date(order.createdAt) : null;
    if (orderDate && isAfter(orderDate, fourteenDaysAgo)) {
      (order.items as any[]).forEach((item: any) => {
        if (item.menuItemId) {
          popularity[item.menuItemId] = (popularity[item.menuItemId] || 0) + item.quantity;
        }
      });
    }
  });
  
  return [...(menuItems || [])].sort((a, b) => {
    const aSold = popularity[a.id] || 0;
    const bSold = popularity[b.id] || 0;
    return bSold - aSold;
  });
}
