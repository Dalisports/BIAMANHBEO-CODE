import { useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import {
  useKitchenOrders,
  useStartKitchenItem,
  useCompleteKitchenItem,
  type KitchenItem,
} from "@/hooks/use-orders";
import { cn } from "@/lib/utils";
import {
  Clock,
  CheckCircle2,
  Flame,
  Loader2,
  Pin,
  UtensilsCrossed,
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
) {
  const items: FlattenedItem[] = [];
  if (!orders) return items;

  for (const order of orders) {
    for (const item of order.items) {
      items.push({
        kitchenOrderId: order.id,
        orderId: order.orderId,
        tableNumber: order.tableNumber,
        item,
        sentAt: order.sentAt,
        orderStatus: order.status,
      });
    }
  }

  return items.sort((a, b) => {
    if (!a.sentAt) return 1;
    if (!b.sentAt) return -1;
    return new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime();
  });
}

interface MergedCookingItem {
  name: string;
  totalQuantity: number;
  kitchenOrderId: number;
  tableNumbers: string[];
  notes?: string;
  orderId: number;
  sentAt: Date | null;
}

function mergeCookingItems(items: FlattenedItem[]): MergedCookingItem[] {
  const itemGroups: Record<string, FlattenedItem[]> = {};

  for (const item of items) {
    const name = item.item.name;
    if (!itemGroups[name]) {
      itemGroups[name] = [];
    }
    itemGroups[name].push(item);
  }

  const scoredItems: { item: FlattenedItem; score: number }[] = [];
  const PRIORITY_WINDOW = 12 * 60 * 1000;

  const names = Object.keys(itemGroups);
  for (const name of names) {
    const groupItems = itemGroups[name];
    if (groupItems.length === 1) {
      scoredItems.push({
        item: groupItems[0],
        score: 0,
      });
    } else {
      const times = groupItems
        .map((i: FlattenedItem) =>
          i.sentAt ? new Date(i.sentAt).getTime() : 0,
        )
        .filter((t: number) => t > 0)
        .sort((a: number, b: number) => a - b);

      if (times.length < 2) {
        scoredItems.push({
          item: groupItems[0],
          score: 0,
        });
        continue;
      }

      const timeDiff = times[times.length - 1] - times[0];

      if (timeDiff <= PRIORITY_WINDOW) {
        const numTables = groupItems.length;
        const baseScore = numTables * 1000000;

        for (const item of groupItems) {
          scoredItems.push({
            item,
            score:
              baseScore - (item.sentAt ? new Date(item.sentAt).getTime() : 0),
          });
        }
      } else {
        for (const item of groupItems) {
          scoredItems.push({
            item,
            score: 0,
          });
        }
      }
    }
  }

  scoredItems.sort((a, b) => b.score - a.score);

  const mergedMap: Record<string, MergedCookingItem> = {};

  for (const s of scoredItems) {
    const key = s.item.item.name;
    if (!mergedMap[key]) {
      mergedMap[key] = {
        name: s.item.item.name,
        totalQuantity: 0,
        kitchenOrderId: s.item.kitchenOrderId,
        tableNumbers: [],
        notes: s.item.item.notes,
        orderId: s.item.orderId,
        sentAt: s.item.sentAt,
      };
    }
    mergedMap[key].totalQuantity += s.item.item.quantity;
    if (!mergedMap[key].tableNumbers.includes(s.item.tableNumber)) {
      mergedMap[key].tableNumbers.push(s.item.tableNumber);
    }
  }

  return Object.values(mergedMap);
}

export default function Kitchen() {
  const { data: kitchenOrders, isLoading } = useKitchenOrders();
  const startItem = useStartKitchenItem();
  const completeItem = useCompleteKitchenItem();
  const audioRef = useRef<HTMLAudioElement>(null);

  const flattenedItems = useMemo(
    () => flattenKitchenOrders(kitchenOrders),
    [kitchenOrders],
  );

  const pendingItems = useMemo(
    () =>
      flattenedItems.filter(
        (fi) => fi.item.cookingStatus === "pending" || !fi.item.cookingStatus,
      ),
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

  const mergedCookingItems = useMemo(
    () => mergeCookingItems(cookingItems),
    [cookingItems],
  );

  const isItemDone = (item: FlattenedItem) => {
    return item.item.cookingStatus === "done" || item.orderStatus === "Complete";
  };

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
      const aTime = groups[a].reduce((min, i) => {
        const t = i.sentAt ? new Date(i.sentAt).getTime() : Infinity;
        return t < min ? t : min;
      }, Infinity);
      const bTime = groups[b].reduce((min, i) => {
        const t = i.sentAt ? new Date(i.sentAt).getTime() : Infinity;
        return t < min ? t : min;
      }, Infinity);
      return aTime - bTime;
    });
    return tables.map((table) => ({
      tableNumber: table,
      items: groups[table].sort((a, b) => {
        if (!a.sentAt) return 1;
        if (!b.sentAt) return -1;
        return new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime();
      }),
    }));
  }, [flattenedItems]);

  const doneItemKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const item of flattenedItems) {
      if (isItemDone(item)) {
        keys.add(`${item.kitchenOrderId}-${item.item.name}`);
      }
    }
    return keys;
  }, [flattenedItems]);

  useEffect(() => {
    if (pendingItems.length > 0) {
      audioRef.current?.play().catch(() => {});
    }
  }, [pendingItems.length]);

  const handleStartItem = (flatItem: FlattenedItem) => {
    startItem.mutate({
      kitchenOrderId: flatItem.kitchenOrderId,
      itemName: flatItem.item.name,
    });
  };

  const handleCompleteItem = (mergedItem: MergedCookingItem) => {
    completeItem.mutate({
      kitchenOrderId: mergedItem.kitchenOrderId,
      itemName: mergedItem.name,
    });
  };

  return (
    <div className="h-full">
      <audio ref={audioRef} src="/notification.mp3" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-sans font-bold text-foreground">BẾP</h2>
          <p className="text-muted-foreground mt-1 text-sm"></p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-100 text-yellow-700 font-bold">
            <Clock className="w-5 h-5" />
            <span>{mergedCookingItems.length}</span>
            <span className="text-sm font-normal">đang nấu</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-100 text-orange-700 font-bold">
            <Flame className="w-5 h-5" />
            <span>{doneItems.length}</span>
            <span className="text-sm font-normal">xong</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <UtensilsCrossed className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-bold text-blue-600">
                THEO BÀN ({ordersByTable.length})
              </h3>
            </div>
            <div className="space-y-3 max-h-[calc(100vh-180px)] overflow-y-auto pr-2">
              {ordersByTable.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-dashed">
                  Không có order nào
                </div>
              ) : (
                <>{ordersByTable.map((group) => {
                  const allDone = group.items.every(isItemDone);
                  return (
                    <motion.div
                      key={group.tableNumber}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={cn(
                        "rounded-xl border-2 p-3 mb-3",
                        allDone
                          ? "bg-gray-100 border-gray-300 opacity-60"
                          : "bg-blue-50 border-blue-300"
                      )}
                    >
                      <div className={cn(
                        "flex items-center gap-2 mb-2 pb-2 border-b",
                        allDone ? "border-gray-300" : "border-blue-200"
                      )}>
                        <span className={cn(
                          "text-lg font-black",
                          allDone ? "text-gray-500" : "text-blue-700"
                        )}>
                          BÀN {group.tableNumber}
                        </span>
                        <span className={cn(
                          "text-sm",
                          allDone ? "text-gray-400" : "text-blue-500"
                        )}>
                          ({group.items.length} món)
                          {allDone && " ✓"}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {group.items.map((item, idx) => {
                          const isDone = doneItemKeys.has(
                            `${item.kitchenOrderId}-${item.item.name}`,
                          );
                          return (
                            <div
                              key={idx}
                              className={cn(
                                "flex items-center justify-between py-1",
                                isDone && "opacity-40",
                              )}
                            >
                              <div className="flex items-center gap-2">
                                {isDone ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                ) : (
                                  <span
                                    className={cn(
                                      "w-5 h-5 rounded flex items-center justify-center text-xs font-bold",
                                      item.item.cookingStatus === "cooking"
                                        ? "bg-orange-500 text-white"
                                        : "bg-yellow-500 text-white",
                                    )}
                                  >
                                    {item.item.cookingStatus === "cooking"
                                      ? "🔥"
                                      : "⏳"}
                                  </span>
                                )}
                                <span
                                  className={cn(
                                    "font-medium",
                                    isDone && "line-through text-gray-500",
                                  )}
                                >
                                  {item.item.name}
                                </span>
                              </div>
                              <span
                                className={cn(
                                  "font-bold",
                                  isDone ? "text-gray-400" : "text-gray-700",
                                )}
                              >
                                x{item.item.quantity}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })}</>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-bold text-orange-600">
                ĐANG NẤU ({mergedCookingItems.length})
              </h3>
            </div>
            <div className="space-y-3 max-h-[calc(100vh-180px)] overflow-y-auto pr-2">
              {mergedCookingItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-dashed">
                  Không có món nào
                </div>
              ) : (
                mergedCookingItems.map((item, idx) => (
                  <motion.div
                    key={`${item.kitchenOrderId}-${item.name}-${idx}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-orange-50 rounded-xl border-2 border-orange-400 p-3 relative overflow-hidden"
                  >
                    <span className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center text-lg font-bold shadow-lg border-2 border-white z-10">
                      {item.totalQuantity}
                    </span>
                    <div className="flex items-center gap-3 pr-12">
                      <div className="flex items-center gap-1 flex-wrap">
                        {item.tableNumbers.map((table, tIdx) => (
                          <span
                            key={tIdx}
                            className={cn(
                              "text-2xl font-black",
                              tIdx % 2 === 0
                                ? "text-red-600"
                                : "text-green-600",
                            )}
                          >
                            {table}
                            {tIdx < item.tableNumbers.length - 1 && (
                              <span className="text-gray-400 mx-0.5">,</span>
                            )}
                          </span>
                        ))}
                      </div>
                      <span className="text-gray-400">-</span>
                      <span className="text-xl font-bold text-orange-900 truncate">
                        {item.name}
                      </span>
                      <button
                        onClick={() => handleCompleteItem(item)}
                        disabled={completeItem.isPending}
                        className={cn(
                          "ml-auto px-3 py-1.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-1 shrink-0",
                          "bg-green-500 text-white hover:bg-green-600",
                          completeItem.isPending &&
                            "opacity-50 cursor-not-allowed",
                        )}
                      >
                        <Pin className="w-4 h-4" />
                        XONG
                      </button>
                    </div>
                    {item.notes && (
                      <div className="text-xs text-orange-700 mt-1">
                        Ghi chú: {item.notes}
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
