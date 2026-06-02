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
    <div className="relative h-full w-80 bg-white border-l border-gray-200 shadow-2xl flex flex-col z-10 flex-shrink-0">
      {/* Header */}
      <div className="pt-4 pb-4 px-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn("w-12 h-12 rounded-full flex items-center justify-center shadow-lg", isReady ? "bg-green-500 shadow-green-500/30" : "bg-amber-400 shadow-amber-400/30")}>
              <UtensilsCrossed className="w-6 h-6 text-black" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-gray-900">{tableName}</h2>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <span className={cn("w-2 h-2 rounded-full animate-pulse", isReady ? "bg-green-500" : "bg-amber-500")} />
                {statusLabel}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {activeOrder && (
          <div className="bg-amber-50 p-4 rounded-xl flex justify-between items-center border border-amber-200">
            <span className="text-sm font-bold text-amber-800">
              {totalItems} món đã đặt
            </span>
            <span className="text-sm font-black text-amber-800">
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
                className="w-full py-2 mb-2 bg-amber-50 border-2 border-amber-200 rounded-xl font-bold text-amber-700 hover:bg-amber-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Thêm món
              </button>
            )}

            {/* Toggle header */}
            <button
              onClick={() => setIsItemsExpanded(!isItemsExpanded)}
              className="w-full flex items-center justify-between mb-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
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
                      return (
                        <div
                          key={`${item.menuItemId}-${idx}`}
                          className={cn(
                            "p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-amber-300 transition-all"
                          )}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2 flex-1 pr-2">
                              <span className={cn("w-2 h-2 rounded-full flex-shrink-0", autoGreen ? "bg-green-500" : "bg-gray-400")} />
                              <span className="font-semibold text-sm text-gray-900 leading-tight">
                                {item.name}
                              </span>
                            </div>
                            <span className="font-bold text-sm text-gray-900 whitespace-nowrap">
                              {formatCurrency(item.price * item.quantity)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1.5 bg-gray-100 rounded-xl border border-gray-200 p-1">
                              <button
                                onClick={() => onUpdateQuantity(idx, -1)}
                                className="w-9 h-9 flex items-center justify-center rounded-lg bg-amber-400 hover:bg-amber-500 transition-colors active:scale-95 shadow-sm"
                              >
                                <Minus className="w-4 h-4 text-gray-900" />
                              </button>
                              <span className="font-bold text-sm min-w-[1.75rem] text-center text-gray-900">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => onUpdateQuantity(idx, 1)}
                                className="w-9 h-9 flex items-center justify-center rounded-lg bg-amber-400 hover:bg-amber-500 transition-colors active:scale-95 shadow-sm"
                              >
                                <Plus className="w-4 h-4 text-gray-900" />
                              </button>
                            </div>
                            <button
                              onClick={() => onRemoveItem(idx)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
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
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors mb-2 w-full"
            >
              <Percent className="w-4 h-4" />
              Giảm giá
              <span className="ml-auto text-xs">
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
                        "flex-1 py-2 rounded-lg text-sm font-bold transition-all",
                        discountType === "percent"
                          ? "bg-amber-500 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      )}
                    >
                      Phần trăm
                    </button>
                    <button
                      onClick={() => setDiscountType("amount")}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-sm font-bold transition-all",
                        discountType === "amount"
                          ? "bg-amber-500 text-white"
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
                      className="flex-1 px-3 py-2.5 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                      min="0"
                      max={discountType === "percent" ? "100" : undefined}
                    />
                    <span className="py-2.5 px-2 text-sm font-medium text-gray-500">
                      {discountType === "percent" ? "%" : "đ"}
                    </span>
                  </div>
                  {discountAmount > 0 && (
                    <p className="text-xs text-amber-600 font-semibold mt-2">
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
          <div className="space-y-1.5 py-3 border-t border-gray-200">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Tạm tính</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-amber-600 font-medium">
                <span>Giảm giá</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between items-end pt-1">
              <span className="font-bold text-base text-gray-900">Tổng cộng</span>
              <span className="text-2xl font-bold text-amber-600">
                {formatCurrency(finalTotal)}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {activeOrder ? (
          <div className="space-y-2">
            <button
              onClick={onShowPayModal}
              className="w-full py-3.5 bg-amber-500 text-white rounded-xl font-bold shadow-lg shadow-amber-500/30 hover:bg-amber-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              Thanh Toán {formatCurrency(finalTotal)}
            </button>
            <button
              onClick={onShowMoveModal}
              className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
            >
              Đổi Bàn
            </button>
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
            Bàn trống - Chọn món để bắt đầu
          </div>
        )}
      </div>
    </div>
  );
}