import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { buildCookingQueue, type CookingQueueItem } from "@/lib/cookingQueue";

declare global {
  interface Window {
    updateTickerText?: (text: string) => void;
  }
}
import { motion, AnimatePresence } from "framer-motion";
import { useMenuItems } from "@/hooks/use-menu";
import { useKitchenOrders, type KitchenItem } from "@/hooks/use-orders";
import { formatCurrency } from "@/lib/utils";
import { Flame, CheckCircle2, ScanLine, ChefHat } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1600&h=1200&fit=crop",
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1600&h=1200&fit=crop",
  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1600&h=1200&fit=crop",
  "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=1600&h=1200&fit=crop",
  "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1600&h=1200&fit=crop",
  "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=1600&h=1200&fit=crop",
];

export default function MenuTv() {
  const { data: menuItems } = useMenuItems();
  const { data: kitchenOrders } = useKitchenOrders();
  const queryClient = useQueryClient();

  // Real-time: WebSocket sẽ tự invalidate /api/kitchen + /api/orders khi có thay đổi
  useWebSocket();

  // Polling fallback + refresh menu/QR/ticker (WS không cover các key này)
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen"] });
      queryClient.invalidateQueries({ queryKey: ["/api/menu"] });
    }, 15000);
    return () => clearInterval(interval);
  }, [queryClient]);

  // Update lại "đã gọi X phút" mỗi 30s mà không cần fetch
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

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
        .catch(() => {});
    };
    fetchOrder();
    const interval = setInterval(fetchOrder, 15000);
    return () => clearInterval(interval);
  }, []);

  const [slideIndex, setSlideIndex] = useState(0);
  const [tickerText, setTickerText] = useState(
    "🍺 BIA MẠNH BÉO - Đặc sản Đầu Lợn Tiết Luộc 🌟 Chỉ có tại BIA MẠNH BÉO 🌟 Miễn phí đỗ xe 🍺",
  );
  const [attendanceQr, setAttendanceQr] = useState<{
    qrCode: string;
    enabled: boolean;
  } | null>(null);

  useEffect(() => {
    fetch("/api/settings/tickerText", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data?.value) setTickerText(data.value);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const fetchQr = () => {
      fetch("/api/attendance/qr")
        .then((r) => r.json())
        .then((d) =>
          setAttendanceQr({ qrCode: d.qrCode, enabled: !!d.enabled }),
        )
        .catch(() => {});
    };
    fetchQr();
    const interval = setInterval(fetchQr, 30000);
    return () => clearInterval(interval);
  }, []);

  const updateTicker = async (text: string) => {
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "tickerText", value: text }),
        credentials: "include",
      });
      setTickerText(text);
    } catch (err) {
      console.error("Failed to update ticker:", err);
    }
  };

  useEffect(() => {
    window.updateTickerText = updateTicker;
  }, []);

  // Slideshow: ưu tiên món sticky, fallback toàn bộ món có ảnh, fallback placeholders
  const stickyMenu = (menuItems || []).filter((m) => m.isSticky && m.image);
  const allMenu = (menuItems || []).filter((m) => m.image);
  const slideMenuItems =
    stickyMenu.length > 0 ? stickyMenu : allMenu.length > 0 ? allMenu : [];
  const slideImages =
    slideMenuItems.length > 0
      ? slideMenuItems.map((m) => m.image as string)
      : PLACEHOLDER_IMAGES;
  const slideCount = slideImages.length;

  useEffect(() => {
    if (slideCount === 0) return;
    const interval = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % slideCount);
    }, 6000);
    return () => clearInterval(interval);
  }, [slideCount]);

  // Build flat cooking items + run priority queue algorithm
  const priorityNames = useMemo(
    () =>
      new Set((menuItems || []).filter((m) => m.isPriority).map((m) => m.name)),
    [menuItems],
  );

  const allFlatItems = useMemo<CookingQueueItem[]>(() => {
    const result: CookingQueueItem[] = [];
    (kitchenOrders || []).forEach((order) => {
      order.items.forEach((item: KitchenItem) => {
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
  }, [kitchenOrders]);

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

  const doneOrders = (kitchenOrders || []).filter(
    (o) => o.status === "done" || o.status === "Complete",
  );
  const doneCount = doneOrders.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + Number(i.quantity || 0), 0),
    0,
  );
  const currentIdx = slideCount > 0 ? slideIndex % slideCount : 0;
  const currentImage = slideImages[currentIdx];
  const currentItem = slideMenuItems[currentIdx];

  const formatElapsed = (sentAt: Date | null) => {
    if (!sentAt) return "";
    const minutes = Math.floor((Date.now() - sentAt.getTime()) / 60000);
    if (minutes < 1) return "vừa xong";
    if (minutes < 60) return `${minutes} phút`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}p`;
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden flex flex-col">
      {/* Main 2-column area */}
      <div className="relative z-10 flex flex-1 min-h-0 gap-2 px-2 py-2">
        {/* LEFT 50% — cooking list */}
        <div className="w-1/2 h-full flex flex-col bg-black/30 rounded-2xl border border-yellow-500/30 overflow-hidden">
          <div className="flex items-center gap-[0.8vw] px-[1.5vw] py-[1.2vh] bg-gradient-to-r from-orange-600/40 to-red-600/40 border-b border-yellow-500/30 flex-shrink-0">
            <img src="/favicon.png" className="w-[2vw] h-[2vw]" />
            <h2 className="text-[1.8vw] font-black text-yellow-300 tracking-wide flex-1">
              BIA MẠNH BÉO
            </h2>
            {/* Counters aligned right */}
            <div className="flex gap-[1vw]">
              <div className="flex items-center gap-[0.4vw] bg-orange-500/20 rounded-lg px-[0.8vw] py-[0.4vh] border border-orange-500/30">
                <motion.div
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <Flame className="w-[1.4vw] h-[1.4vw] text-orange-400" />
                </motion.div>
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
                <p className="text-[1vw] mt-2 opacity-70">
                  Chưa có món nào đang nấu
                </p>
              </div>
            ) : (
              <AnimatePresence>
                {cookingItems.map((item, idx) => {
                  const isPri = priorityNames.has(item.name);
                  return (
                    <motion.div
                      key={item.key}
                      layout
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 30 }}
                      transition={{ delay: idx * 0.04 }}
                      className={`flex items-center gap-[1vw] rounded-xl px-[1.2vw] py-[1.2vh] border ${isPri ? "bg-red-900/60 border-red-400/60" : "bg-slate-800/70 border-orange-500/40"}`}
                    >
                      {/* Priority flash */}
                      {isPri && (
                        <span className="text-[1.2vw] flex-shrink-0">⚡</span>
                      )}

                      {/* Table badge */}
                      <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className={`flex-shrink-0 w-[5vw] h-[5vw] rounded-xl flex flex-col items-center justify-center text-black shadow-lg ${isPri ? "bg-gradient-to-br from-red-400 to-orange-500" : "bg-gradient-to-br from-yellow-400 to-orange-500"}`}
                      >
                        <span className="text-[0.7vw] font-bold leading-none opacity-80">
                          BÀN
                        </span>
                        <span className="text-[2vw] font-black leading-none">
                          {item.tableNumber}
                        </span>
                      </motion.div>

                      {/* Name + meta */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-[0.6vw] flex-wrap">
                          <p className="text-[2.2vw] font-black text-white leading-tight truncate">
                            {item.name}
                          </p>
                          {idx === 0 && (
                            <motion.span
                              animate={{
                                opacity: [1, 0.5, 1],
                                scale: [1, 1.06, 1],
                                boxShadow: [
                                  "0 0 0px rgba(239,68,68,0)",
                                  "0 0 10px rgba(239,68,68,0.8)",
                                  "0 0 0px rgba(239,68,68,0)",
                                ],
                              }}
                              transition={{ duration: 1.2, repeat: Infinity }}
                              className="inline-flex items-center gap-[0.3vw] bg-red-600 text-white text-[0.75vw] font-black px-[0.6vw] py-[0.2vh] rounded-full uppercase tracking-wider flex-shrink-0"
                            >
                              <motion.span
                                animate={{ rotate: [0, 360] }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "linear",
                                }}
                                className="inline-block"
                              >
                                🔥
                              </motion.span>
                              ĐANG CHẾ BIẾN
                            </motion.span>
                          )}
                        </div>
                        <p className="text-[0.95vw] text-orange-300 font-medium">
                          Đã gọi {formatElapsed(item.sentAt)}
                        </p>
                      </div>

                      {/* Quantity */}
                      <div
                        className={`flex-shrink-0 px-[1vw] py-[0.5vh] rounded-lg ${isPri ? "bg-red-500" : "bg-orange-500"}`}
                      >
                        <span className="text-[1.8vw] font-black text-white">
                          x{item.quantity}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* RIGHT 50% — slideshow with rich effects */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="w-1/2 h-full relative rounded-2xl overflow-hidden border-2 border-yellow-500/50 bg-black"
        >
          {/* Image layer (cropped via object-cover) */}
          <AnimatePresence mode="wait">
            <motion.div
              key={slideIndex}
              initial={{ opacity: 0, scale: 1.08, x: 30 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.98, x: -30 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <motion.img
                src={currentImage}
                alt={currentItem?.name || "Quảng cáo"}
                animate={{ y: [0, -4, 0] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="w-full h-full object-cover object-center"
              />
            </motion.div>
          </AnimatePresence>

          {/* Shimmer sweep */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "200%" }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none z-10"
          />

          {/* Scan line */}
          <motion.div
            animate={{ top: ["0%", "100%"] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-400/70 to-transparent pointer-events-none z-10"
          />

          {/* Glow border */}
          <motion.div
            animate={{
              boxShadow: [
                "inset 0 0 20px rgba(234,179,8,0)",
                "inset 0 0 60px rgba(234,179,8,0.35)",
                "inset 0 0 20px rgba(234,179,8,0)",
              ],
            }}
            transition={{ duration: 1.8, repeat: Infinity }}
            className="absolute inset-0 rounded-2xl pointer-events-none z-10"
          />

          {/* Info card overlay */}
          <AnimatePresence mode="wait">
            {currentItem && (
              <motion.div
                key={`info-${slideIndex}`}
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ delay: 0.25, duration: 0.5 }}
                className="absolute inset-x-0 bottom-0 p-[1.5vw] bg-gradient-to-t from-black/95 via-black/70 to-transparent z-20"
              >
                <div className="flex items-end justify-between gap-[1vw]">
                  <motion.p
                    animate={{
                      textShadow: [
                        "0px 0px 0px #fff",
                        "0px 0px 14px #fbbf24",
                        "0px 0px 0px #fff",
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="font-black text-[2.4vw] leading-tight text-white truncate flex-1"
                  >
                    {currentItem.name}
                  </motion.p>
                  <motion.p
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-yellow-400 font-black text-[2vw] whitespace-nowrap"
                  >
                    {formatCurrency(currentItem.price)}
                  </motion.p>
                </div>
                {currentItem.description && (
                  <motion.p
                    initial={{ y: 8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-slate-200 text-[1.1vw] mt-[0.5vh] line-clamp-2"
                  >
                    {currentItem.description}
                  </motion.p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Slide indicator dots */}
          {slideCount > 1 && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-2 z-30">
              {slideImages.slice(0, 10).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === currentIdx ? "bg-yellow-400 w-6" : "bg-white/40 w-1.5"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Corner accents */}
          <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-yellow-500/70 rounded-tl pointer-events-none z-20" />
          <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-yellow-500/70 rounded-tr pointer-events-none z-20" />
          <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-yellow-500/70 rounded-bl pointer-events-none z-20" />
          <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-yellow-500/70 rounded-br pointer-events-none z-20" />
        </motion.div>
      </div>

      {/* Attendance QR overlay */}
      {attendanceQr?.enabled && attendanceQr.qrCode && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute bottom-[6vh] right-[1vw] z-30 bg-white rounded-2xl shadow-2xl p-3 border-4 border-yellow-500"
        >
          <div className="flex items-center gap-2 mb-2 text-black">
            <ScanLine className="w-5 h-5 text-yellow-600" />
            <p className="font-black text-sm uppercase">Quét để chấm công</p>
          </div>
          <center>
            <QRCodeSVG value={attendanceQr.qrCode} size={140} level="M" />
          </center>
          <p className="text-center text-[10px] font-mono text-slate-600 mt-2 break-all max-w-[140px]">
            {attendanceQr.qrCode}
          </p>
        </motion.div>
      )}
    </div>
  );
}
