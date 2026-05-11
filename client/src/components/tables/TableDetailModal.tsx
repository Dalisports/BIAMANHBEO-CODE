import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatCurrency } from "@/lib/utils";
import { TABLE_STATUS, type TableStatus } from "./table-types";
import { Plus, History, X, Search, ChefHat, Clock, CheckCircle2, ArrowRight, ChevronDown } from "lucide-react";
import { OrderItemsList } from "./OrderItemsList";
import { TableHistory } from "./TableHistory";
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

function removeVietnameseDiacritics(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

interface TableDetailModalProps {
  selectedTable: number;
  tableNames: Record<number, string>;
  activeOrder: Order | undefined;
  currentStatus: TableStatus;
  activeTab: "order" | "history";
  menuItems: any[];
  searchMenu: string;
  setSearchMenu: (val: string) => void;
  onClose: () => void;
  onTabChange: (tab: "order" | "history") => void;
  onAddItem: (menuItem: any, quantity?: number) => void;
  onUpdateQuantity: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
  onClearTable: () => void;
  onShowPayModal: () => void;
  onShowMoveModal: () => void;
  doneItemNames?: Set<string>;
}

export function TableDetailModal({
  selectedTable,
  tableNames,
  activeOrder,
  currentStatus,
  activeTab,
  menuItems,
  searchMenu,
  setSearchMenu,
  onClose,
  onTabChange,
  onAddItem,
  onUpdateQuantity,
  onRemoveItem,
  onClearTable,
  onShowPayModal,
  onShowMoveModal,
  doneItemNames,
}: TableDetailModalProps) {
  const [isOrderExpanded, setIsOrderExpanded] = useState(false);
  const statusInfo = TABLE_STATUS[currentStatus];
  const tableName = tableNames[selectedTable] || `Bàn ${selectedTable}`;

  const orderWithDoneStatus = activeOrder ? {
    ...activeOrder,
    items: activeOrder.items.map(item => ({
      ...item,
      cookingStatus: doneItemNames?.has(item.name) ? "done" as const : item.cookingStatus,
    })),
  } : undefined;

  // Search thông minh: bỏ dấu tiếng Việt
  const menuItemsWithSearch = (menuItems || []).map(item => ({
    ...item,
    searchLower: removeVietnameseDiacritics(item.name).toLowerCase(),
  }));

  const fuse = new Fuse(menuItemsWithSearch, {
    keys: ["searchLower", "description"],
    threshold: 0.4,
    includeScore: false,
    shouldSort: false,
  });

  const filteredMenuItems = searchMenu.trim()
    ? fuse.search(searchMenu).map(r => r.item)
    : menuItemsWithSearch;

  const availableItems = filteredMenuItems.filter(item => item.isAvailable !== false);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed inset-0 z-40 bg-background flex flex-col"
      >
        <div className="flex-1 max-w-5xl mx-auto w-full flex flex-col min-h-0">
          {/* Status color strip at top */}
          <div className={cn("h-1.5 w-full", statusInfo.bg)} />
          {/* Header with tabs inline */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3 flex-shrink-0 border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center gap-3">
              {/* Status badge */}
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-bold border flex items-center gap-1.5 whitespace-nowrap",
                  statusInfo.bg,
                  statusInfo.border,
                  statusInfo.text
                )}
              >
                {currentStatus === "cooking" && <ChefHat className="w-3.5 h-3.5" />}
                {currentStatus === "ready" && <CheckCircle2 className="w-3.5 h-3.5" />}
                {currentStatus === "empty" && <Clock className="w-3.5 h-3.5" />}
                {tableName.toUpperCase()}
              </motion.div>

              {/* Tab buttons - side by side */}
              <div className="flex flex-row gap-2 ml-2">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onTabChange("order")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all",
                    activeTab === "order"
                      ? cn(statusInfo.bg, statusInfo.text, "shadow-md")
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Plus className="w-4 h-4" />
                  Đặt Món
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onTabChange("history")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all",
                    activeTab === "history"
                      ? cn(statusInfo.bg, statusInfo.text, "shadow-md")
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  <History className="w-4 h-4" />
                  Lịch Sử
                </motion.button>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.9 }}
              data-testid="close-table-modal"
              onClick={onClose}
              className="p-2.5 rounded-xl hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 py-3 bg-background">
            {activeTab === "order" && (
              <div className="space-y-4">
                {/* Search menu - Fuzzy Search */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    value={searchMenu}
                    onChange={e => setSearchMenu(e.target.value)}
                    placeholder="Tìm món nhanh (Ko dấu)..."
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-border text-base focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  />
                </div>

                {/* Category filter hint */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Thực đơn</span>
                  <ArrowRight className="w-4 h-4" />
                  <span className="font-medium text-foreground">{availableItems.length} món</span>
                </div>

                {/* Menu items grid - Scrollable */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {availableItems.map((item, index) => (
                    <motion.button
                      key={item.id}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { onAddItem(item); setSearchMenu(""); }}
                      className="group relative flex flex-col rounded-2xl overflow-hidden bg-white border-2 border-border hover:border-primary hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 active:scale-95"
                    >
                      {/* Image container */}
                      <div className="relative aspect-square overflow-hidden bg-muted">
                        <img
                          src={item.image || getPlaceholderImage(index)}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = getPlaceholderImage(index);
                          }}
                        />
                        {(() => {
                          const orderItem = activeOrder?.items?.find(i => i.name === item.name);
                          if (!orderItem) return null;
                          return (
                            <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full min-w-[1.5rem] text-center">
                              {orderItem.quantity}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Content - name and price on same row */}
                      <div className="p-3 flex flex-row items-center justify-between gap-2">
                        <h4 className="font-semibold text-base text-foreground line-clamp-2 leading-tight flex-1 text-left">
                          {item.name}
                        </h4>
                        <span className="font-bold text-primary text-base whitespace-nowrap">
                          {formatCurrency(item.price)}
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "history" && (
              <TableHistory selectedTable={selectedTable} />
            )}
          </div>

          {/* Fixed bottom section: Order Items + Action Buttons */}
          {activeTab === "order" && (
            <div className="flex-shrink-0 border-t border-border/50 bg-card">
              {/* Current order items - Collapsible */}
              {orderWithDoneStatus && (
                <>
                  {/* Toggle header */}
                  <button
                    onClick={() => setIsOrderExpanded(!isOrderExpanded)}
                    className="w-full px-4 py-3 flex items-center justify-between bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold uppercase">Đơn hàng hiện tại:</span>
                      {orderWithDoneStatus && (
                        <span className="text-lg font-black uppercase text-white">
                          {formatCurrency(orderWithDoneStatus.totalAmount)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs opacity-80">Click xem chi tiết</span>
                      <motion.div
                        animate={{ rotate: isOrderExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-5 h-5" />
                      </motion.div>
                    </div>
                  </button>

                  {/* Expandable content */}
                  <AnimatePresence>
                    {isOrderExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-y-auto"
                        style={{ maxHeight: "calc(100vh - 300px)" }}
                      >
                        <OrderItemsList
                          order={orderWithDoneStatus}
                          onUpdateQuantity={onUpdateQuantity}
                          onRemoveItem={onRemoveItem}
                          menuItems={menuItems}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 p-4">
                {activeOrder ? (
                  <>
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={onShowMoveModal}
                      className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-bold bg-sky-500 text-white hover:bg-sky-600 transition-colors border-2 border-sky-600"
                    >
                      <span className="font-bold uppercase">ĐỔI BÀN</span>
                    </motion.button>
                    {(currentStatus === "ready" || currentStatus === "cooking") && (
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        data-testid="pay-order-btn"
                        onClick={onShowPayModal}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-bold uppercase">Thanh Toán</span>
                      </motion.button>
                    )}
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={onClearTable}
                      className="px-4 py-3.5 rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-lg shadow-destructive/25"
                    >
                      <X className="w-5 h-5" />
                    </motion.button>
                  </>
                ) : (
                  <div className="w-full text-center py-4 text-muted-foreground bg-secondary/50 rounded-xl">
                    <p className="font-medium">Bàn trống
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
