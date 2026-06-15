import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { buildCookingQueue, type CookingQueueItem } from "@/lib/cookingQueue";
import { useMenuItems } from "@/hooks/use-menu";
import { useKitchenOrders, type KitchenItem } from "@/hooks/use-orders";
import { formatCurrency } from "@/lib/utils";
import { Flame, CheckCircle2, ChefHat } from "lucide-react";

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1600&h=1200&fit=crop",
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1600&h=1200&fit=crop",
  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1600&h=1200&fit=crop",
  "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=1600&h=1200&fit=crop",
  "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1600&h=1200&fit=crop",
  "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=1600&h=1200&fit=crop",
];

export default function MenuTvSimple() {
  const { data: menuItems } = useMenuItems();
  const { data: kitchenOrders } = useKitchenOrders();
  const queryClient = useQueryClient();
  const [slideIndex, setSlideIndex] = useState(0);

  useWebSocket();

  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.reload();
    }, 60000);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen"] });
      queryClient.invalidateQueries({ queryKey: ["/api/menu"] });
    }, 180000);
    return () => clearInterval(interval);
  }, [queryClient]);

  const [kitchenOrder, setKitchenOrder] = useState<string[] | null>(null);
  useEffect(() => {
    const fetchOrder = () => {
      fetch("/api/kitchen/order", { credentials: "include" })
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data?.order) && data.order.length > 0) {
            setKitchenOrder(data.order);
          } else {
            setKitchenOrder(null);
          }
        })
        .catch(() => { });
    };
    fetchOrder();
    const interval = setInterval(fetchOrder, 180000);
    return () => clearInterval(interval);
  }, []);

  const stickyMenu = (menuItems || []).filter((m) => m.isSticky && m.image && !m.isHidden);
  const allMenu = (menuItems || []).filter((m) => m.image && !m.isHidden);
  const slideMenuItems = stickyMenu.length > 0 ? stickyMenu : allMenu.length > 0 ? allMenu : [];
  const slideImages = slideMenuItems.length > 0 ? slideMenuItems.map((m) => m.image as string) : PLACEHOLDER_IMAGES;
  const slideCount = slideImages.length;
  const currentItem = slideMenuItems[slideIndex];

  useEffect(() => {
    if (slideCount === 0) return;
    const interval = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % slideCount);
    }, 5000);
    return () => clearInterval(interval);
  }, [slideCount]);

  const priorityNames = useMemo(
    () => new Set((menuItems || []).filter((m) => m.isPriority && !m.isHidden).map((m) => m.name)),
    [menuItems],
  );

  const hiddenNames = useMemo(
    () => new Set((menuItems || []).filter((m) => m.isHidden).map((m) => m.name)),
    [menuItems],
  );

  const allFlatItems = useMemo<CookingQueueItem[]>(() => {
    const result: CookingQueueItem[] = [];
    (kitchenOrders || []).forEach((order) => {
      order.items.forEach((item: KitchenItem) => {
        if (hiddenNames.has(item.name)) return;
        result.push({
          key: `${order.orderId}-${order.id}-${item.name}`,
          kitchenOrderId: order.id,
          orderId: order.orderId,
          tableNumber: order.tableNumber,
          name: item.name,
          quantity: item.quantity,
          notes: item.notes,
          sentAt: order.sentAt ? new Date(order.sentAt) : null,
          cookingStatus: item.cookingStatus ?? "pending",
        });
      });
    });
    return result;
  }, [kitchenOrders, hiddenNames]);

  const cookingItems = useMemo(() => {
    const autoQueue = buildCookingQueue(allFlatItems, priorityNames);
    if (!kitchenOrder || kitchenOrder.length === 0) return autoQueue;
    const ordered: CookingQueueItem[] = [];
    for (const k of kitchenOrder) {
      const found = autoQueue.find((i) => i.key === k);
      if (found) ordered.push(found);
    }
    for (const item of autoQueue) {
      if (!kitchenOrder.includes(item.key)) ordered.push(item);
    }
    return ordered;
  }, [allFlatItems, priorityNames, kitchenOrder]);

  const doneOrders = (kitchenOrders || []).filter((o) => o.status === "done" || o.status === "Complete");
  const doneCount = doneOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + Number(i.quantity || 0), 0), 0);

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden flex flex-col">
      <div className="relative z-10 flex flex-1 min-h-0 gap-2 px-2 py-2">
        {/* LEFT 50% — cooking list */}
        <div className="w-1/2 h-full flex flex-col bg-black/30 rounded-2xl border border-yellow-500/30 overflow-hidden">
          <div className="flex items-center gap-[0.8vw] px-[1.5vw] py-[1.2vh] bg-gradient-to-r from-orange-600/40 to-red-600/40 border-b border-yellow-500/30 flex-shrink-0">
            <img src="/favicon.png" className="w-[2vw] h-[2vw]" />
            <h2 className="text-[1.8vw] font-black text-yellow-300 tracking-wide flex-1">
              BIA MẠNH BÉO
            </h2>
            <div className="flex gap-[1vw]">
              <div className="flex items-center gap-[0.4vw] bg-orange-500/20 rounded-lg px-[0.8vw] py-[0.4vh] border border-orange-500/30">
                <Flame className="w-[1.4vw] h-[1.4vw] text-orange-400" />
                <span className="text-[0.9vw] font-black text-orange-400">
                  ĐANG NẤU: {cookingItems.length}
                </span>
              </div>
              <div className="flex items-center gap-[0.4vw] bg-green-500/20 rounded-lg px-[0.8vw] py-[0.4vh] border border-green-500/30">
                <CheckCircle2 className="w-[1.4vw] h-[1.4vw] text-green-400" />
                <span className="text-[0.9vw] font-black text-green-400">
                  ĐÃ XONG: {doneCount}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-[1vw] py-[1vh] space-y-[0.8vh]">
            {cookingItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <ChefHat className="w-[6vw] h-[6vw] mb-3 opacity-40" />
                <p className="text-[1.6vw] font-bold">Bếp đang trống</p>
                <p className="text-[1vw] mt-2 opacity-70">Chưa có món nào đang nấu</p>
              </div>
            ) : (
              cookingItems.map((item, idx) => {
                const isPri = priorityNames.has(item.name);
                return (
                  <div
                    key={item.key}
                    className={`flex items-center gap-[1vw] rounded-xl px-[1.2vw] py-[1.2vh] border ${isPri ? "bg-red-900/60 border-red-400/60" : "bg-slate-800/70 border-orange-500/40"}`}
                  >
                    {isPri && <span className="text-[1.2vw] flex-shrink-0">⚡</span>}
                    <div className={`flex-shrink-0 w-[9vw] h-[5vw] rounded-xl flex flex-col items-center justify-center text-black ${isPri ? "bg-gradient-to-br from-red-400 to-orange-500" : "bg-gradient-to-br from-yellow-400 to-orange-500"}`}>
                      <span className="text-[2.5vw] font-black leading-none whitespace-nowrap">BÀN {item.tableNumber}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-[0.6vw] flex-wrap">
                        <p className="text-[2.4vw] font-black text-white leading-tight truncate">{item.name}</p>
                        {idx === 0 && (
                          <span className="inline-flex items-center gap-[0.3vw] bg-red-600 text-white text-[0.75vw] font-black px-[0.6vw] py-[0.2vh] rounded-full uppercase tracking-wider flex-shrink-0">
                            🔥 ĐANG CHẾ BIẾN
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`flex-shrink-0 px-[1vw] py-[0.5vh] rounded-lg ${isPri ? "bg-red-500" : "bg-orange-500"}`}>
                      <span className="text-[1.8vw] font-black text-white">x{item.quantity}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT 50% — slideshow */}
        <div className="w-1/2 h-full relative rounded-2xl overflow-hidden border-2 border-yellow-500/50 bg-black">
          <img
            src={currentItem?.image || slideImages[slideIndex] || PLACEHOLDER_IMAGES[0]}
            alt={currentItem?.name || "Menu"}
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Info overlay - top right */}
          <div className="absolute inset-x-0 top-0 p-[1.5vw] bg-gradient-to-b from-black/80 via-black/40 to-transparent z-10">
            <div className="flex items-start justify-between gap-[1vw]">
              <p className="font-black text-[3.7vw] leading-tight text-white truncate flex-1">
                {currentItem?.name || ""}
              </p>
              <p className="text-yellow-400 font-black text-[3.0vw] whitespace-nowrap">
                {currentItem ? formatCurrency(currentItem.price) : ""}
              </p>
            </div>
            {currentItem?.description && (
              <p className="text-slate-200 text-[1.1vw] mt-[0.5vh] line-clamp-2">
                {currentItem.description}
              </p>
            )}
          </div>

          {/* Slide indicator */}
          {slideCount > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {slideImages.slice(0, 10).map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full ${i === slideIndex ? "bg-yellow-400 w-6" : "bg-white/40 w-1.5"}`} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}