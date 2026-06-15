import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { cn, formatCurrency } from "@/lib/utils";
import { Search } from "lucide-react";
import type { MenuItem } from "@/hooks/use-menu";
import type { Order } from "@/hooks/use-orders";
import Fuse from "fuse.js";

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=400&h=300&fit=crop",
];

function getPlaceholderImage(index: number) {
  return PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length];
}

interface MenuSectionProps {
  menuItems: MenuItem[];
  activeOrder: Order | undefined;
  onAddItem: (item: MenuItem) => void;
  onUpdateQuantity: (index: number, delta: number) => void;
}

export function MenuSection({ menuItems, activeOrder, onAddItem, onUpdateQuantity }: MenuSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

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

  const getOrderQuantity = (itemName: string) => {
    const found = activeOrder?.items?.find(i => i.name === itemName);
    return found?.quantity || 0;
  };

  return (
    <div className="flex flex-col h-full bg-white md:rounded-[24px] md:shadow-sm md:border md:border-gray-100 overflow-hidden">
      {/* Search Bar */}
      <div className="px-4 py-3 border-b border-outline-variant bg-surface-container">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm món..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-outline bg-white text-sm placeholder:text-secondary/60 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-4 py-2.5 border-b border-outline-variant bg-surface overflow-x-auto flex gap-2 no-scrollbar">
        <button
          onClick={() => setSelectedCategory("all")}
          className={cn(
            "px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex-shrink-0",
            selectedCategory === "all"
              ? "border border-orange-500 text-orange-600 bg-orange-50/40 shadow-sm"
              : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
          )}
        >
          Tất cả
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={cn(
              "px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex-shrink-0",
              selectedCategory === cat.id
                ? "border border-orange-500 text-orange-600 bg-orange-50/40 shadow-sm"
                : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item, index) => {
            const orderQty = getOrderQuantity(item.name);
            return (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.03, y: -4 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { try { navigator.vibrate?.(30); } catch {} onAddItem(item); }}
                className="relative flex flex-col rounded-[24px] bg-white border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl hover:border-orange-200 transition-all duration-300"
              >
                {/* Image Container (aspect-square) */}
                <div className="w-full aspect-square bg-surface-container relative overflow-hidden flex-shrink-0">
                  <img
                    src={item.image || getPlaceholderImage(index)}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                    onError={e => { (e.target as HTMLImageElement).src = getPlaceholderImage(index); }}
                  />
                  
                  {/* Order quantity badge */}
                  {orderQty > 0 && (
                    <div className="absolute top-3 right-3 bg-orange-500 text-white font-black text-xs w-6 h-6 rounded-full flex items-center justify-center shadow-md animate-in zoom-in duration-200 z-10">
                      {orderQty}
                    </div>
                  )}

                  {/* Priority badge */}
                  {item.isPriority && (
                    <div className="absolute top-3 left-3 bg-orange-100 text-orange-700 text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm z-10">
                      🔥 PHỔ BIẾN
                    </div>
                  )}
                </div>

                {/* Content: Price - Name */}
                <div className="flex flex-col w-full p-3.5 mt-auto">
                  <div className="flex items-center gap-1.5 w-full justify-start">
                    <span className="font-black text-orange-500 text-base whitespace-nowrap flex-shrink-0">
                      {formatCurrency(item.price)}
                    </span>
                    <span className="text-gray-300 font-bold flex-shrink-0">-</span>
                    <h4 className="font-black text-sm md:text-base text-gray-800 uppercase truncate flex-1 text-left" title={item.name.toUpperCase()}>
                      {item.name}
                    </h4>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-secondary">
            <Search className="w-12 h-12 mb-3 opacity-50" />
            <p className="font-medium">Không tìm thấy món nào</p>
          </div>
        )}
      </div>
    </div>
  );
}