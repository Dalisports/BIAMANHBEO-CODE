import { useState, useMemo } from "react";
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
          className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="bg-background w-full max-w-lg max-h-[85vh] rounded-t-3xl flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-bold text-lg">Tìm món</h3>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3 bg-surface">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm món..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-primary outline-none"
                />
              </div>
            </div>

            {/* Categories */}
            <div className="px-4 py-2 border-b border-border bg-surface overflow-x-auto flex gap-2 no-scrollbar">
              <button
                onClick={() => setSelectedCategory("all")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex-shrink-0",
                  selectedCategory === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-white border border-outline text-secondary"
                )}
              >
                Tất cả
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex-shrink-0",
                    selectedCategory === cat.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-white border border-outline text-secondary"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-3 gap-2">
                {filteredItems.map((item, index) => (
                  <motion.button
                    key={item.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleAddItem(item)}
                    className="flex flex-col rounded-xl overflow-hidden bg-card border border-border hover:border-primary/50 transition-all"
                  >
                    <div className="relative aspect-square overflow-hidden bg-muted">
                      <img
                        src={item.image || getPlaceholderImage(index)}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).src = getPlaceholderImage(index); }}
                      />
                    </div>
                    <div className="p-1.5 text-center">
                      <p className="text-[10px] font-semibold text-foreground leading-tight line-clamp-2">
                        {item.name}
                      </p>
                      <p className="text-[10px] font-bold text-primary">
                        {formatCurrency(item.price)}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>
              {filteredItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Không tìm thấy món nào
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}