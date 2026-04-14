import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOrders, useSendToKitchen, usePayOrder, useDeleteOrder, usePaymentSettings, useUpdatePaymentSetting, useUpdateOrder, type OrderItem } from "@/hooks/use-orders";
import { formatCurrency, cn } from "@/lib/utils";
import { 
  CheckCircle2, Clock, Loader2, Receipt, Trash2, ChevronDown, 
  Send, CreditCard, Users, Phone, StickyNote, AlertCircle, Settings, X, Image, Copy, Edit2, Plus, Minus
} from "lucide-react";

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Pending: { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-400" },
  InKitchen: { bg: "bg-red-100", text: "text-red-700", border: "border-red-400" },
  Ready: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-400" },
  Complete: { bg: "bg-green-100", text: "text-green-700", border: "border-green-400" },
};

const STATUS_LABELS: Record<string, string> = {
  Pending: "CHƯA XỬ LÝ",
  InKitchen: "ĐANG NẤU",
  Ready: "CHƯA THANH TOÁN",
  Complete: "ĐÃ THANH TOÁN",
};

const TAB_COLORS: Record<string, { active: string; hover: string }> = {
  Pending: { active: "bg-yellow-400 text-black", hover: "hover:bg-yellow-100 hover:text-yellow-700" },
  InKitchen: { active: "bg-red-500 text-white", hover: "hover:bg-red-100 hover:text-red-700" },
  Ready: { active: "bg-blue-500 text-white", hover: "hover:bg-blue-100 hover:text-blue-700" },
  Complete: { active: "bg-green-500 text-white", hover: "hover:bg-green-100 hover:text-green-700" },
};

const isToday = (date: Date | string | null) => {
  if (!date) return false;
  const d = new Date(date);
  const today = new Date();
  return d.toDateString() === today.toDateString();
};

export default function Orders() {
  const { data: orders, isLoading } = useOrders();
  const { data: paymentSettings } = usePaymentSettings();
  const sendToKitchen = useSendToKitchen();
  const payOrder = usePayOrder();
  const deleteOrder = useDeleteOrder();
  const updatePaymentSetting = useUpdatePaymentSetting();
  const updateOrder = useUpdateOrder();
  const [filter, setFilter] = useState<string>("All");
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());
  const [showPayModal, setShowPayModal] = useState<number | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [editingSetting, setEditingSetting] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    customerName: "",
    phone: "",
    notes: "",
    items: [] as OrderItem[],
  });
  const [settingForm, setSettingForm] = useState({
    label: "",
    icon: "",
    qrImageUrl: "",
    accountName: "",
    accountNumber: "",
    bankName: "",
    additionalInfo: "",
  });

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

  const filteredOrders = orders?.filter(o => {
    const isTodayOrder = isToday(o.createdAt);
    if (filter === "All") return isTodayOrder;
    return isTodayOrder && o.status === filter;
  });

  const toggleOrder = (id: number) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSendToKitchen = (orderId: number) => {
    sendToKitchen.mutate(orderId);
  };

  const handlePay = (orderId: number) => {
    payOrder.mutate({ orderId, method: paymentMethod }, {
      onSuccess: () => setShowPayModal(null)
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc muốn xóa đơn này?")) {
      deleteOrder.mutate(id);
    }
  };

  const handleOpenEdit = (order: any) => {
    setEditingOrder(order);
    setEditForm({
      customerName: order.customerName || "",
      phone: order.phone || "",
      notes: order.notes || "",
      items: [...order.items],
    });
  };

  const handleUpdateItemQuantity = (index: number, delta: number) => {
    const newItems = [...editForm.items];
    newItems[index] = { ...newItems[index], quantity: Math.max(1, newItems[index].quantity + delta) };
    setEditForm({ ...editForm, items: newItems });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = editForm.items.filter((_, i) => i !== index);
    setEditForm({ ...editForm, items: newItems });
  };

  const handleSaveEdit = () => {
    if (!editingOrder) return;
    const newTotalAmount = editForm.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    updateOrder.mutate({
      id: editingOrder.id,
      customerName: editForm.customerName,
      phone: editForm.phone,
      notes: editForm.notes,
      items: editForm.items,
      totalAmount: newTotalAmount,
    }, {
      onSuccess: () => setEditingOrder(null),
    });
  };

  const activeOrders = orders?.filter(o => ["Pending", "InKitchen", "Ready"].includes(o.status)) || [];

  return (
    <div className="h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-orange-100 text-orange-700 font-semibold">
            <span className="text-2xl">{activeOrders.length}</span> đơn đang xử lý
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {["All", "Pending", "InKitchen", "Ready", "Complete"].map((f) => {
          const colors = TAB_COLORS[f];
          const isPending = f === "Pending";
          
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 relative",
                filter === f && colors 
                  ? colors.active + " shadow-md" 
                  : colors 
                    ? "bg-secondary " + colors.hover
                    : "bg-secondary text-muted-foreground hover:text-foreground",
                isPending && filter !== f && "animate-pulse"
              )}
            >
              {f === "All" ? "Tất cả" : STATUS_LABELS[f] || f}
            </button>
          );
        })}
        <button
          onClick={() => setShowSettingsModal(true)}
          className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 transition-all duration-200 flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          Cài đặt thanh toán
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : !filteredOrders?.length ? (
        <div className="flex flex-col items-center justify-center py-24 text-center px-4 bg-card rounded-3xl border border-border border-dashed">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground mb-4">
            <Receipt className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Chưa có đơn hàng nào</h3>
          <p className="text-muted-foreground max-w-sm">Sử dụng trợ lý AI: "Order bàn 5: 2 gà rán, 1 cocacola"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredOrders.map((order, i) => {
            const isExpanded = expandedOrders.has(order.id);
            const itemCount = (order.items as any[]).length;
            const colors = STATUS_COLORS[order.status] || STATUS_COLORS.Pending;
            const isPaid = order.paymentStatus === "Paid";
            
            return (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                key={order.id}
                className={cn(
                  "bg-card rounded-3xl border-2 transition-all duration-300 hover:shadow-xl",
                  colors.border,
                  order.status === "Pending" && "animate-pulse shadow-lg shadow-yellow-400/50"
                )}
              >
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-foreground">Bàn {order.tableNumber}</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1",
                          colors.bg, colors.text
                        )}>
                          {isPaid ? <CreditCard className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {isPaid ? "ĐÃ THANH TOÁN" : STATUS_LABELS[order.status]}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(order)}
                        className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(order.id)}
                        className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div 
                    className="flex items-center justify-between cursor-pointer py-2 border-t border-b border-border/50"
                    onClick={() => toggleOrder(order.id)}
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">{itemCount} món</span>
                      <span className="text-xs text-muted-foreground">
                        ({(order.items as any[]).slice(0, 2).map((item: any) => `${item.name} x${item.quantity}`).join(", ")}
                        {itemCount > 2 ? ` +${itemCount - 2}` : ""})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-accent">{formatCurrency(order.totalAmount)}</span>
                      <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 space-y-3">
                          <div className="bg-background rounded-xl p-3 border border-border/50">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Chi tiết món</h4>
                            <ul className="space-y-2">
                              {(order.items as any[]).map((item: any, idx: number) => (
                                <li key={idx} className="flex justify-between items-center text-sm">
                                  <span className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{item.quantity}</span>
                                    {item.name}
                                    {item.notes && <span className="text-xs text-muted-foreground">({item.notes})</span>}
                                  </span>
                                  <span className="text-muted-foreground">{formatCurrency(item.price * item.quantity)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {order.notes && (
                            <div className="flex items-start gap-2 text-sm text-muted-foreground bg-yellow-50 rounded-xl p-3">
                              <StickyNote className="w-4 h-4 mt-0.5" />
                              <span>{order.notes}</span>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2">
                            {order.status === "Pending" && (
                              <button
                                onClick={() => handleSendToKitchen(order.id)}
                                disabled={sendToKitchen.isPending}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50"
                              >
                                <Send className="w-4 h-4" />
                                Gửi Bếp
                              </button>
                            )}
                            
                            {!isPaid && order.status !== "Complete" && (
                              <button
                                onClick={() => setShowPayModal(order.id)}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold bg-green-500 text-white hover:bg-green-600 transition-colors"
                              >
                                <CreditCard className="w-4 h-4" />
                                Thanh Toán
                              </button>
                            )}

                            {order.paidAt && (
                              <div className="w-full text-center text-xs text-green-600 font-medium">
                                Đã thanh toán lúc {new Date(order.paidAt).toLocaleTimeString("vi-VN")}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showPayModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowPayModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card w-full max-w-md rounded-3xl p-6 shadow-2xl border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold mb-6">Chọn phương thức thanh toán</h3>
              
              <div className="grid grid-cols-2 gap-3 mb-6">
                {getDefaultMethods().map((defaultMethod) => {
                  const config = getMethodConfig(defaultMethod.id);
                  return (
                    <button
                      key={defaultMethod.id}
                      onClick={() => setPaymentMethod(defaultMethod.id)}
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all text-left relative",
                        paymentMethod === defaultMethod.id 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <span className="text-2xl">{config.icon}</span>
                      <span className="block font-semibold mt-1">{config.label}</span>
                      {config.qrImageUrl && paymentMethod === defaultMethod.id && (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>

              {paymentMethod !== "cash" && (() => {
                const config = getMethodConfig(paymentMethod);
                return (
                  <div className="mb-6 p-4 bg-secondary/50 rounded-xl">
                    {config.qrImageUrl ? (
                      <div className="text-center">
                        <p className="text-sm font-semibold mb-3 text-muted-foreground">Quét mã QR</p>
                        <img 
                          src={config.qrImageUrl} 
                          alt="QR Code" 
                          className="max-h-48 mx-auto rounded-lg"
                        />
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground text-sm">
                        <p>Chưa cài đặt mã QR cho phương thức này.</p>
                        <button
                          onClick={() => { setShowPayModal(null); setShowSettingsModal(true); openSettings(paymentMethod); }}
                          className="mt-2 text-primary underline text-xs"
                        >
                          Cài đặt ngay
                        </button>
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
                  onClick={() => setShowPayModal(null)}
                  className="flex-1 px-4 py-3 rounded-xl font-semibold bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={() => handlePay(showPayModal)}
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

      <AnimatePresence>
        {showSettingsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
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
                <h3 className="text-2xl font-bold">Cài đặt thanh toán</h3>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
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
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all text-left relative",
                        editingSetting === method.id 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      )}
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
                      className="flex-1 px-4 py-3 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
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

      <AnimatePresence>
        {editingOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            onClick={() => setEditingOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-border max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Sửa Đơn Hàng</h3>
                <button
                  onClick={() => setEditingOrder(null)}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-primary/10 rounded-xl p-3 text-center">
                  <span className="text-sm text-muted-foreground">Bàn {editingOrder.tableNumber}</span>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Tên khách hàng</label>
                  <input
                    type="text"
                    value={editForm.customerName}
                    onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                    placeholder="Nhập tên khách hàng"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Số điện thoại</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                    placeholder="Nhập số điện thoại"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Món đã đặt</label>
                  <div className="space-y-2">
                    {editForm.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleUpdateItemQuantity(idx, -1)}
                            className="w-7 h-7 rounded-lg bg-background border flex items-center justify-center hover:bg-secondary"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center font-bold">{item.quantity}</span>
                          <button
                            onClick={() => handleUpdateItemQuantity(idx, 1)}
                            className="w-7 h-7 rounded-lg bg-background border flex items-center justify-center hover:bg-secondary"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleRemoveItem(idx)}
                            className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 ml-2"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Ghi chú</label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background resize-none h-20"
                    placeholder="Thêm ghi chú cho đơn hàng"
                  />
                </div>

                <div className="bg-accent/20 rounded-xl p-3 text-center">
                  <span className="text-sm text-muted-foreground">Tổng tiền: </span>
                  <span className="text-xl font-bold text-accent">
                    {formatCurrency(editForm.items.reduce((sum, item) => sum + item.price * item.quantity, 0))}
                  </span>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setEditingOrder(null)}
                    className="flex-1 px-4 py-3 rounded-xl font-semibold bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={updateOrder.isPending}
                    className="flex-1 px-4 py-3 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {updateOrder.isPending ? "Đang lưu..." : "Lưu"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
