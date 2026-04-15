import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMenuItems } from "@/hooks/use-menu";
import { useKitchenOrders } from "@/hooks/use-orders";
import { formatCurrency } from "@/lib/utils";
import { Flame, CheckCircle2 } from "lucide-react";

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&h=400&fit=crop",
];

function getPlaceholderImage(index: number) {
  return PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length];
}

export default function MenuTv() {
  const { data: menuItems, isLoading } = useMenuItems();
  const { data: kitchenOrders } = useKitchenOrders();

  const [featuredIndex, setFeaturedIndex] = useState(0);

  const activeCookingOrders =
    kitchenOrders?.filter(
      (o) => o.status === "Cooking" || o.status === "Waiting",
    ) || [];
  const doneOrders = kitchenOrders?.filter((o) => o.status === "Done") || [];

  useEffect(() => {
    if (!menuItems || menuItems.length === 0) return;
    const interval = setInterval(() => {
      setFeaturedIndex((prev) => (prev + 1) % menuItems.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [menuItems]);

  const getCookingItems = () => {
    const items: { name: string; quantity: number; tableNumber: string }[] = [];
    activeCookingOrders.forEach((order) => {
      order.items.forEach((item: any) => {
        if (item.cookingStatus !== "done") {
          items.push({
            name: item.name,
            quantity: item.quantity,
            tableNumber: order.tableNumber,
          });
        }
      });
    });
    return items;
  };

  const cookingItems = getCookingItems();
  const featuredItem = menuItems?.[featuredIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(251,191,36,0.1),transparent_60%)]"
        />
      </div>

      {/* Header */}
      <div className="relative z-10 px-[3vw] py-2 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center justify-between">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <motion.h1
              animate={{
                textShadow: [
                  "0px 0px 0px #fbbf24",
                  "0.2vw 0.2vw 0.6vw #fbbf24",
                  "0px 0px 0px #fbbf24",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-[2.5vw] font-black text-yellow-400 tracking-wider leading-none"
            >
              BIA MẠNH BÉO
            </motion.h1>
            <motion.p
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-[1vw] text-orange-400 font-medium"
            >
              THỰC ĐƠN ĐẶC BIỆT
            </motion.p>
          </motion.div>

          <div className="flex gap-[2vw]">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-[0.5vw] bg-orange-500/20 rounded-xl px-[1vw] py-[1vh] border border-orange-500/30"
            >
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Flame className="w-[2vw] h-[2vw] text-orange-400" />
              </motion.div>
              <div>
                <motion.p
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{
                    duration: 0.5,
                    repeat: cookingItems.length > 0 ? Infinity : 0,
                  }}
                  className="text-[1vw] font-black text-orange-400"
                >
                  ĐANG CHẾ BIẾN: {cookingItems.length}
                </motion.p>
              </div>
            </motion.div>

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-[0.5vw] bg-green-500/20 rounded-xl px-[1vw] py-[1vh] border border-green-500/30"
            >
              <CheckCircle2 className="w-[2vw] h-[2vw] text-green-400" />
              <div>
                <motion.p
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{
                    duration: 0.5,
                    repeat: doneOrders.length > 0 ? Infinity : 0,
                    delay: 0.25,
                  }}
                  className="text-[1vw] font-black text-green-400"
                >
                  ĐÃ PHỤC VỤ: {doneOrders.length}
                </motion.p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main content - auto height */}
      <div className="relative z-10 px-[3vw] py-[2vh] flex gap-[2vw] items-stretch">
        {/* Menu grid */}
        <div className="flex-1 grid grid-cols-5 gap-[1vw] content-start self-start">
          {isLoading ? (
            <div className="flex items-center justify-center col-span-full h-full">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="text-[4vw]"
              >
                🍺
              </motion.div>
            </div>
          ) : (
            menuItems?.slice(0, 20).map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03, type: "spring" }}
                whileHover={{ scale: 1.03 }}
                className="relative rounded-xl overflow-hidden bg-slate-800/60 border border-slate-700"
              >
                <div className="aspect-[4/3] w-full">
                  {item.image ? (
                    <motion.img
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.3 }}
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <motion.img
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.3 }}
                      src={getPlaceholderImage(idx)}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="p-[0.8vw] bg-gradient-to-t from-black/90 to-transparent absolute inset-x-0 bottom-0 flex items-center justify-between gap-[0.5vw]">
                  <p className="font-semibold text-[1vw] truncate flex-1">
                    {item.name}
                  </p>
                  <motion.p
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: idx * 0.2,
                    }}
                    className="text-yellow-400 font-bold text-[1.2vw] whitespace-nowrap"
                  >
                    {formatCurrency(item.price)}
                  </motion.p>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Featured box - chiều cao tự theo ảnh */}
        <div className="w-[30vw] self-center">
          <motion.div
            key={featuredIndex}
            initial={{ scale: 0.9, opacity: 0, x: 30 }}
            animate={{ scale: 1, opacity: 1, x: 0 }}
            exit={{ scale: 0.9, opacity: 0, x: -30 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative rounded-2xl overflow-hidden bg-slate-800/80 border-2 border-yellow-500/50"
          >
            <AnimatePresence mode="wait">
              {featuredItem && (
                <motion.div
                  key={featuredItem.id}
                  className="flex flex-col"
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  {/* Square image */}
                  <div className="aspect-square w-full relative">
                    <motion.div
                      animate={{ y: [0, -3, 0] }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="w-full h-full"
                    >
                      {featuredItem.image ? (
                        <img
                          src={featuredItem.image}
                          alt={featuredItem.name}
                          className="w-full h-full object-cover object-center"
                        />
                      ) : (
                        <img
                          src={getPlaceholderImage(featuredIndex)}
                          alt={featuredItem.name}
                          className="w-full h-full object-cover object-center"
                        />
                      )}
                    </motion.div>
                    <motion.div
                      initial={{ x: "-100%" }}
                      animate={{ x: "200%" }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        repeatDelay: 3,
                      }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
                    />
                    <motion.div
                      animate={{ top: ["0%", "100%"] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="absolute inset-x-0 h-[0.2vh] bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent pointer-events-none"
                    />
                  </div>

                  {/* Info at bottom with 50% transparent background */}
                  <motion.div
                    className="mt-auto p-[1.5vw] text-center bg-black/50 flex-shrink-0"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="flex items-center justify-center gap-[1vw]">
                      <motion.p
                        animate={{
                          textShadow: [
                            "0px 0px 0px #fff",
                            "0.15vw 0.15vw 0.5vw #fbbf24",
                            "0px 0px 0px #fff",
                          ],
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="font-bold text-[1.3vw] truncate"
                      >
                        {featuredItem.name}
                      </motion.p>
                      <motion.p
                        initial={{ scale: 1 }}
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="text-yellow-400 font-black text-[2vw]"
                      >
                        {formatCurrency(featuredItem.price)}
                      </motion.p>
                    </div>
                    {featuredItem.description && (
                      <motion.p
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-slate-300 text-[0.8vw] mt-[0.3vw] line-clamp-2"
                      >
                        {featuredItem.description}
                      </motion.p>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              animate={{
                boxShadow: [
                  "0 0 20px rgba(234,179,8,0)",
                  "0 0 40px rgba(234,179,8,0.4)",
                  "0 0 20px rgba(234,179,8,0)",
                ],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 rounded-2xl pointer-events-none"
            />
            <div className="absolute top-[0.5vw] left-[0.5vw] w-[1vw] h-[1vw] border-t-2 border-l-2 border-yellow-500/50 rounded-tl" />
            <div className="absolute top-[0.5vw] right-[0.5vw] w-[1vw] h-[1vw] border-t-2 border-r-2 border-yellow-500/50 rounded-tr" />
            <div className="absolute bottom-[0.5vw] left-[0.5vw] w-[1vw] h-[1vw] border-b-2 border-l-2 border-yellow-500/50 rounded-bl" />
            <div className="absolute bottom-[0.5vw] right-[0.5vw] w-[1vw] h-[1vw] border-b-2 border-r-2 border-yellow-500/50 rounded-br" />
          </motion.div>
        </div>
      </div>

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
          className="whitespace-nowrap py-[1vh]"
        >
          <span className="inline-block px-[4vw] text-black text-[1.2vw] font-bold">
            🍺 BIA MẠNH BÉO - Đặc sản Đầu Lợn Tiết Luộc 🌟 Chỉ có tại BIA MẠNH
            BÉO 🌟 Miễn phí đỗ xe 🍺 BIA MẠNH BÉO - Đặc sản Đầu Lợn Tiết Luộc 🌟
            Chỉ có tại BIA MẠNH BÉO 🌟 Miễn phí đỗ xe 🍺 BIA MẠNH BÉO - Đặc sản
            Đầu Lợn Tiết Luộc 🌟 Chỉ có tại BIA MẠNH BÉO 🌟 Miễn phí đỗ xe 🍺
          </span>
        </motion.div>
      </div>

      {/* Decorations */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        className="absolute top-[15vh] right-[15vw] w-[6vw] h-[6vw] border-2 border-yellow-500/10 rounded-full"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-[20vh] right-[25vw] w-[8vw] h-[8vw] border-2 border-orange-500/10 rounded-full"
      />
    </div>
  );
}
