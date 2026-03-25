import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOrders, useSendToKitchen, usePayOrder, useDeleteOrder } from "@/hooks/use-orders";
import { formatCurrency, cn } from "@/lib/utils";
import { 
  CheckCircle2, Clock, Loader2, Receipt, Trash2, ChevronDown, 
  Send, CreditCard, Users, Phone, StickyNote, AlertCircle
} from "lucide-react";

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Pending: { bg: "bg-yellow-50", text: "text-yellow-600", border: "border-yellow-400" },
  InKitchen: { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-400" },
  Ready: { bg: "bg-green-50", text: "text-green-600", border: "border-green-400" },
  Complete: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-400" },
};

const STATUS_LABELS: Record<string, string> = {
  Pending: "CHỜ GỬI BẾP",
  InKitchen: "ĐANG NẤU",
  Ready: "SẴN SÀNG",
  Complete: "ĐÃ THANH TOÁN",
};

export default function Orders() {
  const { data: orders, isLoading } = useOrders();
  const sendToKitchen = useSendToKitchen();
  const payOrder = usePayOrder();
  const deleteOrder = useDeleteOrder();
  const [filter, setFilter] = useState<string>("All");
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());
  const [showPayModal, setShowPayModal] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");

  const filteredOrders = orders?.filter(o => 
    filter === "All" ? true : o.status === filter || (filter === "Active" && o.status !== "Complete")
  );

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

  const activeOrders = orders?.filter(o => o.status !== "Complete") || [];

  return (
    <div className="h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-sans font-bold text-foreground">Đơn Hàng</h2>
          <p className="text-muted-foreground mt-1 text-sm">Quản lý order theo bàn</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-orange-100 text-orange-700 font-semibold">
            <span className="text-2xl">{activeOrders.length}</span> đơn đang xử lý
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {["All", "Active", "Pending", "InKitchen", "Ready", "Complete"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200",
              filter === f 
                ? "bg-primary text-primary-foreground shadow-md" 
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            {f === "All" ? "Tất cả" : f === "Active" ? "Đang xử lý" : STATUS_LABELS[f] || f}
          </button>
        ))}
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
                  colors.border
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
                      {order.customerName && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Users className="w-3 h-3" /> {order.customerName}
                          {order.phone && <><Phone className="w-3 h-3 ml-2" /> {order.phone}</>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
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
                            
                            {!isPaid && order.status !== "Pending" && (
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
                {[
                  { id: "cash", label: "Tiền mặt", icon: "💵" },
                  { id: "transfer", label: "Chuyển khoản", icon: "🏦" },
                  { id: "vnpay", label: "VNPay", icon: "💳" },
                  { id: "momo", label: "MoMo", icon: "📱" },
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all text-left",
                      paymentMethod === method.id 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <span className="text-2xl">{method.icon}</span>
                    <span className="block font-semibold mt-1">{method.label}</span>
                  </button>
                ))}
              </div>

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
    </div>
  );
}
