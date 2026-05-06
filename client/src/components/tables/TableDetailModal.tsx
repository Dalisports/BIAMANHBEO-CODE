import { motion, AnimatePresence } from "framer-motion";
import { cn, formatCurrency } from "@/lib/utils";
import { TABLE_STATUS, type TableStatus } from "./table-types";
import { Plus, History, X, Search } from "lucide-react";
import { OrderItemsList } from "./OrderItemsList";
import { TableHistory } from "./TableHistory";
import { getMethodConfig, getDefaultMethods } from "./payment-utils";
import type { Order, OrderItem } from "@/hooks/use-orders";
import Fuse from "fuse.js";

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
  showDeleteConfirm,
  deleteItemIndex,
  onDeleteConfirm,
  onDeleteCancel,
}: TableDetailModalProps) {
  const statusInfo = TABLE_STATUS[currentStatus];
  const tableName = tableNames[selectedTable] || `Bàn ${selectedTable}`;
  const getActiveOrderLocal = (tableNum: number) => {
    // Placeholder - will use props
    return undefined;
  };

  // Fuzzy search với Fuse.js
  const fuse = new Fuse(menuItems || [], {
    keys: ["name", "description"],
    threshold: 0.3,
    includeScore: false,
  });

  const filteredMenuItems = searchMenu.trim()
    ? fuse.search(searchMenu).map(result => result.item)
    : menuItems || [];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed inset-0 z-40 bg-background flex flex-col"
      >
        <div className="flex-1 max-w-2xl mx-auto w-full flex flex-col min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3 flex-shrink-0 border-b border-border/50">
            <div className="flex items-center gap-3">
              <span className={cn("px-3 py-1 rounded-full text-sm font-bold border", statusInfo.bg, statusInfo.border, statusInfo.text)}>
                {statusInfo.label}
              </span>
              <h3 className="text-xl font-bold">{tableName}</h3>
            </div>
            <button
              data-testid="close-table-modal"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-secondary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 px-4 pt-3 pb-0 flex-shrink-0">
            <button
              onClick={() => onTabChange("order")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-all",
                activeTab === "order"
                  ? "bg-amber-500 text-black shadow-sm"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              <Plus className="w-4 h-4" />
              Đặt Món
            </button>
            <button
              onClick={() => onTabChange("history")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-all",
                activeTab === "history"
                  ? "bg-amber-500 text-black shadow-sm"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              <History className="w-4 h-4" />
              Lịch Sử
            </button>
          </div>

           {/* Content */}
           <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
             {activeTab === "order" && (
               <>
                 {/* Current order items - Đưa lên trên cùng */}
                 {activeOrder && (
                   <OrderItemsList
                     order={activeOrder}
                     onUpdateQuantity={onUpdateQuantity}
                     onRemoveItem={onRemoveItem}
                   />
                 )}

                 {/* Search menu */}
                 <div className="bg-secondary/50 rounded-xl p-3">
                   <div className="relative">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                     <input
                       value={searchMenu}
                       onChange={e => setSearchMenu(e.target.value)}
                       placeholder="Tìm kiếm món (Fuzzy Search)..."
                       className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-border text-sm"
                     />
                   </div>
                 </div>

                  {/* Shortcuts removed as requested */}

                  {/* Menu items grid - responsive for mobile */}
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3 md:gap-2 max-h-48 overflow-y-auto p-1">
                   {filteredMenuItems
                     .filter(item => !item.isAvailable ? false : true)
                     .map(item => (
                        <button
                          key={item.id}
                          onClick={() => onAddItem(item)}
                          className={`flex flex-col items-center justify-center p-3 md:p-2 rounded-xl ${item.image ? '' : 'bg-gray-700'} border-2 border-border hover:border-amber-400 transition-colors text-center min-h-[90px] md:min-h-[70px] touch-action-manipulation relative overflow-hidden`}
                         style={item.image ? { backgroundImage: `url(${item.image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                       >
                         {item.image && <div className="absolute inset-0 bg-black/40 rounded-xl" />}
                         <div className="relative z-10">
                            <p className="font-medium text-lg md:text-base leading-tight text-white drop-shadow-md">{item.name}</p>
                           <p className="text-sm md:text-xs text-white/90 mt-2 md:mt-1 drop-shadow-md">{formatCurrency(item.price)}</p>
                         </div>
                       </button>
                     ))}
                 </div>
               </>
             )}

            {activeTab === "history" && (
              <TableHistory
                selectedTable={selectedTable}
              />
            )}
          </div>

          {/* Action buttons */}
          {activeTab === "order" && (
            <div className="flex gap-3 p-4 border-t border-border/50">
              {activeOrder ? (
                <>
                  <button
                    onClick={onShowMoveModal}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                  >
                    <span className="text-lg">🔄</span>
                    Đổi Bàn
                  </button>
                  {(currentStatus === "ready" || currentStatus === "cooking") && (
                    <button
                      data-testid="pay-order-btn"
                      onClick={onShowPayModal}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold bg-green-500 text-white hover:bg-green-600 transition-colors"
                    >
                      Thanh Toán
                    </button>
                  )}
                  <button
                    onClick={onClearTable}
                    className="px-4 py-3 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 transition-colors"
                  >
                    Xóa
                  </button>
                </>
              ) : (
                <div className="w-full text-center py-8 text-muted-foreground">
                  <p>Bàn trống - Chọn món để tạo đơn hàng</p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
