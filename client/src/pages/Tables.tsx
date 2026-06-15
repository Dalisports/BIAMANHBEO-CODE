import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useOrders, useCreateOrder, useUpdateOrder, usePayOrder, usePaymentSettings, useUpdatePaymentSetting, useSendToKitchen, useKitchenOrders, useRemoveKitchenItem, type Order, type OrderItem } from "@/hooks/use-orders";
import { useMenuItems } from "@/hooks/use-menu";
import { useTableNames } from "@/hooks/use-table-names";
import { getAuthHeaders } from "@/hooks/use-auth";
import { useNotificationSound } from "@/hooks/use-notification-sound";
import { Loader2, Settings, X, LayoutGrid, DollarSign, Clock, TrendingUp, Search, Minus, Plus, CheckCircle2, UtensilsCrossed } from "lucide-react";
import { Receipt } from "@/components/Receipt";
import { cn, formatCurrency } from "@/lib/utils";
import { TableGrid } from "@/components/tables/TableGrid";
import { TableDetailModal } from "@/components/tables/TableDetailModal";
import { PaymentModal } from "@/components/tables/PaymentModal";
import { MoveTableModal } from "@/components/tables/MoveTableModal";
import { ConfirmDeleteModal } from "@/components/tables/ConfirmDeleteModal";
import { MenuSection } from "@/components/tables/MenuSection";
import { OrderPanelDesktop } from "@/components/tables/OrderPanelDesktop";
import { SearchMenuModal } from "@/components/tables/SearchMenuModal";

const MAX_TABLES = 15;

// Mobile Order View Component
interface MobileOrderViewProps {
  selectedTable: number;
  tableNames: Record<number, string>;
  activeOrder: Order | undefined;
  currentStatus: string;
  doneItemNames?: Set<string>;
  menuItems: any[];
  onShowPayModal: () => void;
  onShowMoveModal: () => void;
  onRemoveItem: (index: number) => void;
  onUpdateQuantity: (index: number, delta: number) => void;
  onSearchClick: () => void;
  onClose: () => void;
  
  // Discount props
  showDiscount: boolean;
  setShowDiscount: (val: boolean) => void;
  discountType: "percent" | "amount";
  setDiscountType: (val: "percent" | "amount") => void;
  discountValue: string;
  setDiscountValue: (val: string) => void;
  discountAmount: number;
  finalTotal: number;
}

function MobileOrderView({
  selectedTable,
  tableNames,
  activeOrder,
  currentStatus,
  doneItemNames,
  menuItems,
  onShowPayModal,
  onShowMoveModal,
  onRemoveItem,
  onUpdateQuantity,
  onSearchClick,
  onClose,
  showDiscount,
  setShowDiscount,
  discountType,
  setDiscountType,
  discountValue,
  setDiscountValue,
  discountAmount,
  finalTotal,
}: MobileOrderViewProps) {
  const tableName = tableNames[selectedTable] || `Bàn ${selectedTable}`;

  const isKitchenHidden = (menuItemId?: number) => {
    if (!menuItemId) return false;
    const item = menuItems.find((m: any) => m.id === menuItemId);
    return item?.isHidden === true || item?.is_hidden === true;
  };

  const orderWithStatus = activeOrder ? {
    ...activeOrder,
    items: activeOrder.items.map(item => ({
      ...item,
      cookingStatus: doneItemNames?.has(item.name) ? "done" as const : item.cookingStatus,
    })),
  } : undefined;

  const statusLabel = currentStatus === "empty" ? "Trống" : currentStatus === "cooking" ? "Đang phục vụ" : "Sẵn sàng";
  const isReady = currentStatus === "ready";
  const totalItems = activeOrder?.items.length || 0;

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Table header - full bleed */}
      <div className="flex-shrink-0 bg-white border-b border-amber-500/10 shadow-sm z-10">
        <div className="flex items-center justify-between px-4 pt-3 pb-3">
          <div className="flex items-center gap-3">
            <div className={cn("w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-105", isReady ? "bg-green-500 shadow-green-500/20" : "bg-[#f5c20a] shadow-amber-500/10")}>
              <UtensilsCrossed className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="font-black text-lg text-gray-900 tracking-wider">{tableName}</h2>
              <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                <span className={cn("w-2 h-2 rounded-full animate-pulse", isReady ? "bg-green-500" : "bg-amber-500")} />
                <span className="font-bold">{statusLabel}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              {discountAmount > 0 && (
                <span className="text-[10px] text-red-500 font-bold block line-through">
                  {formatCurrency(activeOrder?.totalAmount || 0)}
                </span>
              )}
              <span className="text-2xl font-black text-[#e2990f] tracking-wide">
                {activeOrder && finalTotal > 0 ? formatCurrency(finalTotal) : "0k"}
              </span>
              <p className="text-xs font-bold text-gray-400 mt-0.5">{totalItems} món</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-gray-100/80 hover:bg-gray-200 active:scale-95 text-gray-500 flex items-center justify-center transition-all duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Thêm món button - above items */}
      {activeOrder && (
        <div className="px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
          <button
            onClick={onSearchClick}
            className="w-full py-3 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-2xl font-black text-amber-700 hover:from-amber-500/20 hover:to-yellow-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm tracking-widest shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            THÊM MÓN
          </button>
        </div>
      )}

      {/* Order items list - scrollable, constrained height */}
      <div className="min-h-0 flex-1 overflow-y-auto py-3 px-4 bg-gray-50/50 space-y-3">
        {activeOrder ? (
          <div className="space-y-3">
            {orderWithStatus?.items.map((item, idx) => {
              const isDone = item.cookingStatus === "done";
              const autoGreen = isDone || isKitchenHidden(item.menuItemId);
              return (
                <div
                  key={`${item.menuItemId}-${idx}`}
                  className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-200/50 shadow-sm hover:shadow-md hover:border-amber-400/50 transition-all duration-300"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm", autoGreen ? "bg-green-500 shadow-green-500/20" : "bg-gray-300")} />
                    <div className="flex-1">
                      <p className="font-extrabold text-xs text-gray-900 tracking-wide break-words">{item.name}</p>
                      <p className="text-xs font-bold text-gray-400 mt-1">
                        {formatCurrency(item.price)} × {item.quantity}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-amber-500/5 rounded-2xl p-1 border border-amber-500/15">
                      <button
                        onClick={() => onUpdateQuantity(idx, -1)}
                        className="w-10 h-10 rounded-xl bg-amber-400 text-black flex items-center justify-center hover:bg-amber-500 active:scale-95 transition-all shadow-sm font-bold"
                      >
                        <Minus className="w-4 h-4 stroke-[3]" />
                      </button>
                      <span className="font-black text-sm min-w-[2.2rem] text-center text-gray-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(idx, 1)}
                        className="w-10 h-10 rounded-xl bg-amber-400 text-black flex items-center justify-center hover:bg-amber-500 active:scale-95 transition-all shadow-sm font-bold"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full py-16 bg-white">
            <div className="w-24 h-24 bg-gray-100/80 rounded-full flex items-center justify-center mb-6 text-gray-400">
              <UtensilsCrossed className="w-10 h-10 stroke-[1.5]" />
            </div>
            <p className="text-gray-900 font-black text-lg mb-1 tracking-wide">Chưa có món nào</p>
            <p className="text-xs font-bold text-gray-400 mb-6 text-center max-w-[200px]">
              Bắt đầu đặt món cho {tableName}
            </p>
            <button
              onClick={onSearchClick}
              className="px-8 py-3.5 bg-[#e2990f] hover:bg-[#c68305] text-white rounded-full font-bold shadow-lg shadow-amber-500/10 active:scale-95 transition-all flex items-center justify-center gap-2 text-base"
            >
              <Search className="w-5 h-5 text-white stroke-[2.5]" />
              Bắt đầu đặt món
            </button>
          </div>
        )}
      </div>

      {/* Action buttons - sticky bottom, full width */}
      {activeOrder && (
        <div className="px-4 pb-5 pt-3 bg-white border-t border-gray-100 space-y-2 flex-shrink-0 z-10 shadow-[0_-4px_16px_rgba(0,0,0,0.03)]">
          {/* Discount Section */}
          <div className="border-b border-gray-100 pb-2">
            <button
              onClick={() => setShowDiscount(!showDiscount)}
              className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors mb-2 w-full"
            >
              <span className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">%</span>
                Giảm giá
              </span>
              <span className="ml-auto text-xs font-extrabold text-amber-600">
                {showDiscount ? "Ẩn" : "Thêm"}
              </span>
            </button>

            <AnimatePresence>
              {showDiscount && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-2"
                >
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDiscountType("percent")}
                      className={cn(
                        "flex-1 py-1.5 rounded-xl text-xs font-black transition-all",
                        discountType === "percent"
                          ? "bg-amber-500 text-black shadow-sm"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      )}
                    >
                      Phần trăm
                    </button>
                    <button
                      onClick={() => setDiscountType("amount")}
                      className={cn(
                        "flex-1 py-1.5 rounded-xl text-xs font-black transition-all",
                        discountType === "amount"
                          ? "bg-amber-500 text-black shadow-sm"
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
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition-all text-black"
                      min="0"
                      max={discountType === "percent" ? "100" : undefined}
                    />
                    <span className="text-xs font-extrabold text-gray-500 min-w-[1.5rem] text-right">
                      {discountType === "percent" ? "%" : "đ"}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Totals Summary */}
          {discountAmount > 0 && (
            <div className="flex justify-between text-xs text-red-500 font-extrabold px-1 pb-1">
              <span>Đã giảm:</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onShowMoveModal}
              className="flex-1 py-3.5 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 active:scale-[0.98] transition-all tracking-wider text-xs"
            >
              ĐỔI BÀN
            </button>
            <button
              onClick={onShowPayModal}
              className="flex-1 py-3.5 bg-gradient-to-r from-amber-500 to-amber-400 text-black rounded-2xl font-black shadow-lg shadow-amber-500/20 hover:from-amber-600 hover:to-amber-500 active:scale-[0.98] transition-all tracking-wider text-xs"
            >
              THANH TOÁN
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Shorten currency numbers for mobile stats card (e.g. 150000 -> 150k, 0 -> 0k)
const formatStatsPrice = (price: number) => {
  if (price === 0) return "0k";
  if (price >= 1000) {
    return `${price / 1000}k`;
  }
  return `${price}`;
};

export default function Tables() {
  const queryClient = useQueryClient();
  const { data: orders, isLoading: ordersLoading } = useOrders();
  const { data: menuItems, isLoading: menuLoading } = useMenuItems();
  const { data: paymentSettings } = usePaymentSettings();
  const { data: kitchenOrders } = useKitchenOrders();
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();
  const sendToKitchen = useSendToKitchen();
  const payOrder = usePayOrder();
  const removeKitchenItem = useRemoveKitchenItem();
  const { playBeep } = useNotificationSound();

  const { tableNames, saveTableNames } = useTableNames();

  const [selectedTable, setSelectedTable] = useState<number | null>(null);

  // Hide agent bubble when table is selected
  useEffect(() => {
    if (selectedTable !== null) {
      document.body.classList.add("hide-agent-bubble");
    } else {
      document.body.classList.remove("hide-agent-bubble");
    }
    return () => document.body.classList.remove("hide-agent-bubble");
  }, [selectedTable]);

  // Reset discount on table change
  useEffect(() => {
    setShowDiscount(false);
    setDiscountType("percent");
    setDiscountValue("");
  }, [selectedTable]);

  useEffect(() => {
    const handleOpenCheckout = (e: CustomEvent) => {
      const tableNumber = e.detail?.tableNumber;
      if (tableNumber && orders) {
        const activeOrder = orders.find(
          (o) => o.tableNumber === String(tableNumber) && o.paymentStatus !== "Paid"
        );
        if (activeOrder) {
          setShowPayModal(activeOrder.id);
        }
      }
    };
    window.addEventListener("open-checkout-modal", handleOpenCheckout as EventListener);
    return () => window.removeEventListener("open-checkout-modal", handleOpenCheckout as EventListener);
  }, [orders]);

  const [searchMenu, setSearchMenu] = useState("");
  const [showPayModal, setShowPayModal] = useState<number | null>(null);
  const [payMethod, setPayMethod] = useState("cash");
  const [showMoveModal, setShowMoveModal] = useState<number | null>(null);
  const [renamingTable, setRenamingTable] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<"table" | "item" | null>(null);
  const [deleteItemIndex, setDeleteItemIndex] = useState<number | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingSetting, setEditingSetting] = useState<string | null>(null);

  // Shared discount state
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountType, setDiscountType] = useState<"percent" | "amount">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [settingForm, setSettingForm] = useState({
    label: "",
    icon: "",
    qrImageUrl: "",
    accountName: "",
    accountNumber: "",
    bankName: "",
    additionalInfo: "",
  });
  const updatePaymentSetting = useUpdatePaymentSetting();
  const [showReceipt, setShowReceipt] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<"order" | "history">("order");
  const [showSearchModal, setShowSearchModal] = useState(false);

  const getActiveOrder = (tableNum: number): Order | undefined =>
    orders?.find(o => o.tableNumber === tableNum.toString() && o.status !== "Complete");

  const selectedOrder = selectedTable ? getActiveOrder(selectedTable) : undefined;
  const currentStatus = !selectedOrder ? "empty" : selectedOrder.status === "Ready" ? "ready" : "cooking";

  const subtotal = selectedOrder ? selectedOrder.totalAmount : 0;
  const discountAmount = discountType === "percent" && discountValue
    ? Math.round(subtotal * Number(discountValue) / 100)
    : Number(discountValue) || 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  // Stats: tính trong ngày hôm nay
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const paidOrders = (orders || []).filter(o => {
    if (o.paymentStatus !== "Paid" || !o.paidAt) return false;
    const paidDate = new Date(o.paidAt);
    return paidDate >= todayStart && paidDate <= todayEnd;
  });

  const unpaidOrders = (orders || []).filter(o => o.status !== "Complete");

  const paidCount = paidOrders.length;
  const paidTotal = paidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const unpaidCount = unpaidOrders.length;
  const unpaidTotal = unpaidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const doneItemNames = useMemo(() => {
    if (!selectedOrder || !kitchenOrders) return new Set<string>();
    const done = new Set<string>();
    const kitchenOrder = kitchenOrders.find(ko => ko.orderId === selectedOrder.id);
    if (kitchenOrder) {
      kitchenOrder.items
        .filter(item => item.cookingStatus === "done")
        .forEach(item => done.add(item.name));
    }
    return done;
  }, [selectedOrder, kitchenOrders]);

  const handleAddItem = (menuItem: any, quantity: number = 1) => {
    if (!selectedTable) return;
    const newItem: OrderItem = { menuItemId: menuItem.id, name: menuItem.name, quantity, price: menuItem.price };

    const triggerSuccess = () => {
      try { navigator.vibrate?.(50); } catch { }
      playBeep();
    };

    if (selectedOrder) {
      const items = [...selectedOrder.items];
      const idx = items.findIndex(i => i.menuItemId === menuItem.id);
      if (idx >= 0) items[idx] = { ...items[idx], quantity: items[idx].quantity + quantity };
      else items.push(newItem);
      const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
      updateOrder.mutate({ id: selectedOrder.id, items, totalAmount: total }, {
        onSuccess: () => { sendToKitchen.mutate(selectedOrder.id); triggerSuccess(); }
      });
    } else {
      createOrder.mutate({
        tableNumber: selectedTable.toString(),
        items: [newItem],
        totalAmount: menuItem.price * quantity
      }, {
        onSuccess: (data) => { sendToKitchen.mutate(data.id); triggerSuccess(); }
      });
    }
  };

  const handleUpdateQuantity = (index: number, delta: number) => {
    if (!selectedOrder) return;
    const items = [...selectedOrder.items];
    const newQty = items[index].quantity + delta;
    if (newQty <= 0) { handleRemoveItem(index); return; }
    items[index] = { ...items[index], quantity: newQty };
    const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
    updateOrder.mutate({ id: selectedOrder.id, items, totalAmount: total });
  };

  const handleRemoveItem = (index: number) => {
    setDeleteItemIndex(index);
    setShowDeleteConfirm("item");
  };

  const confirmDeleteItem = () => {
    if (!selectedOrder || deleteItemIndex === null) return;

    const deletedItem = selectedOrder.items[deleteItemIndex];
    const items = [...selectedOrder.items];
    items.splice(deleteItemIndex, 1);

    if (items.length === 0) {
      confirmDeleteTable();
      return;
    }

    const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
    updateOrder.mutate({ id: selectedOrder.id, items, totalAmount: total });

    // Also remove from kitchen
    const kitchenOrder = kitchenOrders?.find(ko => ko.orderId === selectedOrder.id);
    if (kitchenOrder && deletedItem) {
      removeKitchenItem.mutate({
        kitchenOrderId: kitchenOrder.id,
        itemName: deletedItem.name,
        notes: deletedItem.notes
      });
    }

    setShowDeleteConfirm(null);
    setDeleteItemIndex(null);
  };

  const handleClearTable = async () => {
    if (!selectedOrder) return;
    setShowDeleteConfirm("table");
  };

  const confirmDeleteTable = async () => {
    if (!selectedOrder) return;
    await fetch(`/api/orders/${selectedOrder.id}`, {
      method: "DELETE",
      credentials: "include",
      headers: getAuthHeaders(),
    });
    await queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/kitchen"] });
    setSelectedTable(null);
    setShowDeleteConfirm(null);
  };

  const handlePay = (orderId: number) => {
    payOrder.mutate({ orderId, method: payMethod }, {
      onSuccess: (freshOrder) => {
        // Use the fresh order returned from the server directly
        if (freshOrder && freshOrder.id === orderId) {
          setShowReceipt(freshOrder);
        } else {
          // Fallback to cached data if something goes wrong
          const paidOrder = orders?.find(o => o.id === orderId);
          if (paidOrder) setShowReceipt(paidOrder);
        }
        setShowPayModal(null);
        setSelectedTable(null);
      }
    });
  };

  const handleRenameStart = (num: number) => {
    setRenamingTable(num);
    setRenameValue(tableNames[num] || `Bàn ${num}`);
  };

  const handleRenameCommit = (num: number) => {
    const trimmed = renameValue.trim();
    const updated = { ...tableNames };
    if (trimmed && trimmed !== `Bàn ${num}`) updated[num] = trimmed;
    else delete updated[num];
    saveTableNames(updated);
    setRenamingTable(null);
  };

  const handleMoveTable = (targetTable: number) => {
    if (!selectedOrder) return;
    fetch(`/api/orders/${selectedOrder.id}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ tableNumber: targetTable.toString() }),
      credentials: "include",
    }).then(async () => {
      // Refresh orders data
      await queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setShowMoveModal(null);
      // Tự động chọn bàn mới sau khi đổi
      setSelectedTable(targetTable);
    }).catch(err => {
      console.error("Move table failed:", err);
    });
  };

  const getDefaultMethods = () => [
    { id: "cash", label: "Tiền mặt", icon: "💵" },
    { id: "transfer", label: "Chuyển khoản", icon: "🏦" },
    { id: "vnpay", label: "VNPay", icon: "💳" },
    { id: "momo", label: "MoMo", icon: "📱" },
  ];

  const getMethodConfig = (methodId: string) => {
    const defaults = getDefaultMethods().find(m => m.id === methodId);
    const custom = paymentSettings?.find(p => p.method === methodId);
    return {
      id: methodId,
      label: custom?.label || defaults?.label || methodId,
      icon: custom?.icon || defaults?.icon || "💳",
      qrImageUrl: custom?.qrImageUrl || null,
      accountName: custom?.accountName || null,
      accountNumber: custom?.accountNumber || null,
      bankName: custom?.bankName || null,
      additionalInfo: custom?.additionalInfo || null,
      isEnabled: custom?.isEnabled ?? true,
    };
  };

  const openSettings = (method: string) => {
    const config = getMethodConfig(method);
    setSettingForm({
      label: config.label,
      icon: config.icon,
      qrImageUrl: config.qrImageUrl || "",
      accountName: config.accountName || "",
      accountNumber: config.accountNumber || "",
      bankName: config.bankName || "",
      additionalInfo: config.additionalInfo || "",
    });
    setEditingSetting(method);
  };

  const saveSettings = () => {
    if (editingSetting) {
      updatePaymentSetting.mutate({
        method: editingSetting,
        ...settingForm,
      });
      setEditingSetting(null);
    }
  };

  if (ordersLoading || menuLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Stats bar */}
      {/* Stats bar - only show when no table selected */}
      {!selectedTable && (
        <div className="grid grid-cols-3 gap-3 px-4 py-3.5 bg-[#f4f4f5]/60 flex-shrink-0">
          {/* Card Đã TT */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#4bae4f] text-white rounded-2xl p-3 flex flex-col justify-between h-[85px] relative shadow-sm"
          >
            <div className="flex justify-between items-start w-full">
              <span className="text-[9px] sm:text-[10px] font-bold text-white/90 uppercase tracking-wider">Đã TT</span>
              <DollarSign className="w-4 h-4 text-white/90 stroke-[2.5]" />
            </div>
            <div className="flex justify-between items-baseline w-full mt-auto gap-1">
              <span className="text-sm sm:text-base font-black text-white leading-none">{paidCount} bàn</span>
              <span className="text-[10px] sm:text-xs font-bold text-white/95 leading-none">{formatStatsPrice(paidTotal)}</span>
            </div>
          </motion.div>

          {/* Card Chưa TT */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-[#e2990f] text-white rounded-2xl p-3 flex flex-col justify-between h-[85px] relative shadow-sm"
          >
            <div className="flex justify-between items-start w-full">
              <span className="text-[9px] sm:text-[10px] font-bold text-white/90 uppercase tracking-wider">Chưa TT</span>
              <Clock className="w-4 h-4 text-white/90 stroke-[2.5]" />
            </div>
            <div className="flex justify-between items-baseline w-full mt-auto gap-1">
              <span className="text-sm sm:text-base font-black text-white leading-none">{unpaidCount} bàn</span>
              <span className="text-[10px] sm:text-xs font-bold text-white/95 leading-none">{formatStatsPrice(unpaidTotal)}</span>
            </div>
          </motion.div>

          {/* Card Tất Cả */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#4b5261] text-white rounded-2xl p-3 flex flex-col justify-between h-[85px] relative shadow-sm"
          >
            <div className="flex justify-between items-start w-full">
              <span className="text-[9px] sm:text-[10px] font-bold text-white/90 uppercase tracking-wider">Tất Cả</span>
              <TrendingUp className="w-4 h-4 text-white/90 stroke-[2.5]" />
            </div>
            <div className="flex justify-between items-baseline w-full mt-auto gap-1">
              <span className="text-sm sm:text-base font-black text-white leading-none">{paidCount + unpaidCount} bàn</span>
              <span className="text-[10px] sm:text-xs font-bold text-white/95 leading-none">{formatStatsPrice(paidTotal + unpaidTotal)}</span>
            </div>
          </motion.div>
        </div>
      )}
      {/* Table grid / Desktop split layout */}
      <div className="flex-1 min-h-0">
        <div className={selectedTable ? "hidden" : "block h-full overflow-y-auto"}>
          <TableGrid
            maxTables={MAX_TABLES}
            tableNames={tableNames}
            getActiveOrder={getActiveOrder}
            selectedTable={selectedTable}
            renamingTable={renamingTable}
            renameValue={renameValue}
            setRenameValue={setRenameValue}
            onSelectTable={setSelectedTable}
            onStartRename={(num, e) => { e.stopPropagation(); handleRenameStart(num); }}
            onCommitRename={handleRenameCommit}
          />
        </div>

        {selectedTable && (
          <>
            {/* Desktop split layout - hidden on mobile */}
            <div className="hidden md:flex h-full gap-4 bg-[#f5f6f8] p-4">
              <div className="flex-1 overflow-hidden">
                <MenuSection
                  menuItems={menuItems || []}
                  activeOrder={selectedOrder}
                  onAddItem={(item) => handleAddItem(item)}
                  onUpdateQuantity={handleUpdateQuantity}
                />
              </div>
              <OrderPanelDesktop
                selectedTable={selectedTable}
                tableNames={tableNames}
                activeOrder={selectedOrder}
                currentStatus={currentStatus}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
                onShowPayModal={() => selectedOrder && setShowPayModal(selectedOrder.id)}
                onShowMoveModal={() => selectedOrder && setShowMoveModal(selectedOrder.id)}
                onClose={() => setSelectedTable(null)}
                doneItemNames={doneItemNames}
                menuItems={menuItems || []}
                onSearchClick={() => setShowSearchModal(true)}
                showDiscount={showDiscount}
                setShowDiscount={setShowDiscount}
                discountType={discountType}
                setDiscountType={setDiscountType}
                discountValue={discountValue}
                setDiscountValue={setDiscountValue}
                discountAmount={discountAmount}
                finalTotal={finalTotal}
              />
            </div>

            {/* Mobile order view - shown on mobile, full screen */}
            <div className="md:hidden fixed inset-0 z-50 bg-white flex flex-col overflow-hidden">
              <MobileOrderView
                selectedTable={selectedTable}
                tableNames={tableNames}
                activeOrder={selectedOrder}
                currentStatus={currentStatus}
                doneItemNames={doneItemNames}
                menuItems={menuItems || []}
                onShowPayModal={() => selectedOrder && setShowPayModal(selectedOrder.id)}
                onShowMoveModal={() => selectedOrder && setShowMoveModal(selectedOrder.id)}
                onRemoveItem={handleRemoveItem}
                onUpdateQuantity={handleUpdateQuantity}
                onSearchClick={() => setShowSearchModal(true)}
                onClose={() => setSelectedTable(null)}
                showDiscount={showDiscount}
                setShowDiscount={setShowDiscount}
                discountType={discountType}
                setDiscountType={setDiscountType}
                discountValue={discountValue}
                setDiscountValue={setDiscountValue}
                discountAmount={discountAmount}
                finalTotal={finalTotal}
              />
            </div>
          </>
        )}
      </div>

      {/* Mobile only: Search modal */}
      <SearchMenuModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        menuItems={menuItems || []}
        onAddItem={(item) => handleAddItem(item)}
      />

      {/* Payment Modal */}
      <PaymentModal
        showPayModal={!!showPayModal}
        selectedTable={selectedTable}
        tableNames={tableNames}
        orderTotal={selectedOrder ? finalTotal : 0}
        paymentSettings={paymentSettings}
        payMethod={payMethod}
        setPayMethod={setPayMethod}
        onClose={() => setShowPayModal(null)}
        onConfirm={() => showPayModal && handlePay(showPayModal)}
        isPending={payOrder.isPending}
        onOpenSettings={() => { setShowPayModal(null); setShowSettingsModal(true); }}
      />

      {/* Move Table Modal */}
      <MoveTableModal
        showMoveModal={!!showMoveModal}
        selectedTable={selectedTable}
        maxTables={MAX_TABLES}
        orders={orders || []}
        onClose={() => setShowMoveModal(null)}
        onConfirm={handleMoveTable}
      />

      {/* Delete Confirmation Modal - cùng cấp với các modal khác */}
      <ConfirmDeleteModal
        isOpen={!!showDeleteConfirm}
        title={showDeleteConfirm === "table" ? "Xóa đơn bàn" : "Xóa món"}
        description={
          showDeleteConfirm === "table"
            ? "Bạn có chắc muốn xóa toàn bộ đơn hàng của bàn này? Hành động này không thể hoàn tác."
            : "Bạn có chắc muốn xóa món này khỏi đơn hàng?"
        }
        onClose={() => {
          setShowDeleteConfirm(null);
          setDeleteItemIndex(null);
        }}
        onConfirm={() => {
          if (showDeleteConfirm === "table") confirmDeleteTable();
          else if (showDeleteConfirm === "item") confirmDeleteItem();
        }}
      />

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettingsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowSettingsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-border max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-amber-500 tracking-wider">CÀI ĐẶT THANH TOÁN</h3>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="p-2.5 rounded-xl hover:bg-secondary text-gray-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {getDefaultMethods().map((method) => {
                  const config = getMethodConfig(method.id);
                  return (
                    <button
                      key={method.id}
                      onClick={() => openSettings(method.id)}
                      className={`p-4 rounded-xl border-2 transition-all text-left relative ${editingSetting === method.id
                        ? "border-amber-500 bg-amber-500/10 dark:bg-amber-950/20 text-amber-600"
                        : "border-border hover:border-amber-400/60"
                        }`}
                    >
                      <span className="text-2xl">{config.icon}</span>
                      <span className="block font-semibold mt-1">{config.label}</span>
                      {(config.qrImageUrl || config.accountNumber) && (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>

              {editingSetting && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">{getMethodConfig(editingSetting).icon}</span>
                    <h4 className="font-bold">Cài đặt: {getMethodConfig(editingSetting).label}</h4>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Tên hiển thị</label>
                    <input
                      type="text"
                      value={settingForm.label}
                      onChange={(e) => setSettingForm({ ...settingForm, label: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                      placeholder="VD: Chuyển khoản MB Bank"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Icon (emoji)</label>
                    <input
                      type="text"
                      value={settingForm.icon}
                      onChange={(e) => setSettingForm({ ...settingForm, icon: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                      placeholder="VD: 🏦"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">URL Ảnh QR</label>
                    <input
                      type="text"
                      value={settingForm.qrImageUrl}
                      onChange={(e) => setSettingForm({ ...settingForm, qrImageUrl: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                      placeholder="https://..."
                    />
                    {settingForm.qrImageUrl && (
                      <div className="mt-2">
                        <img src={settingForm.qrImageUrl} alt="Preview" className="h-24 rounded-lg border" onError={(e) => e.currentTarget.style.display = 'none'} />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Tên tài khoản</label>
                      <input
                        type="text"
                        value={settingForm.accountName}
                        onChange={(e) => setSettingForm({ ...settingForm, accountName: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                        placeholder="VD: NGUYEN VAN A"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Số tài khoản</label>
                      <input
                        type="text"
                        value={settingForm.accountNumber}
                        onChange={(e) => setSettingForm({ ...settingForm, accountNumber: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                        placeholder="VD: 1234567890"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Tên ngân hàng</label>
                    <input
                      type="text"
                      value={settingForm.bankName}
                      onChange={(e) => setSettingForm({ ...settingForm, bankName: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                      placeholder="VD: MB Bank"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Thông tin thêm</label>
                    <textarea
                      value={settingForm.additionalInfo}
                      onChange={(e) => setSettingForm({ ...settingForm, additionalInfo: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background resize-none h-20"
                      placeholder="VD: Nội dung chuyển khoản: Thanh toan ban..."
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setEditingSetting(null)}
                      className="flex-1 px-4 py-3 rounded-xl font-semibold bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={saveSettings}
                      disabled={updatePaymentSetting.isPending}
                      className="flex-1 px-4 py-3 rounded-xl font-black bg-amber-500 text-black hover:bg-amber-600 transition-colors disabled:opacity-50 tracking-wider"
                    >
                      {updatePaymentSetting.isPending ? "Đang lưu..." : "Lưu"}
                    </button>
                  </div>
                </div>
              )}

              {!editingSetting && (
                <p className="text-center text-muted-foreground text-sm">
                  Chọn phương thức thanh toán để cài đặt QR và thông tin tài khoản
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Receipt Modal */}
      <AnimatePresence>
        {showReceipt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowReceipt(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 shadow-2xl border-2 border-amber-200 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-black text-amber-500">HÓA ĐƠN</h3>
                <button
                  onClick={() => setShowReceipt(null)}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <Receipt order={showReceipt} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
