import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { useMenuItems } from "@/hooks/use-menu";
import { useKitchenOrders } from "@/hooks/use-orders";
import { formatCurrency, cn } from "@/lib/utils";
import { Flame, CheckCircle2 } from "lucide-react";

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1606850780554-b55de1f1bf95?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1606850780554-b55de1f1bf95?w=600&h=400&fit=crop",
];

function getPlaceholderImage(index: number) {
  return PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length];
}

export default function MenuTv() {
  const { data: menuItems, isLoading } = useMenuItems();
  const { data: kitchenOrders } = useKitchenOrders();

  const [featuredIndex, setFeaturedIndex] = useState(0);
  const controls = useAnimation();

  const activeCookingOrders = kitchenOrders?.filter(o => o.status === "Cooking" || o.status === "Waiting") || [];
  const doneOrders = kitchenOrders?.filter(o => o.status === "Done") || [];

  useEffect(() => {
    if (!menuItems || menuItems.length === 0) return;
    const interval = setInterval(() => {
      setFeaturedIndex((prev) => (prev + 1) % menuItems.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [menuItems]);

  const getCookingItems = () => {
    const items: { name: string; quantity: number; tableNumber: string }[] = [];
    activeCookingOrders.forEach(order => {
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
      <div className="relative z-10 px-8 py-4 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center justify-between">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <motion.h1
              animate={{ 
                textShadow: ["0px 0px 0px #fbbf24", "3px 3px 10px #fbbf24", "0px 0px 0px #fbbf24"],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-3xl font-black text-yellow-400 tracking-wider"
            >
              BIA MẠNH BÉO
            </motion.h1>
            <motion.p
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-orange-400 text-sm font-medium"
            >
              THỰC ĐƠN ĐẶC BIỆT
            </motion.p>
          </motion.div>
          
          <div className="flex gap-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 bg-orange-500/20 rounded-xl px-4 py-2 border border-orange-500/30"
            >
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Flame className="w-5 h-5 text-orange-400" />
              </motion.div>
              <div>
                <motion.p
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: cookingItems.length > 0 ? Infinity : 0 }}
                  className="text-xl font-black text-orange-400"
                >
                  {cookingItems.length}
                </motion.p>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 bg-green-500/20 rounded-xl px-4 py-2 border border-green-500/30"
            >
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <div>
                <motion.p
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.5, repeat: doneOrders.length > 0 ? Infinity : 0, delay: 0.25 }}
                  className="text-xl font-black text-green-400"
                >
                  {doneOrders.length}
                </motion.p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 px-8 py-4 flex gap-6">
        {/* Menu grid */}
        <div className="flex-1 grid grid-cols-4 lg:grid-cols-5 gap-3">
          {isLoading ? (
            <div className="flex items-center justify-center col-span-full h-[60vh]">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="text-4xl"
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
                className="relative rounded-xl overflow-hidden bg-slate-800/60 border border-slate-700 cursor-pointer"
              >
                {/* Hover glow */}
                <motion.div
                  whileHover={{ 
                    boxShadow: ["0 0 0 rgba(234,179,8,0)", "0 0 20px rgba(234,179,8,0.3)", "0 0 0 rgba(234,179,8,0)"],
                  }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="absolute inset-0 rounded-xl pointer-events-none"
                />
                <div className="aspect-[4/3] overflow-hidden">
                  {item.image ? (
                    <motion.img 
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.3 }}
                      src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <motion.img 
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.3 }}
                      src={getPlaceholderImage(idx)} alt={item.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="p-2 bg-gradient-to-t from-black/90 to-transparent absolute inset-x-0 bottom-0 flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm truncate flex-1">{item.name}</p>
                  <motion.p
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: idx * 0.2 }}
                    className="text-yellow-400 font-bold text-lg whitespace-nowrap"
                  >
                    {formatCurrency(item.price)}
                  </motion.p>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Featured box - 2x2 */}
        <div className="w-[420px] h-[340px] flex-shrink-0">
          <motion.div
            key={featuredIndex}
            initial={{ scale: 0.8, opacity: 0, x: 50, rotate: -5 }}
            animate={{ scale: 1, opacity: 1, x: 0, rotate: 0 }}
            exit={{ scale: 0.8, opacity: 0, x: -50, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative h-full rounded-2xl overflow-hidden bg-slate-800/80 border-2 border-yellow-500/50"
          >
            <AnimatePresence mode="wait">
              {featuredItem && (
                <motion.div
                  key={featuredItem.id}
                  className="h-full flex flex-col"
                  initial={{ opacity: 0, scale: 1.1, y: -20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  transition={{ duration: 0.5, type: "spring" }}
                >
                  {/* Image with bounce and float */}
                  <div className="flex-1 min-h-0 overflow-hidden relative">
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="w-full h-full"
                    >
                        {featuredItem.image ? (
                          <img src={featuredItem.image} alt={featuredItem.name} className="w-full h-full object-cover object-center" />
                        ) : (
                          <img src={getPlaceholderImage(featuredIndex)} alt={featuredItem.name} className="w-full h-full object-cover object-center" />
                        )}
                    </motion.div>
                    
                    {/* Shine effect */}
                    <motion.div
                      initial={{ x: "-100%" }}
                      animate={{ x: "200%" }}
                      transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
                    />
                    
                    {/* Scan line */}
                    <motion.div
                      animate={{ top: ["0%", "100%"] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent pointer-events-none"
                    />
                  </div>
                  
                  {/* Info with slide up */}
                  <motion.div 
                    className="p-4 text-center bg-gradient-to-t from-black/90 to-transparent flex-shrink-0"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="flex items-center justify-center gap-3">
                      <motion.p
                        animate={{ 
                          textShadow: ["0px 0px 0px #fff", "2px 2px 8px #fbbf24", "0px 0px 0px #fff"],
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="font-bold text-xl truncate"
                      >
                        {featuredItem.name}
                      </motion.p>
                      <motion.p
                        initial={{ scale: 1 }}
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="text-yellow-400 font-black text-3xl"
                      >
                        {formatCurrency(featuredItem.price)}
                      </motion.p>
                    </div>
                    {featuredItem.description && (
                      <motion.p
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-slate-400 text-xs mt-2 line-clamp-2"
                      >
                        {featuredItem.description}
                      </motion.p>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Glow effect */}
            <motion.div
              animate={{ 
                boxShadow: ["0 0 20px rgba(234,179,8,0)", "0 0 60px rgba(234,179,8,0.4)", "0 0 20px rgba(234,179,8,0)"],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 rounded-2xl pointer-events-none"
            />
            
            {/* Corner decorations */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-yellow-500/50 rounded-tl" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-yellow-500/50 rounded-tr" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-yellow-500/50 rounded-bl" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-yellow-500/50 rounded-br" />
          </motion.div>
        </div>
      </div>

      {/* Footer - Scrolling ticker */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: "-100%" }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-0 left-0 right-0 bg-yellow-500/90 text-black py-2 font-bold text-base whitespace-nowrap z-20"
      >
        <span className="inline-block px-6">
          🍺 BIA MẠNH BÉO - Đặc sản Đầu Lợn Tiết Luộc 🌟 Chỉ có tại BIA MẠNH BÉO 🌟 Miễn phí đỗ xe 🍺
        </span>
        <span className="inline-block px-6">
          🍺 BIA MẠNH BÉO - Đặc sản Đầu Lợn Tiết Luộc 🌟 Chỉ có tại BIA MẠNH BÉO 🌟 Miễn phí đỗ xe 🍺
        </span>
        <span className="inline-block px-6">
          🍺 BIA MẠNH BÉO - Đặc sản Đầu Lợn Tiết Luộc 🌟 Chỉ có tại BIA MẠNH BÉO 🌟 Miễn phí đỗ xe 🍺
        </span>
      </motion.div>

      {/* Animated decorations */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        className="absolute top-20 right-40 w-24 h-24 border-2 border-yellow-500/10 rounded-full"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-24 right-80 w-32 h-32 border-2 border-orange-500/10 rounded-full"
      />
    </div>
  );
}