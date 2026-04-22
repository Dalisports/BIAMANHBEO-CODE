import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOrders, useCreateOrder, useUpdateOrder, usePayOrder, useUnpayOrder, usePaymentSettings, type Order, type OrderItem } from "@/hooks/use-orders";
import { useMenuItems } from "@/hooks/use-menu";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, cn } from "@/lib/utils";
import { format } from "date-fns";
import { 
  Plus, Minus, X, CreditCard, Loader2, Pencil, Check, AlertTriangle, Trash2, History, ChevronDown, ChevronRight
} from "lucide-react";

const TABLE_STATUS = {
  empty:   { label: "Trống",           bg: "bg-green-100",      border: "border-green-400",     text: "text-green-700",  strip: "bg-green-500"  },
  cooking: { label: "Đang phục vụ",    bg: "bg-orange-100", border: "border-orange-400", text: "text-orange-700", strip: "bg-orange-500" },
  ready:   { label: "Chờ thanh toán",  bg: "bg-blue-100",   border: "border-blue-400",   text: "text-blue-700",   strip: "bg-blue-500"   },
};

const QUICK_ITEMS = [
  { id: 100, name: "Cốc bia",  price: 6000 },
  { id: 101, name: "Ca bia",   price: 30000 },
  { id: 102, name: "Lạc rang",     price: 10000 },
];

const MAX_TABLES = 15;
const TABLE_NAMES_KEY = "tableNames";

function useTableNames() {
  const [tableNames, setTableNames] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings/tableNames", { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (data?.value) {
          try { setTableNames(JSON.parse(data.value)); } catch { setTableNames({}); }
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const saveTableNames = async (names: Record<number, string>) => {
    setTableNames(names);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "tableNames", value: JSON.stringify(names) }),
        credentials: "include",
      });
    } catch (err) {
      console.error("Failed to save table names:", err);
    }
  };

  return { tableNames, saveTableNames, isLoading };
}

function getActiveStatus(order: Order): keyof typeof TABLE_STATUS {
  if (order.status === "Ready") return "ready";
  return "cooking";
}

async function autoSendToKitchen(orderId: number) {
  await fetch(`/api/orders/${orderId}/send-to-kitchen`, { method: "POST", credentials: "include" });
}

async function autoSendToBar(orderId: number) {
  await fetch(`/api/orders/${orderId}/send-to-bar`, { method: "POST", credentials: "include" });
}

export default function Tables() {
  const { data: orders, isLoading: ordersLoading } = useOrders();
  const { data: menuItems, isLoading: menuLoading } = useMenuItems();
  const { data: paymentSettings } = usePaymentSettings();
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();
  const payOrder = usePayOrder();

  const { tableNames, saveTableNames } = useTableNames();
  const { isOwner } = useAuth();

  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [activeTableTab, setActiveTableTab] = useState<"order" | "history">("order");
  const [expandedHistoryOrders, setExpandedHistoryOrders] = useState<Set<number>>(new Set());
  const [searchMenu, setSearchMenu] = useState("");
  const [showPayModal, setShowPayModal] = useState<number | null>(null);
  const [showMoveModal, setShowMoveModal] = useState<number | null>(null);
  const [moveTargetTable, setMoveTargetTable] = useState<number | null>(null);
  const [payMethod, setPayMethod] = useState("cash");
  const [renamingTable, setRenamingTable] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showDeleteItemModal, setShowDeleteItemModal] = useState<number | null>(null);
  const [showClearTableModal, setShowClearTableModal] = useState(false);

  useEffect(() => {
    setActiveTableTab("order");
    setExpandedHistoryOrders(new Set());
  }, [selectedTable]);

  const getActiveOrder = (tableNum: number): Order | undefined =>
    orders?.find(o => o.tableNumber === tableNum.toString() && o.status !== "Complete");

  const getRecentPaidOrder = (tableNum: number): Order | undefined => {
    if (getActiveOrder(tableNum)) return undefined;
    return orders?.find(o =>
      o.tableNumber === tableNum.toString() &&
      o.status === "Complete" &&
      o.paymentStatus === "Paid"
    );
  };

  const getTablePaidHistory = (tableNum: number): Order[] => {
    return (orders || [])
      .filter(o =>
        o.tableNumber === tableNum.toString() &&
        o.status === "Complete" &&
        o.paymentStatus === "Paid"
      )
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, 20);
  };

  const getDefaultMethods = () => [
    { id: "cash",     label: "Tiền mặt",     icon: "💵" },
    { id: "transfer", label: "Chuyển khoản", icon: "🏦" },
    { id: "vnpay",    label: "VNPay",         icon: "💳" },
    { id: "momo",     label: "MoMo",          icon: "📱" },
  ];

  const getMethodConfig = (methodId: string) => {
    const defaults = getDefaultMethods().find(m => m.id === methodId);
    const custom = paymentSettings?.find((p: any) => p.method === methodId);
    return {
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

  const selectedOrder = selectedTable ? getActiveOrder(selectedTable) : undefined;
  const currentStatus: keyof typeof TABLE_STATUS = selectedOrder ? getActiveStatus(selectedOrder) : "empty";
  const statusInfo = TABLE_STATUS[currentStatus];

  const filteredMenuItems = menuItems?.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(searchMenu.toLowerCase());
    return matchSearch && item.isAvailable;
  }) || [];

  const tableName = (num: number) => tableNames[num] || `Bàn ${num}`;

  const startRename = (num: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingTable(num);
    setRenameValue(tableNames[num] || `Bàn ${num}`);
  };

  const commitRename = (num: number) => {
    const trimmed = renameValue.trim();
    const updated = { ...tableNames };
    if (trimmed && trimmed !== `Bàn ${num}`) updated[num] = trimmed;
    else delete updated[num];
    saveTableNames(updated);
    setRenamingTable(null);
  };

  const handleAddItem = (menuItem: any, quantity: number = 1) => {
    if (!selectedTable) return;
    const newItem: OrderItem = { menuItemId: menuItem.id, name: menuItem.name, quantity, price: menuItem.price };

    const routeToBar = menuItem.categoryId === 3;

    if (selectedOrder) {
      const items = [...selectedOrder.items];
      const idx = items.findIndex(i => i.menuItemId === menuItem.id);
      if (idx >= 0) items[idx] = { ...items[idx], quantity: items[idx].quantity + quantity };
      else items.push(newItem);
      const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
      updateOrder.mutate({ id: selectedOrder.id, items, totalAmount: total }, {
        onSuccess: () => routeToBar ? autoSendToBar(selectedOrder.id) : autoSendToKitchen(selectedOrder.id),
      });
    } else {
      createOrder.mutate({ tableNumber: selectedTable.toString(), items: [newItem], totalAmount: menuItem.price * quantity }, {
        onSuccess: (data: any) => { if (data?.id) routeToBar ? autoSendToBar(data.id) : autoSendToKitchen(data.id); },
      });
    }
  };

  const handleQuickAdd = (item: typeof QUICK_ITEMS[0]) => {
    if (!selectedTable) return;
    handleAddItem(item as any, 1);
  };

  const handleRemoveItem = (index: number) => {
    setShowDeleteItemModal(index);
  };

  const handleConfirmDeleteItem = () => {
    if (showDeleteItemModal === null || !selectedOrder) return;
    const items = [...selectedOrder.items];
    items.splice(showDeleteItemModal, 1);
    if (items.length === 0) {
      handleClearTable();
      return;
    }
    const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
    updateOrder.mutate({ id: selectedOrder.id, items, totalAmount: total });
    setShowDeleteItemModal(null);
  };

  const handleClearTable = async () => {
    if (!selectedOrder) return;
    await fetch(`/api/orders/${selectedOrder.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    setShowClearTableModal(false);
    setSelectedTable(null);
  };

  const handleMoveToTable = async (orderId: number, newTableNumber: string) => {
    await fetch(`/api/orders/${orderId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableNumber: newTableNumber }),
      credentials: "include",
    });
    setShowMoveModal(null);
    setMoveTargetTable(null);
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

  const toggleHistoryOrder = (id: number) => {
    setExpandedHistoryOrders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (ordersLoading || menuLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const allTables = Array.from({ length: MAX_TABLES }, (_, i) => i + 1);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">

      </div>

      

      {/* Table grid */}
      <div className="grid grid-cols-3 gap-3 overflow-y-auto">
        {allTables.map(tableNum => {
          const activeOrder = getActiveOrder(tableNum);
          const paidOrder = getRecentPaidOrder(tableNum);
          const status: keyof typeof TABLE_STATUS = activeOrder ? getActiveStatus(activeOrder) : "empty";
          const sc = TABLE_STATUS[status];
          const isSelected = selectedTable === tableNum;
          const isRenaming = renamingTable === tableNum;

          return (
            <motion.div
              key={tableNum}
              data-testid={`table-card-${tableNum}`}
              role="button"
              tabIndex={0}
              onClick={() => !isRenaming && setSelectedTable(tableNum)}
              onKeyDown={e => { if (e.key === "Enter" && !isRenaming) setSelectedTable(tableNum); }}
              className={cn(
                "bg-card rounded-2xl border border-border p-4 text-left hover:border-amber-400 hover:shadow-md transition-all group",
                isSelected && "ring-2 ring-amber-500 ring-offset-2"
              )}
            >
              {isRenaming ? (
                <div className="flex flex-col items-center gap-2 py-2" onClick={e => e.stopPropagation()}>
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") commitRename(tableNum);
                      if (e.key === "Escape") setRenamingTable(null);
                    }}
                    className="w-full text-center text-sm rounded-lg border-2 border-amber-400 px-2 py-1 bg-white outline-none"
                  />
                  <button
                    onClick={() => commitRename(tableNum)}
                    className="px-3 py-1 rounded-lg bg-amber-500 text-black text-xs font-bold"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", sc.bg)}>
                      <span className={cn("text-base font-bold", sc.text)}>{tableNum}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                  </div>
                  
                  {activeOrder ? (
                    <>
                      <p className={cn("text-lg font-black", sc.text)}>
                        {formatCurrency(activeOrder.totalAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {activeOrder.items?.length || 0} món
                      </p>
                    </>
                  ) : (
                    <span className="text-xs font-bold text-green-600">✓ Trống</span>
                  )}
                </>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Order detail modal */}
      <AnimatePresence>
        {selectedTable && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-[60] bg-background flex flex-col"
          >
            <div className="flex-1 max-w-2xl mx-auto w-full flex flex-col min-h-0">
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-3 flex-shrink-0 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <span className={cn("px-3 py-1 rounded-full text-sm font-bold border", statusInfo.bg, statusInfo.border, statusInfo.text)}>
                    {statusInfo.label}
                  </span>
                  <h3 className="text-xl font-bold">{tableName(selectedTable)}</h3>
                </div>
                <button
                  data-testid="close-table-modal"
                  onClick={() => setSelectedTable(null)}
                  className="p-2 rounded-lg hover:bg-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tab bar */}
              <div className="flex gap-1 px-4 pt-3 pb-0 flex-shrink-0">
                <button
                  onClick={() => setActiveTableTab("order")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-all",
                    activeTableTab === "order"
                      ? "bg-amber-500 text-black shadow-sm"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Plus className="w-4 h-4" />
                  Đặt Món
                </button>
                <button
                  onClick={() => setActiveTableTab("history")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-all",
                    activeTableTab === "history"
                      ? "bg-amber-500 text-black shadow-sm"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  <History className="w-4 h-4" />
                  Lịch Sử
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {activeTableTab === "order" && (
                  <>
                    {/* Current items */}
                    {selectedOrder && selectedOrder.items && selectedOrder.items.length > 0 && (
                      <div className="bg-card rounded-xl border p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-bold text-muted-foreground">
                            Đã đặt ({selectedOrder.items.length} món)
                          </h4>
                          {isOwner && (
                            <button
                              onClick={() => setShowClearTableModal(true)}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                              Xóa tất cả
                            </button>
                          )}
                        </div>
                        <div className="space-y-2">
                          {selectedOrder.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                              <button data-testid={`remove-item-${idx}`} onClick={() => handleRemoveItem(idx)} className="w-8 h-8 rounded bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200"><X className="w-4 h-4" /></button>
                              <div className="flex items-center gap-2 flex-1 px-2">
                                <span className="w-8 h-8 rounded bg-primary text-white flex items-center justify-center text-base font-bold">
                                  {item.quantity}
                                </span>
                                <span className="font-semibold text-base">{item.name}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-base font-semibold text-muted-foreground">
                                  {formatCurrency(item.price * item.quantity)}
                                </span>
                                <button data-testid={`qty-minus-${idx}`} onClick={() => handleUpdateQuantity(idx, -1)} className="w-8 h-8 rounded hover:bg-secondary flex items-center justify-center"><Minus className="w-4 h-4" /></button>
                                <button data-testid={`qty-plus-${idx}`} onClick={() => handleUpdateQuantity(idx, 1)} className="w-8 h-8 rounded hover:bg-secondary flex items-center justify-center"><Plus className="w-4 h-4" /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-2 border-t flex justify-between">
                          <span className="font-bold text-lg">Tổng cộng</span>
                          <span className="text-2xl font-bold text-red-600">{formatCurrency(selectedOrder.totalAmount)}</span>
                        </div>
                      </div>
                    )}

                    {/* Menu panel */}
                    <div className="bg-secondary/50 rounded-xl p-2">
                      <input
                        data-testid="search-menu"
                        type="text"
                        placeholder="Tìm món..."
                        value={searchMenu}
                        onChange={e => setSearchMenu(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-background border mb-2"
                      />
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        {QUICK_ITEMS.map(item => (
                          <button
                            key={item.id}
                            data-testid={`quick-item-${item.id}`}
                            onClick={() => handleQuickAdd(item)}
                            className="p-2 rounded-lg border-2 border-yellow-400 bg-yellow-50 hover:bg-yellow-100 text-center"
                          >
                            <p className="font-bold text-sm">{item.name}</p>
                            <p className="text-xs text-yellow-700 font-semibold">{formatCurrency(item.price)}</p>
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-2 h-[320px] overflow-y-auto">
                        {filteredMenuItems.map(item => (
                          <button
                            key={item.id}
                            data-testid={`menu-item-${item.id}`}
                            onClick={() => handleAddItem(item, 1)}
                            className="p-3 rounded-lg bg-background border hover:border-primary hover:bg-primary/5 transition-colors text-left flex items-center justify-center"
                          >
                            <p className="font-semibold text-base whitespace-normal text-center leading-tight">{item.name}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {activeTableTab === "history" && (() => {
                  const historyOrders = getTablePaidHistory(selectedTable);
                  const totalRevenue = historyOrders.reduce((s, o) => s + o.totalAmount, 0);

                  return (
                    <div className="space-y-3">
                      {/* Summary */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Tổng đơn</p>
                          <p className="text-2xl font-black text-amber-700">{historyOrders.length}</p>
                        </div>
                        <div className="bg-green-50 rounded-xl p-3 border border-green-200">
                          <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Tổng thu</p>
                          <p className="text-lg font-black text-green-700">{formatCurrency(totalRevenue)}</p>
                        </div>
                      </div>

                      {historyOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-3">
                            <History className="w-7 h-7 text-muted-foreground" />
                          </div>
                          <p className="font-semibold text-muted-foreground">Chưa có lịch sử thanh toán</p>
                          <p className="text-sm text-muted-foreground mt-1">Các đơn đã thanh toán sẽ hiển thị ở đây</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {(() => {
                            const groupedOrders = historyOrders.reduce((groups, order) => {
                              const date = order.createdAt ? format(new Date(order.createdAt), "yyyy-MM-dd") : "unknown";
                              if (!groups[date]) {
                                groups[date] = [];
                              }
                              groups[date].push(order);
                              return groups;
                            }, {} as Record<string, typeof historyOrders>);
                            
                            return Object.entries(groupedOrders).sort(([a], [b]) => b.localeCompare(a)).map(([date, orders]) => {
                              const orderDate = date === "unknown" ? null : new Date(date);
                              const dayNames = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
                              const dayName = orderDate ? dayNames[orderDate.getDay()] : "Không rõ ngày";
                              const displayDate = orderDate 
                                ? `${dayName} | Ngày ${format(orderDate, "dd/MM/yyyy")}`
                                : "Không rõ ngày";
                              const isToday = date === format(new Date(), "yyyy-MM-dd");
                              const yesterday = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");
                              const dateLabel = isToday ? "Hôm nay" : date === yesterday ? "Hôm qua" : displayDate;
                              
                              return (
                                <div key={date}>
                                  <div className="sticky top-0 bg-background py-2 flex items-center gap-2 z-10">
                                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{dateLabel}</span>
                                    <div className="h-px flex-1 bg-border" />
                                    <span className="text-xs font-bold text-amber-600">
                                      {formatCurrency(orders.reduce((s, o) => s + o.totalAmount, 0))}
                                    </span>
                                  </div>
                                  <div className="space-y-2">
                                    {(orders as typeof historyOrders).map((order) => {
                                      const isExpanded = expandedHistoryOrders.has(order.id);
                                      return (
                                        <div key={order.id} className="bg-card rounded-xl border border-border overflow-hidden">
                                          <button
                                            className="w-full flex items-center justify-between p-3 hover:bg-secondary/50 transition-colors"
                                            onClick={() => toggleHistoryOrder(order.id)}
                                          >
                                            <div className="flex items-center gap-3 text-left">
                                              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                                                <CreditCard className="w-5 h-5 text-green-600" />
                                              </div>
                                              <div>
                                                <p className="font-bold text-sm text-green-600">{formatCurrency(order.totalAmount)}</p>
                                                <p className="text-xs text-muted-foreground">
                                                  {order.createdAt ? format(new Date(order.createdAt), "HH:mm") : "—"}
                                                  {order.paymentMethod && ` · ${order.paymentMethod === "cash" ? "Tiền mặt" : order.paymentMethod === "transfer" ? "Chuyển khoản" : order.paymentMethod}`}
                                                </p>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs text-muted-foreground">{(order.items as any[]).length} món</span>
                                              {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                                            </div>
                                          </button>
                                          <AnimatePresence>
                                            {isExpanded && (
                                              <motion.div
                                                initial={{ height: 0 }}
                                                animate={{ height: "auto" }}
                                                exit={{ height: 0 }}
                                                className="overflow-hidden border-t border-border"
                                              >
                                                <div className="p-3 bg-secondary/20 space-y-1.5">
                                                  {(order.items as any[]).map((item: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between items-center text-sm">
                                                      <span className="flex items-center gap-2">
                                                        <span className="w-5 h-5 rounded bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{item.quantity}</span>
                                                        <span>{item.name}</span>
                                                      </span>
                                                      <span className="text-muted-foreground text-xs">{formatCurrency(item.price * item.quantity)}</span>
                                                    </div>
                                                  ))}
                                                </div>
                                              </motion.div>
                                            )}
                                          </AnimatePresence>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Sticky action buttons - always visible at bottom */}
              {activeTableTab === "order" && selectedOrder && (
                <div className="flex gap-2 px-4 pt-3 pb-safe-or-4 flex-shrink-0 border-t border-border/50 bg-background"
                  style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))" }}
                >
                  <button
                    onClick={() => setShowMoveModal(selectedOrder.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                  >
                    <span className="text-lg">🔄</span>
                    Đổi Bàn
                  </button>
                  {(currentStatus === "ready" || currentStatus === "cooking") && (
                    <button
                      data-testid="pay-order-btn"
                      onClick={() => setShowPayModal(selectedOrder.id)}
                      disabled={createOrder.isPending || updateOrder.isPending || payOrder.isPending}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50"
                    >
                      <CreditCard className="w-4 h-4" />
                      Thanh Toán
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment modal */}
      <AnimatePresence>
        {showPayModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowPayModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card w-full max-w-sm rounded-3xl p-6 shadow-2xl border-2 border-green-200 max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black text-green-500">THANH TOÁN</h3>
                <button
                  data-testid="close-pay-modal"
                  onClick={() => setShowPayModal(null)}
                  className="p-2 rounded-full hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 p-4 bg-green-50 rounded-xl border-2 border-green-200">
                <p className="text-sm text-muted-foreground">{tableName(selectedTable!)}</p>
                <p className="text-2xl font-black text-green-600">
                  {formatCurrency(selectedOrder?.totalAmount || 0)}
                </p>
              </div>

              <h4 className="text-sm font-bold mb-3">Chọn phương thức:</h4>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {getDefaultMethods().filter(m => getMethodConfig(m.id).isEnabled).map(method => {
                  const config = getMethodConfig(method.id);
                  return (
                    <button
                      key={method.id}
                      data-testid={`pay-method-${method.id}`}
                      onClick={() => setPayMethod(method.id)}
                      className={cn(
                        "p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-colors",
                        payMethod === method.id
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-border hover:border-green-300"
                      )}
                    >
                      <span className="text-xl">{config.icon}</span>
                      <span className="text-sm font-bold">{config.label}</span>
                    </button>
                  );
                })}
              </div>

              {payMethod !== "cash" && (() => {
                const config = getMethodConfig(payMethod);
                return (
                  <div className="mb-4 p-4 bg-secondary/50 rounded-xl">
                    {config.qrImageUrl ? (
                      <div className="text-center">
                        <p className="text-sm font-semibold mb-3 text-muted-foreground">Quét mã QR</p>
                        <img src={config.qrImageUrl} alt="QR Code" className="max-h-32 mx-auto rounded-lg" />
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground text-sm">
                        <p>Chưa cài đặt mã QR cho phương thức này.</p>
                      </div>
                    )}
                    {config.accountName && (
                      <div className="mt-3 text-sm space-y-1 text-center">
                        <p className="font-semibold">{config.accountName}</p>
                        {config.accountNumber && <p>Số TK: <span className="font-mono font-bold">{config.accountNumber}</span></p>}
                        {config.bankName && <p className="text-muted-foreground">{config.bankName}</p>}
                        {config.additionalInfo && <p className="text-muted-foreground">{config.additionalInfo}</p>}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex gap-3">
                <button
                  data-testid="cancel-pay"
                  onClick={() => setShowPayModal(null)}
                  className="flex-1 px-4 py-3 rounded-xl font-bold bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                >
                  Hủy
                </button>
                <button
                  data-testid="confirm-pay"
                  onClick={() => {
                    if (showPayModal) {
                      payOrder.mutate({ orderId: showPayModal, method: payMethod }, {
                        onSuccess: () => {
                          setShowPayModal(null);
                          setSelectedTable(null);
                        },
                      });
                    }
                  }}
                  disabled={payOrder.isPending}
                  className="flex-1 px-4 py-3 rounded-xl font-bold bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {payOrder.isPending ? "Đang xử lý..." : "Xác nhận thanh toán"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Move table modal */}
      <AnimatePresence>
        {showMoveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => { setShowMoveModal(null); setMoveTargetTable(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card w-full max-w-sm rounded-3xl p-6 shadow-2xl border-2 border-blue-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black text-blue-500">ĐỔI BÀN</h3>
                <button
                  onClick={() => { setShowMoveModal(null); setMoveTargetTable(null); }}
                  className="p-2 rounded-full hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-muted-foreground mb-4">Chọn bàn muốn chuyển đến:</p>

              <div className="grid grid-cols-4 gap-2 mb-6">
                {Array.from({ length: MAX_TABLES }, (_, i) => i + 1).map(num => {
                  const hasOrder = !!getActiveOrder(num);
                  return (
                    <button
                      key={num}
                      onClick={() => setMoveTargetTable(num)}
                      disabled={hasOrder}
                      className={cn(
                        "p-3 rounded-xl border-2 font-bold transition-colors",
                        moveTargetTable === num
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : hasOrder
                            ? "border-red-300 bg-red-50 text-red-400 cursor-not-allowed"
                            : "border-border hover:border-blue-300"
                      )}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowMoveModal(null); setMoveTargetTable(null); }}
                  className="flex-1 px-4 py-3 rounded-xl font-bold bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    if (showMoveModal && moveTargetTable) {
                      handleMoveToTable(showMoveModal, moveTargetTable.toString());
                    }
                  }}
                  disabled={!moveTargetTable}
                  className="flex-1 px-4 py-3 rounded-xl font-bold bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  Xác nhận
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Item Confirmation Modal */}
      <AnimatePresence>
        {showDeleteItemModal !== null && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDeleteItemModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card w-full max-w-sm rounded-3xl p-6 shadow-2xl border-2 border-red-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
              </div>
              <h3 className="text-xl font-black text-center mb-2">XÁC NHẬN XÓA</h3>
              <p className="text-center text-muted-foreground mb-6">
                Bạn có chắc muốn xóa món <span className="font-bold text-foreground">{selectedOrder.items[showDeleteItemModal]?.name}</span> khỏi đơn hàng?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteItemModal(null)}
                  className="flex-1 px-4 py-3 rounded-xl font-bold bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmDeleteItem}
                  className="flex-1 px-4 py-3 rounded-xl font-bold bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 transition-colors"
                >
                  Xóa
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clear Table Confirmation Modal */}
      <AnimatePresence>
        {showClearTableModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowClearTableModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card w-full max-w-sm rounded-3xl p-6 shadow-2xl border-2 border-red-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
              </div>
              <h3 className="text-xl font-black text-center mb-2">XÓA TẤT CẢ</h3>
              <p className="text-center text-muted-foreground mb-2">
                Bạn có chắc muốn xóa tất cả các món trong đơn hàng này?
              </p>
              <p className="text-center text-sm text-red-500 mb-6">
                Bàn sẽ được trả về trạng thái "TRỐNG"
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearTableModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-bold bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleClearTable}
                  className="flex-1 px-4 py-3 rounded-xl font-bold bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 transition-colors"
                >
                  Xóa tất cả
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
