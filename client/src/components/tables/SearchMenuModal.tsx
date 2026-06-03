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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="bg-white dark:bg-[#171510] w-full max-w-xl md:max-w-2xl rounded-t-[2.5rem] md:rounded-[2.5rem] flex flex-col overflow-hidden h-[80vh] md:h-[75vh] shadow-[0_25px_60px_rgba(0,0,0,0.35)] border border-gray-100 dark:border-amber-500/10"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-border/30">
              <h3 className="font-black text-sm text-gray-900 dark:text-amber-500 uppercase tracking-widest">
                THÊM MÓN VÀO ĐƠN
              </h3>
              <button
                onClick={onClose}
                className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-amber-950/20 text-gray-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="px-6 py-4 bg-gray-50/50 dark:bg-[#1c1913]/30 border-b border-gray-100 dark:border-border/10">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-amber-500 stroke-[3]" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Gõ tên món ăn cần tìm kiếm..."
                  className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 dark:border-border/40 bg-white dark:bg-[#24211a]/80 text-sm font-bold placeholder-gray-400 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 dark:focus:ring-amber-500/5 transition-all"
                />
              </div>
            </div>

            {/* Categories */}
            <div className="px-6 py-3 border-b border-gray-100 dark:border-border/30 bg-white dark:bg-[#171510] overflow-x-auto flex gap-2 no-scrollbar flex-shrink-0">
              <button
                onClick={() => setSelectedCategory("all")}
                className={cn(
                  "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all",
                  selectedCategory === "all"
                    ? "bg-gradient-to-r from-amber-500 to-amber-400 text-black shadow-md shadow-amber-500/20"
                    : "bg-gray-50 dark:bg-[#24211a]/50 border border-gray-100 dark:border-border/20 text-gray-600 dark:text-gray-400 hover:border-amber-400"
                )}
              >
                Tất cả
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all",
                    selectedCategory === cat.id
                      ? "bg-gradient-to-r from-amber-500 to-amber-400 text-black shadow-md shadow-amber-500/20"
                      : "bg-gray-50 dark:bg-[#24211a]/50 border border-gray-100 dark:border-border/20 text-gray-600 dark:text-gray-400 hover:border-amber-400"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Menu Items */}
            <div ref={menuListRef} className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-[#1a1813]/20 scrollbar-thin">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                {filteredItems.map((item, index) => (
                  <motion.button
                    key={item.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleAddItem(item)}
                    className="flex flex-col items-center rounded-[24px] border border-gray-100 dark:border-border/30 bg-white dark:bg-card p-3 shadow-sm hover:shadow-md hover:border-amber-400/50 transition-all duration-300 relative group"
                  >
                    <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-muted border border-gray-100 dark:border-border/20 mb-2 group-hover:scale-105 transition-transform duration-300">
                      <img
                        src={item.image || getPlaceholderImage(index)}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).src = getPlaceholderImage(index); }}
                      />
                    </div>
                    <div className="text-center w-full">
                      <p className="text-[10px] sm:text-xs font-black text-gray-900 dark:text-gray-100 uppercase tracking-wide leading-tight line-clamp-2 min-h-[2rem] flex items-center justify-center">
                        {item.name}
                      </p>
                      <p className="text-xs font-black text-amber-500 mt-1">
                        {formatCurrency(item.price)}
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
