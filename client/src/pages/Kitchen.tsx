import { useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { useKitchenOrders, useStartKitchenItem, useCompleteKitchenItem, type KitchenItem } from "@/hooks/use-orders";
import { cn } from "@/lib/utils";
import { Clock, CheckCircle2, Flame, Loader2, Pin } from "lucide-react";

interface FlattenedItem {
  kitchenOrderId: number;
  orderId: number;
  tableNumber: string;
  item: KitchenItem;
  sentAt: Date | null;
}

function flattenKitchenOrders(orders: ReturnType<typeof useKitchenOrders>["data"]) {
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
  tableNumber: string;
  notes?: string;
  orderId: number;
  sentAt: Date | null;
}

function mergeCookingItems(items: FlattenedItem[]): MergedCookingItem[] {
  const merged: Map<string, MergedCookingItem> = new Map();
  
  for (const flatItem of items) {
    const key = flatItem.item.name;
    if (merged.has(key)) {
      const existing = merged.get(key)!;
      existing.totalQuantity += flatItem.item.quantity;
    } else {
      merged.set(key, {
        name: flatItem.item.name,
        totalQuantity: flatItem.item.quantity,
        kitchenOrderId: flatItem.kitchenOrderId,
        tableNumber: flatItem.tableNumber,
        notes: flatItem.item.notes,
        orderId: flatItem.orderId,
        sentAt: flatItem.sentAt,
      });
    }
  }
  
  return Array.from(merged.values()).sort((a, b) => {
    if (!a.sentAt) return 1;
    if (!b.sentAt) return -1;
    return new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime();
  });
}

export default function Kitchen() {
  const { data: kitchenOrders, isLoading } = useKitchenOrders();
  const startItem = useStartKitchenItem();
  const completeItem = useCompleteKitchenItem();
  const audioRef = useRef<HTMLAudioElement>(null);

  const flattenedItems = useMemo(() => flattenKitchenOrders(kitchenOrders), [kitchenOrders]);

  const pendingItems = useMemo(() => 
    flattenedItems.filter(fi => fi.item.cookingStatus === "pending" || !fi.item.cookingStatus),
    [flattenedItems]
  );

  const cookingItems = useMemo(() => 
    flattenedItems.filter(fi => fi.item.cookingStatus === "cooking"),
    [flattenedItems]
  );

  const doneItems = useMemo(() => 
    flattenedItems.filter(fi => fi.item.cookingStatus === "done"),
    [flattenedItems]
  );

  const mergedCookingItems = useMemo(() => mergeCookingItems(cookingItems), [cookingItems]);

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
          <h2 className="text-3xl font-sans font-bold text-foreground">Màn Hình Bếp</h2>
          <p className="text-muted-foreground mt-1 text-sm">Theo dõi món cần chế biến</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-100 text-yellow-700 font-bold">
            <Clock className="w-5 h-5" />
            <span>{pendingItems.length}</span>
            <span className="text-sm font-normal">chờ nấu</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-100 text-orange-700 font-bold">
            <Flame className="w-5 h-5" />
            <span>{mergedCookingItems.length}</span>
            <span className="text-sm font-normal">đang nấu</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-yellow-500" />
              <h3 className="text-lg font-bold text-yellow-600">CHỜ NẤU ({pendingItems.length})</h3>
            </div>
            <div className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-2">
              {pendingItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-dashed">
                  Không có món nào
                </div>
              ) : (
                pendingItems.map((flatItem, idx) => (
                  <motion.div
                    key={`${flatItem.kitchenOrderId}-${flatItem.item.name}-${idx}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-yellow-50 rounded-xl border-2 border-yellow-400 p-3 cursor-pointer hover:bg-yellow-100 transition-colors"
                    onClick={() => handleStartItem(flatItem)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-yellow-800">Bàn {flatItem.tableNumber}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-yellow-500 text-white flex items-center justify-center text-sm font-bold">
                          {flatItem.item.quantity}
                        </span>
                        <span className="font-semibold text-yellow-900">{flatItem.item.name}</span>
                      </div>
                    </div>
                    {flatItem.item.notes && (
                      <div className="mt-1 text-xs text-yellow-700">Ghi chú: {flatItem.item.notes}</div>
                    )}
                    <div className="mt-1 text-xs text-yellow-600">
                      {flatItem.sentAt && `Gửi lúc ${new Date(flatItem.sentAt).toLocaleTimeString("vi-VN")}`}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-5 h-5 text-orange-500" />
              <h3 className="text-lg font-bold text-orange-600">ĐANG NẤU ({mergedCookingItems.length})</h3>
            </div>
            <div className="space-y-2 max-h-[calc(100vh-180px)] overflow-y-auto pr-2">
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
                    className="bg-orange-50 rounded-xl border-2 border-orange-400 p-2 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-10 h-10 bg-orange-500/10 rounded-bl-full" />
                    <div className="flex justify-between items-center relative">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-orange-800">Bàn {item.tableNumber}</span>
                      </div>
                      <button
                        onClick={() => handleCompleteItem(item)}
                        disabled={completeItem.isPending}
                        className={cn(
                          "px-2 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1",
                          "bg-green-500 text-white hover:bg-green-600",
                          completeItem.isPending && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <Pin className="w-3 h-3" />
                        STICK
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold">
                        {item.totalQuantity}
                      </span>
                      <span className="text-base font-bold text-orange-900">{item.name}</span>
                    </div>
                    {item.notes && (
                      <div className="text-xs text-orange-700 mt-1">Ghi chú: {item.notes}</div>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <h3 className="text-lg font-bold text-green-600">HOÀN THÀNH ({doneItems.length})</h3>
            </div>
            <div className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-2">
              {doneItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-dashed">
                  Chưa có món hoàn thành
                </div>
              ) : (
                doneItems.slice(0, 50).map((flatItem, idx) => (
                  <motion.div
                    key={`done-${flatItem.kitchenOrderId}-${flatItem.item.name}-${idx}`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-50 rounded-xl border border-green-300 p-3 flex justify-between items-center"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <span className="font-semibold text-green-800">{flatItem.item.name}</span>
                      <span className="text-sm text-green-600">x{flatItem.item.quantity}</span>
                    </div>
                    <span className="text-sm text-green-600">Bàn {flatItem.tableNumber}</span>
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
