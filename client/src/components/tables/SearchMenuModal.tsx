import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatCurrency } from "@/lib/utils";
import { Search, X } from "lucide-react";
import type { MenuItem } from "@/hooks/use-menu";
import Fuse from "fuse.js";

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=300&fit=crop",
];

function getPlaceholderImage(index: number) {
  return PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length];
}

interface SearchMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
  onAddItem: (item: MenuItem) => void;
}

export function SearchMenuModal({ isOpen, onClose, menuItems, onAddItem }: SearchMenuModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const menuListRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isOpen && menuListRef.current) {
      setTimeout(() => {
        menuListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [isOpen]);

  // Group items by categoryId
  const { categories, groupedItems } = useMemo(() => {
    const groups: Record<string, MenuItem[]> = {};
    const catNames: Record<number, string> = {};
    
    menuItems.forEach(item => {
      const catId = item.categoryId ?? 0;
      if (!groups[catId]) groups[catId] = [];
      groups[catId].push(item);
      if (item.categoryId) catNames[catId] = `Danh mục ${item.categoryId}`;
    });
    
    if (groups[0]) catNames[0] = "Khác";
    
    Object.values(groups).forEach(items => {
      items.sort((a, b) => {
        if (a.isPriority !== b.isPriority) return b.isPriority ? 1 : -1;
        if (a.isSticky !== b.isSticky) return b.isSticky ? 1 : -1;
        return a.name.localeCompare(b.name);
      });
    });
    
    return {
      categories: Object.keys(groups).sort((a, b) => Number(a) - Number(b)).map(id => ({
        id,
        name: catNames[Number(id)] || `Danh mục ${id}`,
        count: groups[id].length,
      })),
      groupedItems: groups,
    };
  }, [menuItems]);

  const fuse = useMemo(() => new Fuse(menuItems, {
    keys: ["searchName", "name", "description"],
    threshold: 0.4,
    includeScore: false,
    shouldSort: false,
  }), [menuItems]);

  const filteredItems = useMemo(() => {
    if (searchQuery.trim()) {
      return fuse.search(searchQuery).map(r => r.item);
    }
    if (selectedCategory === "all") {
      return menuItems;
    }
    return groupedItems[selectedCategory] || [];
  }, [searchQuery, selectedCategory, fuse, menuItems, groupedItems]);

  const handleAddItem = (item: MenuItem) => {
    try { navigator.vibrate?.(30); } catch {}
    onAddItem(item);
    onClose();
    setSearchQuery("");
  };

  // Format price helper to display like '10k', '145k', etc. on mobile
  const formatMobilePrice = (price: number | string) => {
    const numPrice = typeof price === "string" ? parseFloat(price) : price;
    if (isNaN(numPrice)) return price;
    if (numPrice >= 1000) {
      return `${numPrice / 1000}k`;
    }
    return formatCurrency(numPrice);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center p-0 md:p-6",
            isMobile ? "items-start" : "items-center"
          )}
          onClick={onClose}
        >
          <motion.div
            initial={isMobile ? { y: "-100%" } : { y: 50, opacity: 0 }}
            animate={isMobile ? { y: 0 } : { y: 0, opacity: 1 }}
            exit={isMobile ? { y: "-100%" } : { y: 50, opacity: 0 }}
            transition={
              isMobile 
                ? { type: "spring", damping: 28, stiffness: 240 }
                : { type: "spring", damping: 25, stiffness: 220 }
            }
            className={cn(
              "bg-white dark:bg-[#171510] w-full max-w-xl md:max-w-2xl flex flex-col overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.35)] border border-gray-100 dark:border-amber-500/10",
              isMobile ? "rounded-b-[2.5rem] rounded-t-none h-[50vh]" : "rounded-t-[2.5rem] md:rounded-[2.5rem] h-[80vh] md:h-[75vh]"
            )}
            onClick={e => e.stopPropagation()}
          >
            {/* Header - customized to "Tìm món" */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-border/30">
              <h3 className="font-extrabold text-lg text-gray-900 dark:text-amber-500">
                Tìm món
              </h3>
              <button
                onClick={onClose}
                className="p-1 rounded-full text-gray-900 hover:bg-gray-100 dark:hover:bg-amber-950/20 transition-colors"
              >
                <X className="w-6 h-6 stroke-[2.5]" />
              </button>
            </div>

            {/* Search - simplified placeholder and styled border */}
            <div className="px-6 py-4 bg-white dark:bg-[#1c1913]/30 border-b border-gray-100 dark:border-border/10">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 stroke-[2.5]" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm món..."
                  className="w-full pl-11 pr-4 py-3 rounded-2xl border border-amber-400 bg-gray-50/50 dark:bg-[#24211a]/80 text-sm font-bold placeholder-gray-400 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 dark:focus:ring-amber-500/5 transition-all"
                />
              </div>
            </div>

            {/* Categories */}
            <div className="px-6 py-3 border-b border-gray-100 dark:border-border/30 bg-white dark:bg-[#171510] overflow-x-auto flex gap-2 no-scrollbar flex-shrink-0">
              <button
                onClick={() => setSelectedCategory("all")}
                className={cn(
                  "px-5 py-2 rounded-full text-xs font-black transition-all",
                  selectedCategory === "all"
                    ? "bg-[#f5c20a] text-black shadow-sm"
                    : "bg-white dark:bg-[#24211a]/50 border border-gray-200 dark:border-border/20 text-gray-600 dark:text-gray-400 hover:border-amber-400"
                )}
              >
                Tất cả
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "px-5 py-2 rounded-full text-xs font-black transition-all",
                    selectedCategory === cat.id
                      ? "bg-[#f5c20a] text-black shadow-sm"
                      : "bg-white dark:bg-[#24211a]/50 border border-gray-200 dark:border-border/20 text-gray-600 dark:text-gray-400 hover:border-amber-400"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Menu Items Grid */}
            <div ref={menuListRef} className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-[#1a1813]/20 scrollbar-thin">
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {filteredItems.map((item, index) => (
                  <motion.button
                    key={item.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleAddItem(item)}
                    className="flex flex-col rounded-[20px] border border-gray-100/80 dark:border-border/30 bg-white dark:bg-card p-0 shadow-sm hover:shadow-md hover:border-amber-400/50 transition-all duration-300 overflow-hidden"
                  >
                    {/* Square image taking full width with price tag */}
                    <div className="w-full aspect-square overflow-hidden bg-gray-50 relative">
                      <img
                        src={item.image || getPlaceholderImage(index)}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).src = getPlaceholderImage(index); }}
                      />
                      {/* Price tag overlaying the bottom-left of the image */}
                      <span className="absolute bottom-2 left-2 bg-red-600 text-white text-[9px] sm:text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.15)] z-10">
                        {formatMobilePrice(item.price)}
                      </span>
                    </div>
                    {/* Item details below the image: name only uppercase */}
                    <div className="p-2.5 text-center w-full bg-white dark:bg-card flex items-center justify-center min-h-[2.8rem]">
                      <p className="text-xs sm:text-sm font-black text-gray-950 dark:text-gray-50 tracking-wide leading-tight line-clamp-2 uppercase">
                        {item.name}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>
              {filteredItems.length === 0 && (
                <div className="text-center py-16 text-gray-400 dark:text-gray-500 font-bold text-sm">
                  Không tìm thấy món nào khớp với từ khóa
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
