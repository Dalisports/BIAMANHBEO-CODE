import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOrders, useCreateOrder, useUpdateOrder, usePayOrder, useUnpayOrder, usePaymentSettings, type Order, type OrderItem } from "@/hooks/use-orders";
import { useMenuItems } from "@/hooks/use-menu";
import { formatCurrency, cn } from "@/lib/utils";
import { 
  Plus, Minus, X, CreditCard, Loader2, Pencil, Check
} from "lucide-react";

const TABLE_STATUS = {
  empty:   { label: "Trống",           bg: "bg-green-50",  border: "border-green-300",  text: "text-green-700"  },
  cooking: { label: "Đang nấu",        bg: "bg-red-50",    border: "border-red-400",    text: "text-red-700"    },
  ready:   { label: "Chờ thanh toán",  bg: "bg-blue-50",   border: "border-blue-400",   text: "text-blue-700"   },
};

const QUICK_ITEMS = [
  { id: 100, name: "Cốc bia",  price: 15000 },
  { id: 101, name: "Ca bia",   price: 25000 },
  { id: 102, name: "Lạc",      price: 20000 },
];

const MAX_TABLES = 12;
const TABLE_NAMES_KEY = "soi_table_names";

function loadTableNames(): Record<number, string> {
  try { return JSON.parse(localStorage.getItem(TABLE_NAMES_KEY) || "{}"); }
  catch { return {}; }
}
function saveTableNames(n: Record<number, string>) {
  localStorage.setItem(TABLE_NAMES_KEY, JSON.stringify(n));
}

function getActiveStatus(order: Order): keyof typeof TABLE_STATUS {
  if (order.status === "Ready") return "ready";
  return "cooking";
}

async function autoSendToKitchen(orderId: number) {
  await fetch(`/api/orders/${orderId}/send-to-kitchen`, { method: "POST", credentials: "include" });
}

export default function Tables() {
  const { data: orders, isLoading: ordersLoading } = useOrders();
  const { data: menuItems, isLoading: menuLoading } = useMenuItems();
  const { data: paymentSettings } = usePaymentSettings();
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();
  const payOrder = usePayOrder();
  const unpayOrder = useUnpayOrder();

  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [searchMenu, setSearchMenu] = useState("");
  const [showPayModal, setShowPayModal] = useState<number | null>(null);
  const [payMethod, setPayMethod] = useState("cash");
  const [tableNames, setTableNames] = useState<Record<number, string>>(loadTableNames);
  const [renamingTable, setRenamingTable] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Active order: non-complete (pending/in-kitchen/ready)
  const getActiveOrder = (tableNum: number): Order | undefined =>
    orders?.find(o => o.tableNumber === tableNum.toString() && o.status !== "Complete");

  // Most recent paid order (Complete+Paid), only if no active order
  const getRecentPaidOrder = (tableNum: number): Order | undefined => {
    if (getActiveOrder(tableNum)) return undefined;
    return orders?.find(o =>
      o.tableNumber === tableNum.toString() &&
      o.status === "Complete" &&
      o.paymentStatus === "Paid"
    );
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
    setTableNames(updated);
    saveTableNames(updated);
    setRenamingTable(null);
  };

  const handleAddItem = (menuItem: any, quantity: number = 1) => {
    if (!selectedTable) return;
    const newItem: OrderItem = { menuItemId: menuItem.id, name: menuItem.name, quantity, price: menuItem.price };

    if (selectedOrder) {
      const items = [...selectedOrder.items];
      const idx = items.findIndex(i => i.menuItemId === menuItem.id);
      if (idx >= 0) items[idx] = { ...items[idx], quantity: items[idx].quantity + quantity };
      else items.push(newItem);
      const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
      updateOrder.mutate({ id: selectedOrder.id, items, totalAmount: total }, {
        onSuccess: () => autoSendToKitchen(selectedOrder.id),
      });
    } else {
      createOrder.mutate({ tableNumber: selectedTable.toString(), items: [newItem], totalAmount: menuItem.price * quantity }, {
        onSuccess: (data: any) => { if (data?.id) autoSendToKitchen(data.id); },
      });
    }
  };

  const handleQuickAdd = (item: typeof QUICK_ITEMS[0]) => {
    if (!selectedTable) return;
    handleAddItem(item as any, 1);
  };

  const handleRemoveItem = (index: number) => {
    if (!selectedOrder) return;
    const items = [...selectedOrder.items];
    items.splice(index, 1);
    if (items.length === 0) return;
    const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
    updateOrder.mutate({ id: selectedOrder.id, items, totalAmount: total });
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

  const handleUnpayFromCard = (e: React.MouseEvent, orderId: number) => {
    e.stopPropagation();
    unpayOrder.mutate(orderId);
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
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-foreground">Quản lý Bàn</h2>
        <p className="text-sm text-muted-foreground">Chọn bàn để thêm / xem món</p>
      </div>

      <div className="grid grid-cols-3 gap-3 overflow-y-auto pr-1">
        {Array.from({ length: MAX_TABLES }, (_, i) => i + 1).map(tableNum => {
          const activeOrder = getActiveOrder(tableNum);
          const paidOrder = getRecentPaidOrder(tableNum);
          const status: keyof typeof TABLE_STATUS = activeOrder ? getActiveStatus(activeOrder) : "empty";
          const sc = TABLE_STATUS[status];
          const isSelected = selectedTable === tableNum;
          const isRenaming = renamingTable === tableNum;

          return (
            <div
              key={tableNum}
              data-testid={`table-card-${tableNum}`}
              role="button"
              tabIndex={0}
              onClick={() => !isRenaming && setSelectedTable(tableNum)}
              onKeyDown={e => { if (e.key === "Enter" && !isRenaming) setSelectedTable(tableNum); }}
              className={cn(
                "aspect-square rounded-xl border-2 flex flex-col items-center justify-center transition-all duration-200 p-2 relative group cursor-pointer select-none",
                isSelected ? "ring-2 ring-primary ring-offset-2 shadow-lg" : "hover:scale-105 hover:shadow-md",
                sc.bg, sc.border
              )}
            >
              {isRenaming ? (
                <div className="flex flex-col items-center gap-1 w-full px-1" onClick={e => e.stopPropagation()}>
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") commitRename(tableNum);
                      if (e.key === "Escape") setRenamingTable(null);
                    }}
                    className="w-full text-center text-sm rounded border px-1 py-0.5 bg-white"
                  />
                  <button
                    onClick={() => commitRename(tableNum)}
                    className="p-1 rounded bg-primary text-white"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-base font-bold leading-tight text-center">{tableName(tableNum)}</span>

                  {activeOrder && (
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-white/70 mt-1">
                      {activeOrder.items?.length || 0} món
                    </span>
                  )}

                  {!activeOrder && paidOrder && (
                    <button
                      data-testid={`unpay-card-${tableNum}`}
                      onClick={e => handleUnpayFromCard(e, paidOrder.id)}
                      disabled={unpayOrder.isPending}
                      className="absolute bottom-1 left-1 right-1 flex items-center justify-center gap-1 px-1 py-0.5 rounded bg-orange-100 border border-orange-300 text-orange-700 text-[9px] font-medium hover:bg-orange-200 transition-colors disabled:opacity-50"
                    >
                      Hoàn tác TT
                    </button>
                  )}

                  <button
                    data-testid={`rename-table-${tableNum}`}
                    onClick={e => startRename(tableNum, e)}
                    className="absolute top-1 right-1 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-white/60 transition-opacity"
                  >
                    <Pencil className="w-3 h-3 text-gray-500" />
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Order detail modal */}
      <AnimatePresence>
        {selectedTable && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm p-4 flex flex-col"
          >
            <div className="flex-1 max-w-2xl mx-auto w-full flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={cn("px-3 py-1 rounded-full text-sm font-bold border", statusInfo.bg, statusInfo.border, statusInfo.text)}>
                    {statusInfo.label}
                  </span>
                  <h3 className="text-2xl font-bold">{tableName(selectedTable)}</h3>
                </div>
                <button
                  data-testid="close-table-modal"
                  onClick={() => setSelectedTable(null)}
                  className="p-2 rounded-lg hover:bg-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Current items */}
              {selectedOrder && selectedOrder.items && selectedOrder.items.length > 0 && (
                <div className="bg-card rounded-xl border p-3 flex-shrink-0 max-h-[300px] overflow-y-auto">
                  <h4 className="text-sm font-bold text-muted-foreground mb-2">
                    Đã đặt ({selectedOrder.items.length} món)
                  </h4>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                            {item.quantity}
                          </span>
                          <span className="font-medium text-sm">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                          <button data-testid={`qty-minus-${idx}`} onClick={() => handleUpdateQuantity(idx, -1)} className="w-6 h-6 rounded hover:bg-secondary flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                          <button data-testid={`qty-plus-${idx}`} onClick={() => handleUpdateQuantity(idx, 1)} className="w-6 h-6 rounded hover:bg-secondary flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                          <button data-testid={`remove-item-${idx}`} onClick={() => handleRemoveItem(idx)} className="w-6 h-6 rounded bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200"><X className="w-3 h-3" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-2 border-t flex justify-between">
                    <span className="font-bold">Tổng cộng</span>
                    <span className="text-xl font-bold text-accent">{formatCurrency(selectedOrder.totalAmount)}</span>
                  </div>
                </div>
              )}

              {/* Menu panel */}
              <div className="bg-secondary/50 rounded-xl p-2 flex-shrink-0">
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
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto">
                  {filteredMenuItems.map(item => (
                    <button
                      key={item.id}
                      data-testid={`menu-item-${item.id}`}
                      onClick={() => handleAddItem(item, 1)}
                      className="p-2 rounded-lg bg-background border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                    >
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(item.price)}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pay button */}
              <div className="flex gap-2 flex-shrink-0">
                {selectedOrder && (currentStatus === "ready" || currentStatus === "cooking") && (
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
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowPayModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card w-full max-w-sm rounded-3xl p-6 shadow-2xl border-2 border-green-200"
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
                {getDefaultMethods().map(method => (
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
                    <span className="text-xl">{method.icon}</span>
                    <span className="text-sm font-bold">{method.label}</span>
                  </button>
                ))}
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
                      <div className="mt-3 text-sm space-y-1">
                        <p className="font-semibold">{config.accountName}</p>
                        {config.accountNumber && <p>Số tài khoản: {config.accountNumber}</p>}
                        {config.bankName && <p>Ngân hàng: {config.bankName}</p>}
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
    </div>
  );
}
