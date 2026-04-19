import { useState, useEffect } from "react";

declare global {
  interface Window {
    updateTickerText?: (text: string) => void;
  }
}
import { motion, AnimatePresence } from "framer-motion";
import { useMenuItems } from "@/hooks/use-menu";
import { useKitchenOrders } from "@/hooks/use-orders";
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

interface CookingDisplayItem {
  name: string;
  quantity: number;
  tableNumber: string;
  sentAt: Date | null;
}

export default function MenuTv() {
  const { data: menuItems } = useMenuItems();
  const { data: kitchenOrders } = useKitchenOrders();

  const [slideIndex, setSlideIndex] = useState(0);
  const [tickerText, setTickerText] = useState(
    "🍺 BIA MẠNH BÉO - Đặc sản Đầu Lợn Tiết Luộc 🌟 Chỉ có tại BIA MẠNH BÉO 🌟 Miễn phí đỗ xe 🍺",
  );
  const [attendanceQr, setAttendanceQr] = useState<{ qrCode: string; enabled: boolean } | null>(null);

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
        .then((d) => setAttendanceQr({ qrCode: d.qrCode, enabled: !!d.enabled }))
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

  // Slideshow: ưu tiên ảnh từ menu (sticky trước), fallback placeholders
  const stickyImages = (menuItems || [])
    .filter((m) => m.isSticky && m.image)
    .map((m) => m.image as string);
  const allMenuImages = (menuItems || [])
    .filter((m) => m.image)
    .map((m) => m.image as string);
  const slideImages =
    stickyImages.length > 0
      ? stickyImages
      : allMenuImages.length > 0
      ? allMenuImages
      : PLACEHOLDER_IMAGES;

  useEffect(() => {
    if (slideImages.length === 0) return;
    const interval = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % slideImages.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [slideImages.length]);

  // Cooking items đang nấu (chỉ "cooking", không phải "pending" hay "done")
  const cookingItems: CookingDisplayItem[] = [];
  (kitchenOrders || []).forEach((order) => {
    if (order.status !== "Cooking" && order.status !== "Waiting") return;
    order.items.forEach((item: any) => {
      if (item.cookingStatus === "cooking") {
        cookingItems.push({
          name: item.name,
          quantity: item.quantity,
          tableNumber: order.tableNumber,
          sentAt: order.sentAt ? new Date(order.sentAt) : null,
        });
      }
    });
  });

  cookingItems.sort((a, b) => {
    if (!a.sentAt) return 1;
    if (!b.sentAt) return -1;
    return a.sentAt.getTime() - b.sentAt.getTime();
  });

  const doneOrders = (kitchenOrders || []).filter((o) => o.status === "Done");
  const currentImage = slideImages[slideIndex % slideImages.length];

  const formatElapsed = (sentAt: Date | null) => {
    if (!sentAt) return "";
    const minutes = Math.floor((Date.now() - sentAt.getTime()) / 60000);
    if (minutes < 1) return "vừa xong";
    if (minutes < 60) return `${minutes} phút`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}p`;
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden flex flex-col">
      {/* Header */}
      <div className="relative z-10 px-4 py-2 bg-gradient-to-b from-black/60 to-transparent flex-shrink-0">
        <div className="flex items-center justify-between">
          <motion.h1
            animate={{
              textShadow: [
                "0px 0px 0px #fbbf24",
                "0.2vw 0.2vw 0.6vw #fbbf24",
                "0px 0px 0px #fbbf24",
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-[2.2vw] font-black text-yellow-400 tracking-wider leading-none"
          >
            BIA MẠNH BÉO
          </motion.h1>

          <div className="flex gap-[1.5vw]">
            <div className="flex items-center gap-[0.5vw] bg-orange-500/20 rounded-xl px-[1vw] py-[0.6vh] border border-orange-500/30">
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Flame className="w-[1.6vw] h-[1.6vw] text-orange-400" />
              </motion.div>
              <p className="text-[1vw] font-black text-orange-400">
                ĐANG NẤU: {cookingItems.length}
              </p>
            </div>
            <div className="flex items-center gap-[0.5vw] bg-green-500/20 rounded-xl px-[1vw] py-[0.6vh] border border-green-500/30">
              <CheckCircle2 className="w-[1.6vw] h-[1.6vw] text-green-400" />
              <p className="text-[1vw] font-black text-green-400">
                ĐÃ XONG: {doneOrders.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-column area */}
      <div className="relative z-10 flex flex-1 min-h-0 gap-2 px-2 pb-12">
        {/* LEFT 50% — cooking list */}
        <div className="w-1/2 h-full flex flex-col bg-black/30 rounded-2xl border border-yellow-500/30 overflow-hidden">
          <div className="flex items-center gap-[0.8vw] px-[1.5vw] py-[1.2vh] bg-gradient-to-r from-orange-600/40 to-red-600/40 border-b border-yellow-500/30 flex-shrink-0">
            <ChefHat className="w-[2vw] h-[2vw] text-yellow-300" />
            <h2 className="text-[1.8vw] font-black text-yellow-300 tracking-wide">
              MÓN ĐANG NẤU
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto px-[1vw] py-[1vh] space-y-[0.8vh]">
            {cookingItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <ChefHat className="w-[6vw] h-[6vw] mb-3 opacity-40" />
                <p className="text-[1.6vw] font-bold">Bếp đang trống</p>
                <p className="text-[1vw] mt-2 opacity-70">Chưa có món nào đang nấu</p>
              </div>
            ) : (
              <AnimatePresence>
                {cookingItems.map((item, idx) => (
                  <motion.div
                    key={`${item.tableNumber}-${item.name}-${idx}`}
                    layout
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 30 }}
                    transition={{ delay: idx * 0.04 }}
                    className="flex items-center gap-[1vw] bg-slate-800/70 rounded-xl px-[1.2vw] py-[1.2vh] border border-orange-500/40"
                  >
                    {/* Table badge */}
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="flex-shrink-0 w-[5vw] h-[5vw] rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex flex-col items-center justify-center text-black shadow-lg"
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
                      <p className="text-[1.6vw] font-black text-white leading-tight truncate">
                        {item.name}
                      </p>
                      <p className="text-[0.95vw] text-orange-300 font-medium">
                        Đã gọi {formatElapsed(item.sentAt)}
                      </p>
                    </div>

                    {/* Quantity */}
                    <div className="flex-shrink-0 px-[1vw] py-[0.5vh] bg-orange-500 rounded-lg">
                      <span className="text-[1.8vw] font-black text-white">
                        x{item.quantity}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* RIGHT 50% — slideshow */}
        <div className="w-1/2 h-full relative rounded-2xl overflow-hidden border-2 border-yellow-500/40 bg-black">
          <AnimatePresence mode="wait">
            <motion.img
              key={slideIndex}
              src={currentImage}
              alt="Quảng cáo"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </AnimatePresence>

          {/* Slide indicator dots */}
          {slideImages.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {slideImages.slice(0, 8).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === slideIndex % slideImages.length
                      ? "bg-yellow-400 w-6"
                      : "bg-white/40 w-1.5"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Corner accents */}
          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-yellow-500/60 rounded-tl pointer-events-none" />
          <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-yellow-500/60 rounded-tr pointer-events-none" />
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-yellow-500/60 rounded-bl pointer-events-none" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-yellow-500/60 rounded-br pointer-events-none" />
        </div>
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
          <QRCodeSVG value={attendanceQr.qrCode} size={140} level="M" />
          <p className="text-center text-[10px] font-mono text-slate-600 mt-2 break-all max-w-[140px]">
            {attendanceQr.qrCode}
          </p>
        </motion.div>
      )}

      {/* Footer ticker */}
      <div className="absolute bottom-0 left-0 right-0 bg-yellow-500 z-20 overflow-hidden py-1 flex items-center justify-center">
        <motion.div
          initial={{ x: "100vw" }}
          animate={{ x: ["100vw", "-100vw"] }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
            repeatDelay: 0,
          }}
          className="whitespace-nowrap py-[0.5vh]"
        >
          <span className="inline-block px-[4vw] text-black text-xl font-bold">
            {tickerText} {tickerText} {tickerText}
          </span>
        </motion.div>
      </div>
    </div>
  );
}
