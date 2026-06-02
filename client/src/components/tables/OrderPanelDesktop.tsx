import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatCurrency } from "@/lib/utils";
import { Minus, Plus, X, Percent, UtensilsCrossed, CheckCircle2, ChevronDown, ChevronUp, Search } from "lucide-react";
import type { Order, OrderItem } from "@/hooks/use-orders";
import type { TableStatus } from "./table-types";

interface OrderPanelDesktopProps {
  selectedTable: number;
  tableNames: Record<number, string>;
  activeOrder: Order | undefined;
  currentStatus: TableStatus;
  onUpdateQuantity: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
  onShowPayModal: () => void;
  onShowMoveModal: () => void;
  onClose: () => void;
  doneItemNames?: Set<string>;
  menuItems?: any[];
  onSearchClick?: () => void;
}

export function OrderPanelDesktop({
  selectedTable,
  tableNames,
  activeOrder,
  currentStatus,
  onUpdateQuantity,
  onRemoveItem,
  onShowPayModal,
  onShowMoveModal,
  onClose,
  doneItemNames,
  menuItems,
  onSearchClick,
}: OrderPanelDesktopProps) {
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountType, setDiscountType] = useState<"percent" | "amount">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [isItemsExpanded, setIsItemsExpanded] = useState(true);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const tableName = tableNames[selectedTable] || `Bàn ${selectedTable}`;
  const statusLabel = currentStatus === "empty" ? "Trống" : currentStatus === "cooking" ? "Đang phục vụ" : "Sẵn sàng";
  const totalItems = activeOrder?.items.length || 0;

  const subtotal = activeOrder?.totalAmount || 0;
  const discountAmount = discountType === "percent" && discountValue
    ? Math.round(subtotal * Number(discountValue) / 100)
    : Number(discountValue) || 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  const isKitchenHidden = (menuItemId?: number) => {
    if (!menuItemId) return false;
    const item = menuItems?.find((m: any) => m.id === menuItemId);
    return item?.isHidden === true || item?.is_hidden === true;
  };

  const orderWithStatus = activeOrder ? {
    ...activeOrder,
    items: activeOrder.items.map(item => ({
      ...item,
      cookingStatus: doneItemNames?.has(item.name) ? "done" as const : item.cookingStatus,
    })),
  } : undefined;

  const isReady = currentStatus === "ready";

  return (
    <div className="relative h-full w-80 bg-white border border-gray-100 md:rounded-[24px] md:shadow-sm flex flex-col z-10 flex-shrink-0 overflow-hidden">
      {/* Header */}
      <div className="pt-4 pb-4 px-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn("w-11 h-11 rounded-full flex items-center justify-center shadow-md", isReady ? "bg-emerald-500 shadow-emerald-500/20" : "bg-orange-500 shadow-orange-500/20")}>
              <UtensilsCrossed className="w-5.5 h-5.5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-base text-gray-900 leading-tight">{tableName}</h2>
              <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                <span className={cn("w-2 h-2 rounded-full animate-pulse", isReady ? "bg-emerald-500" : "bg-orange-500")} />
                {statusLabel}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {activeOrder && (
          <div className="bg-orange-50/50 p-3.5 rounded-2xl flex justify-between items-center border border-orange-100 mt-3 animate-in fade-in duration-200">
            <span className="text-xs font-bold text-orange-800">
              {totalItems} món đã đặt
            </span>
            <span className="text-sm font-black text-orange-600">
              {formatCurrency(subtotal)}
            </span>
          </div>
        )}
      </div>

      {/* Order Items - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-3 bg-gray-50">
        {activeOrder && orderWithStatus && (
          <>
            {/* Thêm món button */}
            {onSearchClick && (
              <button
                onClick={onSearchClick}
                className="w-full py-3 mb-3 bg-orange-50 border border-orange-200 rounded-2xl font-bold text-orange-700 hover:bg-orange-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
              >
                <Plus className="w-4 h-4 text-orange-600" />
                Thêm món
              </button>
            )}

            {/* Toggle header */}
            <button
              onClick={() => setIsItemsExpanded(!isItemsExpanded)}
              className="w-full flex items-center justify-between mb-2 text-sm font-semibold text-gray-400 hover:text-gray-900 transition-colors"
            >
              <span>Chi tiết đơn</span>
              {isItemsExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            <AnimatePresence>
              {isItemsExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2">
                    {orderWithStatus.items.map((item: OrderItem, idx: number) => {
                      const isDone = item.cookingStatus === "done";
                      const autoGreen = isDone || isKitchenHidden(item.menuItemId);
                      const isExpanded = expandedIdx === idx;
                      return (
                        <div
                          key={`${item.menuItemId}-${idx}`}
                          className={cn(
                            "bg-white rounded-2xl border transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md",
                            isExpanded 
                              ? "border-l-[4px] border-l-orange-500 border-gray-200 bg-orange-50/5" 
                              : "border-gray-100 hover:border-orange-200"
                          )}
                        >
                          {/* Item Header */}
                          <div 
                            onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                            className="flex justify-between items-center p-3.5 cursor-pointer select-none"
                          >
                            <div className="flex items-center gap-3 flex-1 pr-2">
                              <span className={cn("text-xs font-black w-5 h-5 rounded-lg flex items-center justify-center bg-gray-100 text-gray-500", isExpanded && "bg-orange-100 text-orange-600")}>
                                {item.quantity}
                              </span>
                              <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", autoGreen ? "bg-green-500 animate-pulse" : "bg-gray-300")} />
                              <span className={cn("font-bold text-sm text-gray-800 leading-tight transition-colors", isExpanded && "text-orange-600")}>
                                {item.name}
                              </span>
                            </div>
                            <span className="font-extrabold text-sm text-gray-800 whitespace-nowrap">
                              {formatCurrency(item.price * item.quantity)}
                            </span>
                          </div>

                          {/* Expanded Details */}
                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <div className="px-3.5 pb-3.5 pt-1 border-t border-gray-50 flex justify-between items-center gap-4 bg-gray-50/50">
                                  <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-0.5 shadow-sm">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); onUpdateQuantity(idx, -1); }}
                                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-600 transition-colors active:scale-95 shadow-sm"
                                    >
                                      <Minus className="w-3.5 h-3.5 font-bold" />
                                    </button>
                                    <span className="font-extrabold text-sm min-w-[2rem] text-center text-gray-800">
                                      {item.quantity}
                                    </span>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); onUpdateQuantity(idx, 1); }}
                                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-600 transition-colors active:scale-95 shadow-sm"
                                    >
                                      <Plus className="w-3.5 h-3.5 font-bold" />
                                    </button>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); onRemoveItem(idx); }}
                                      className="text-red-500 hover:text-red-700 hover:bg-red-55 p-2 rounded-xl transition-all shadow-sm border border-red-100 bg-white"
                                      title="Xóa món"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {!activeOrder && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UtensilsCrossed className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-base font-medium text-gray-700">Chưa có món nào</p>
            <p className="text-sm text-gray-400 mt-1">Chọn món từ thực đơn</p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-4 border-t border-gray-200 bg-white space-y-3">
        {/* Discount Section */}
        {activeOrder && (
          <div>
            <button
              onClick={() => setShowDiscount(!showDiscount)}
              className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-955 transition-colors mb-2 w-full"
            >
              <Percent className="w-4 h-4 text-orange-500" />
              Giảm giá
              <span className="ml-auto text-xs text-orange-500">
                {showDiscount ? "Ẩn" : "Thêm"}
              </span>
            </button>

            <AnimatePresence>
              {showDiscount && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setDiscountType("percent")}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-sm font-bold transition-all",
                        discountType === "percent"
                          ? "bg-orange-500 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      )}
                    >
                      Phần trăm
                    </button>
                    <button
                      onClick={() => setDiscountType("amount")}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-sm font-bold transition-all",
                        discountType === "amount"
                          ? "bg-orange-500 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      )}
                    >
                      Số tiền
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={discountValue}
                      onChange={e => setDiscountValue(e.target.value)}
                      placeholder={discountType === "percent" ? "10" : "10000"}
                      className="flex-1 px-3 py-2.5 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                      min="0"
                      max={discountType === "percent" ? "100" : undefined}
                    />
                    <span className="py-2.5 px-2 text-sm font-medium text-gray-500">
                      {discountType === "percent" ? "%" : "đ"}
                    </span>
                  </div>
                  {discountAmount > 0 && (
                    <p className="text-xs text-orange-600 font-bold mt-2">
                      Giảm: -{formatCurrency(discountAmount)}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Totals */}
        {activeOrder && (
          <div className="space-y-1.5 py-3 border-t border-gray-100">
            <div className="flex justify-between text-xs font-bold text-gray-400">
              <span>Tạm tính</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-xs text-orange-600 font-bold">
                <span>Giảm giá</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between items-end pt-1">
              <span className="font-extrabold text-sm text-gray-800">Tổng cộng</span>
              <span className="text-xl font-black text-orange-500">
                {formatCurrency(finalTotal)}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {activeOrder ? (
          <div className="grid grid-cols-2 gap-3 mt-1">
            <button
              onClick={onShowMoveModal}
              className="py-3.5 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-2xl font-bold border border-orange-200 active:scale-[0.98] transition-all"
            >
              Đổi Bàn
            </button>
            <button
              onClick={onShowPayModal}
              className="py-3.5 bg-emerald-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
            >
              Thanh Toán
            </button>
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-gray-400 bg-gray-50 rounded-2xl border border-gray-150 font-bold">
            Bàn trống - Chọn món để bắt đầu
          </div>
        )}
      </div>
    </div>
  );
}