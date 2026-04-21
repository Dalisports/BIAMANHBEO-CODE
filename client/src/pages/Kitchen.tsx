import { useEffect, useRef, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useKitchenOrders,
  useStartKitchenItem,
  useCompleteKitchenItem,
  type KitchenItem,
} from "@/hooks/use-orders";
import { useMenuItems } from "@/hooks/use-menu";
import { cn } from "@/lib/utils";
import { buildCookingQueue, type CookingQueueItem } from "@/lib/cookingQueue";
import {
  CheckCircle2,
  Flame,
  Loader2,
  UtensilsCrossed,
  ChevronUp,
  ChevronDown,
  Zap,
} from "lucide-react";

interface FlattenedItem {
  kitchenOrderId: number;
  orderId: number;
  tableNumber: string;
  item: KitchenItem;
  sentAt: Date | null;
  orderStatus: string;
}

function flattenKitchenOrders(
  orders: ReturnType<typeof useKitchenOrders>["data"],
): FlattenedItem[] {
  const items: FlattenedItem[] = [];
  if (!orders) return items;

  for (const order of orders) {
    for (const item of order.items) {
      items.push({
        kitchenOrderId: order.id,
        orderId: order.orderId,
        tableNumber: order.tableNumber,
        item,
        sentAt: order.sentAt ? new Date(order.sentAt) : null,
        orderStatus: order.status,
      });
    }
  }

  return items.sort((a, b) => {
    if (!a.sentAt) return 1;
    if (!b.sentAt) return -1;
    return a.sentAt.getTime() - b.sentAt.getTime();
  });
}

function toCookingQueueItem(fi: FlattenedItem): CookingQueueItem {
  return {
    key: `${fi.orderId}-${fi.kitchenOrderId}-${fi.item.name}`,
    kitchenOrderId: fi.kitchenOrderId,
    orderId: fi.orderId,
    tableNumber: fi.tableNumber,
    name: fi.item.name,
    quantity: fi.item.quantity,
    notes: fi.item.notes,
    sentAt: fi.sentAt,
    cookingStatus: fi.item.cookingStatus ?? "pending",
  };
}

function formatElapsed(sentAt: Date | null): string {
  if (!sentAt) return "";
  const minutes = Math.floor((Date.now() - sentAt.getTime()) / 60000);
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}p`;
}

async function saveKitchenOrder(order: string[] | null) {
  try {
    const res = await fetch("/api/kitchen/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ order }),
    });
    if (!res.ok) console.warn("[kitchen/order] save failed:", res.status);
  } catch (err) {
    console.warn("[kitchen/order] save error:", err);
  }
}

export default function Kitchen() {
  const { data: kitchenOrders, isLoading } = useKitchenOrders();
  const { data: menuItems } = useMenuItems();
  const startItem = useStartKitchenItem();
  const completeItem = useCompleteKitchenItem();
  const audioRef = useRef<HTMLAudioElement>(null);

  // Manual reorder state — persisted to server
  const [manualOrder, setManualOrder] = useState<string[] | null>(null);
  const manualOrderRef = useRef<string[] | null>(null);

  const applyManualOrder = (order: string[] | null) => {
    manualOrderRef.current = order;
    setManualOrder(order);
  };

  // Tick mỗi 30s để cập nhật "Đã gọi X phút"
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  // Fetch saved order on mount, then poll every 15s for multi-device sync
  useEffect(() => {
    const load = () => {
      fetch("/api/kitchen/order", { credentials: "include" })
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((data) => {
          applyManualOrder(Array.isArray(data?.order) && data.order.length > 0 ? data.order : null);
        })
        .catch((err) => console.warn("[kitchen/order] load error:", err));
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const priorityNames = useMemo(
    () => new Set((menuItems || []).filter((m) => m.isPriority).map((m) => m.name)),
    [menuItems],
  );

  const flattenedItems = useMemo(
    () => flattenKitchenOrders(kitchenOrders),
    [kitchenOrders],
  );

  const pendingItems = useMemo(
    () => flattenedItems.filter((fi) => fi.item.cookingStatus === "pending" || !fi.item.cookingStatus),
    [flattenedItems],
  );

  const cookingItems = useMemo(
    () => flattenedItems.filter((fi) => fi.item.cookingStatus === "cooking"),
    [flattenedItems],
  );

  const doneItems = useMemo(
    () => flattenedItems.filter((fi) => fi.item.cookingStatus === "done" || fi.orderStatus === "Complete"),
    [flattenedItems],
  );

  // Đếm đơn bếp hoàn thành (đồng bộ với menu-tv)
  const doneOrdersCount = useMemo(
    () => (kitchenOrders || []).filter((o) => o.status === "Done").length,
    [kitchenOrders],
  );

  // Build sorted cooking queue
  const autoQueue = useMemo<CookingQueueItem[]>(
    () => buildCookingQueue(flattenedItems.map(toCookingQueueItem), priorityNames),
    [flattenedItems, priorityNames],
  );

  // Apply manual reorder on top of auto queue — always reconcile, never hard-reset
  const queueKeys = autoQueue.map((i) => i.key).join(",");
  const prevQueueKeys = useRef(queueKeys);

  // When queue composition changes, reconcile and persist (don't discard manual order)
  useEffect(() => {
    if (prevQueueKeys.current === queueKeys) return;
    prevQueueKeys.current = queueKeys;
    const currentOrder = manualOrderRef.current;
    if (!currentOrder) return;
    const autoKeySet = new Set(autoQueue.map((i) => i.key));
    const filtered = currentOrder.filter((k) => autoKeySet.has(k));
    const newKeys = autoQueue.map((i) => i.key).filter((k) => !currentOrder.includes(k));
    const reconciled = [...filtered, ...newKeys];
    applyManualOrder(reconciled.length > 0 ? reconciled : null);
    saveKitchenOrder(reconciled.length > 0 ? reconciled : null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueKeys]);

  const cookingQueue = useMemo<CookingQueueItem[]>(() => {
    if (!manualOrder) return autoQueue;
    // Restore manual order, filter out removed items, append new items at bottom
    const ordered: CookingQueueItem[] = [];
    for (const k of manualOrder) {
      const found = autoQueue.find((i) => i.key === k);
      if (found) ordered.push(found);
    }
    for (const item of autoQueue) {
      if (!manualOrder.includes(item.key)) ordered.push(item);
    }
    return ordered;
  }, [autoQueue, manualOrder]);

  const moveItem = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= cookingQueue.length) return;
    const newOrder = cookingQueue.map((i) => i.key);
    [newOrder[idx], newOrder[next]] = [newOrder[next], newOrder[idx]];
    applyManualOrder(newOrder);
    saveKitchenOrder(newOrder);
  };

  // Group by table for "THEO BÀN" panel
  const isItemDone = (item: FlattenedItem) =>
    item.item.cookingStatus === "done" || item.orderStatus === "Complete";

  const ordersByTable = useMemo(() => {
    const groups: Record<string, FlattenedItem[]> = {};
    for (const item of flattenedItems) {
      const table = item.tableNumber;
      if (!groups[table]) groups[table] = [];
      groups[table].push(item);
    }
    const tables = Object.keys(groups).sort((a, b) => {
      const aAllDone = groups[a].every(isItemDone);
      const bAllDone = groups[b].every(isItemDone);
      if (aAllDone && !bAllDone) return 1;
      if (!aAllDone && bAllDone) return -1;
      const aTime = groups[a].reduce(
        (min, i) => Math.min(min, i.sentAt?.getTime() ?? Infinity),
        Infinity,
      );
      const bTime = groups[b].reduce(
        (min, i) => Math.min(min, i.sentAt?.getTime() ?? Infinity),
        Infinity,
      );
      return aTime - bTime;
    });
    return tables.map((table) => ({
      tableNumber: table,
      items: groups[table].sort((a, b) => {
        if (!a.sentAt) return 1;
        if (!b.sentAt) return -1;
        return a.sentAt.getTime() - b.sentAt.getTime();
      }),
    }));
  }, [flattenedItems]);

  const doneItemKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const item of flattenedItems) {
      if (isItemDone(item)) keys.add(`${item.orderId}-${item.kitchenOrderId}-${item.item.name}`);
    }
    return keys;
  }, [flattenedItems]);

  useEffect(() => {
    if (pendingItems.length > 0) {
      audioRef.current?.play().catch(() => {});
    }
  }, [pendingItems.length]);

  const handleStartItem = (fi: FlattenedItem) => {
    startItem.mutate({ kitchenOrderId: fi.kitchenOrderId, itemName: fi.item.name, notes: fi.item.notes });
  };

  const handleCompleteItem = (item: CookingQueueItem) => {
    completeItem.mutate({ kitchenOrderId: item.kitchenOrderId, itemName: item.name, notes: item.notes });
  };

  return (
    <div className="h-full pb-4">
      <audio ref={audioRef} src="/notification.mp3" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h2 className="text-2xl font-bold text-foreground">BẾP</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 text-orange-600 font-bold text-sm border border-orange-500/30">
            <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 1, repeat: Infinity }}>
              <Flame className="w-4 h-4 text-orange-500" />
            </motion.div>
            <span>ĐANG NẤU: {cookingItems.length}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500/10 text-green-600 font-bold text-sm border border-green-500/30">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span>ĐÃ XONG: {doneOrdersCount}</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* ĐANG NẤU — full width, 1 column, mobile-first */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-bold text-orange-600">
                ĐANG NẤU ({cookingItems.length})
              </h3>
              {manualOrder && (
                <button
                  onClick={() => { applyManualOrder(null); saveKitchenOrder(null); }}
                  className="ml-auto text-xs text-slate-400 underline"
                >
                  Reset thứ tự
                </button>
              )}
            </div>
            <div className="space-y-2">
              {cookingQueue.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground bg-card rounded-2xl border border-dashed text-sm">
                  Không có món nào đang nấu
                </div>
              ) : (
                <AnimatePresence>
                  {cookingQueue.map((item, idx) => {
                    const isPri = priorityNames.has(item.name);
                    return (
                      <motion.div
                        key={item.key}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                          "rounded-xl border-2 p-3",
                          isPri
                            ? "bg-red-50 border-red-400"
                            : "bg-orange-50 border-orange-300",
                        )}
                      >
                        <div className="flex items-start gap-2">
                          {/* Up/Down controls */}
                          <div className="flex flex-col gap-0.5 flex-shrink-0 mt-0.5">
                            <button
                              onClick={() => moveItem(idx, -1)}
                              disabled={idx === 0}
                              className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200 active:bg-slate-300 transition-colors",
                                idx === 0 && "opacity-20 cursor-not-allowed",
                              )}
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => moveItem(idx, 1)}
                              disabled={idx === cookingQueue.length - 1}
                              className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200 active:bg-slate-300 transition-colors",
                                idx === cookingQueue.length - 1 && "opacity-20 cursor-not-allowed",
                              )}
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Table badge */}
                          <div
                            className={cn(
                              "flex-shrink-0 w-11 h-11 rounded-xl flex flex-col items-center justify-center font-black shadow-sm",
                              isPri
                                ? "bg-red-500 text-white"
                                : "bg-orange-400 text-white",
                            )}
                          >
                            <span className="text-[9px] leading-none opacity-80">BÀN</span>
                            <span className="text-lg leading-tight">{item.tableNumber}</span>
                          </div>

                          {/* Name + notes */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-1 flex-wrap">
                              {isPri && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-100 text-red-600 text-[10px] font-bold flex-shrink-0">
                                  <Zap className="w-2.5 h-2.5" />
                                  NHANH
                                </span>
                              )}
                              <p className="font-bold text-base text-orange-900 leading-snug break-words">
                                {item.name}
                              </p>
                            </div>
                            {item.sentAt && (
                              <p className="text-xs text-orange-500 mt-0.5">
                                Đã gọi {formatElapsed(item.sentAt)}
                              </p>
                            )}
                            {item.notes && (
                              <p className="text-xs text-orange-600 mt-0.5">
                                Ghi chú: {item.notes}
                              </p>
                            )}
                          </div>

                          {/* Qty + Done button */}
                          <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                            <span className="text-xl font-black text-orange-700 leading-none">
                              x{item.quantity}
                            </span>
                            <button
                              onClick={() => handleCompleteItem(item)}
                              disabled={completeItem.isPending}
                              className="px-3 py-1 rounded-lg text-xs font-bold bg-green-500 text-white hover:bg-green-600 active:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              XONG ✓
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* THEO BÀN — collapsed list below */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <UtensilsCrossed className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-bold text-blue-600">
                THEO BÀN ({ordersByTable.length})
              </h3>
            </div>
            <div className="space-y-2">
              {ordersByTable.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground bg-card rounded-2xl border border-dashed text-sm">
                  Không có order nào
                </div>
              ) : (
                ordersByTable.map((group) => {
                  const allDone = group.items.every(isItemDone);
                  return (
                    <motion.div
                      key={group.tableNumber}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={cn(
                        "rounded-xl border-2 p-3",
                        allDone
                          ? "bg-gray-50 border-gray-200 opacity-60"
                          : "bg-blue-50 border-blue-200",
                      )}
                    >
                      <div
                        className={cn(
                          "flex items-center gap-2 mb-2 pb-1.5 border-b",
                          allDone ? "border-gray-200" : "border-blue-200",
                        )}
                      >
                        <span
                          className={cn(
                            "text-base font-black",
                            allDone ? "text-gray-500" : "text-blue-700",
                          )}
                        >
                          BÀN {group.tableNumber}
                        </span>
                        <span
                          className={cn(
                            "text-xs",
                            allDone ? "text-gray-400" : "text-blue-500",
                          )}
                        >
                          {group.items.length} món{allDone && " ✓"}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {group.items.map((item, idx) => {
                          const isDone = isItemDone(item);
                          return (
                            <div
                              key={idx}
                              className={cn(
                                "flex items-center gap-2",
                                isDone && "opacity-40",
                              )}
                            >
                              {isDone ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                              ) : (
                                <span
                                  className={cn(
                                    "w-5 h-5 rounded flex items-center justify-center text-xs font-bold flex-shrink-0",
                                    item.item.cookingStatus === "cooking"
                                      ? "bg-orange-500 text-white"
                                      : "bg-yellow-500 text-white",
                                  )}
                                >
                                  {item.item.cookingStatus === "cooking" ? "🔥" : "⏳"}
                                </span>
                              )}
                              <span
                                className={cn(
                                  "font-medium text-sm flex-1",
                                  isDone && "line-through text-gray-500",
                                )}
                              >
                                {item.item.name}
                              </span>
                              <span
                                className={cn(
                                  "font-bold text-sm flex-shrink-0",
                                  isDone ? "text-gray-400" : "text-gray-700",
                                )}
                              >
                                x{item.item.quantity}
                              </span>
                              {(item.item.cookingStatus === "pending" || !item.item.cookingStatus) && !isDone && (
                                <button
                                  onClick={() => handleStartItem(item)}
                                  disabled={startItem.isPending}
                                  className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500 text-white hover:bg-blue-600 transition-colors flex-shrink-0"
                                >
                                  BẮT ĐẦU
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
