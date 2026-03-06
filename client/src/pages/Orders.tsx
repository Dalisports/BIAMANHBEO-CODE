import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { useOrders, useCompleteOrders, useDeleteOrder, useUpdateOrder, useUncompleteOrder } from "@/hooks/use-orders";
import { formatCurrency, cn } from "@/lib/utils";
import { CheckCircle2, Clock, MapPin, Phone, User, Loader2, Receipt, Pencil, Trash2, ChevronDown, ChevronUp, Check, X, Square, CheckSquare } from "lucide-react";

export default function Orders() {
  const { data: orders, isLoading } = useOrders();
  const completeOrders = useCompleteOrders();
  const uncompleteOrder = useUncompleteOrder();
  const deleteOrder = useDeleteOrder();
  const updateOrder = useUpdateOrder();
  const [filter, setFilter] = useState<"All" | "Pending" | "Complete">("Pending");
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());
  const [showResult, setShowResult] = useState(false);
  const [completedList, setCompletedList] = useState<any[]>([]);

  const filteredOrders = orders?.filter(o => 
    filter === "All" ? true : o.status.includes(filter)
  );

  useEffect(() => {
    if (filter !== "Pending") {
      setBulkMode(false);
      setSelectedOrders(new Set());
    }
  }, [filter]);

  const pendingOrders = orders?.filter(o => o.status === "Pending") || [];

  const toggleSelectOrder = (id: number) => {
    setSelectedOrders(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkComplete = () => {
    if (selectedOrders.size === 0) return;
    
    const completed = pendingOrders.filter(o => selectedOrders.has(o.id));
    setCompletedList(completed);
    completeOrders.mutate(Array.from(selectedOrders), {
      onSuccess: () => {
        setShowResult(true);
        setSelectedOrders(new Set());
        setBulkMode(false);
      }
    });
  };

  const handleComplete = (id: number) => {
    const order = orders?.find(o => o.id === id);
    if (order) {
      setCompletedList([order]);
    }
    completeOrders.mutate([id], {
      onSuccess: () => {
        setShowResult(true);
      }
    });
  };

  const toggleOrder = (id: number) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa đơn hàng này?")) {
      deleteOrder.mutate(id);
    }
  };

  const handleEdit = (order: { id: number; customerName: string; address: string; phone: string }) => {
    setEditingId(order.id);
    setEditCustomerName(order.customerName);
    setEditAddress(order.address);
    setEditPhone(order.phone);
  };

  const handleSaveEdit = (id: number) => {
    if (!editCustomerName || !editAddress || !editPhone) return;
    updateOrder.mutate(
      { id, customerName: editCustomerName, address: editAddress, phone: editPhone },
      { onSuccess: () => setEditingId(null) }
    );
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditCustomerName("");
    setEditAddress("");
    setEditPhone("");
  };

  const totalAmount = completedList.reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div className="h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">Đơn hàng</h2>
          <p className="text-muted-foreground mt-1 text-sm">Quản lý và theo dõi trạng thái giao hàng</p>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
        <div className="flex items-center gap-2 p-1 bg-card rounded-2xl border border-border shadow-sm w-full">
          {["Pending", "Complete", "All"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={cn(
                "flex-1 px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200",
                filter === f 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              {f === "All" ? "Tất cả" : f === "Pending" ? "Chưa giao" : "Hoàn thành"}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          {bulkMode ? (
            <>
              <button
                onClick={handleBulkComplete}
                disabled={selectedOrders.size === 0 || completeOrders.isPending}
                className="px-4 py-2 rounded-xl font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                GO ({selectedOrders.size})
              </button>
              <button
                onClick={() => { setBulkMode(false); setSelectedOrders(new Set()); }}
                className="px-4 py-2 rounded-xl font-semibold bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
              >
                Hủy
              </button>
            </>
          ) : filter === "Pending" ? (
            <button
              onClick={() => setBulkMode(true)}
              className="px-4 py-2 rounded-xl font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-colors flex items-center gap-2"
            >
              <CheckSquare className="w-4 h-4" />
              Chốt nhiều đơn
            </button>
          ) : null}
        </div>
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
          <h3 className="text-xl font-bold text-foreground mb-2">Không có đơn hàng nào</h3>
          <p className="text-muted-foreground max-w-sm">Sử dụng trợ lý giọng nói: "Lên đơn cho chị Thanh 2 phần khoai tây lắc..." để tạo đơn mới ngay.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filteredOrders.map((order, i) => {
            const isComplete = order.status === "Complete";
            const isExpanded = expandedOrders.has(order.id);
            const itemCount = (order.items as any[]).length;
            const isSelected = selectedOrders.has(order.id);
            const isPending = order.status === "Pending";
            
            return (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                key={order.id}
                className={cn(
                  "bg-card rounded-3xl border-2 transition-all duration-300 hover:shadow-xl group",
                  isComplete ? "border-accent/20 bg-accent/5" : isPending ? "border-orange-400 bg-orange-50" : "border-border hover:border-primary/20",
                  bulkMode && isPending && isSelected && "border-green-500 bg-green-50/50"
                )}
              >
                <div className="p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                      {bulkMode && isPending && (
                        <button
                          onClick={() => toggleSelectOrder(order.id)}
                          className="mt-1 p-1 rounded hover:bg-secondary transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-green-600" />
                          ) : (
                            <Square className="w-5 h-5 text-muted-foreground" />
                          )}
                        </button>
                      )}
                      <div className="flex-1">
                        {editingId === order.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editCustomerName}
                              onChange={(e) => setEditCustomerName(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-lg font-bold focus:outline-none focus:border-primary"
                              placeholder="Tên khách hàng"
                            />
                            <input
                              type="text"
                              value={editAddress}
                              onChange={(e) => setEditAddress(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-primary"
                              placeholder="Địa chỉ"
                            />
                            <input
                              type="text"
                              value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-primary"
                              placeholder="Số điện thoại"
                            />
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {order.address}
                              </span>
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {order.phone}
                              </span>
                            </div>
                          </div>
                          ) : (
                          <>
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                {order.customerName}
                              </h3>
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1",
                                isComplete ? "bg-accent/20 text-accent" : isPending ? "bg-orange-100 text-orange-600" : "bg-primary/10 text-primary"
                              )}>
                                {isComplete ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                {order.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {order.address}
                              </span>
                              <a 
                                href={`tel:${order.phone}`}
                                className="flex items-center gap-1 hover:text-primary transition-colors"
                              >
                                <Phone className="w-3 h-3" /> {order.phone}
                              </a>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    {!editingId && !bulkMode && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(order)}
                          className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Sửa đơn hàng"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(order.id)}
                          className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Xóa đơn hàng"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div 
                    className="mt-3 flex items-center justify-between cursor-pointer"
                    onClick={() => !editingId && toggleOrder(order.id)}
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">
                        {itemCount} mặt hàng
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({itemCount > 0 ? (order.items as any[]).slice(0, 2).map((item: any) => `${item.name} x ${item.quantity}`).join(", ") : ""}{itemCount > 2 ? ` +${itemCount - 2}` : ""})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-foreground">{formatCurrency(order.totalAmount)}</span>
                      {!editingId && (isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />)}
                    </div>
                  </div>

                  {editingId === order.id && (
                    <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border">
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 rounded-lg font-semibold bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={() => handleSaveEdit(order.id)}
                        disabled={updateOrder.isPending}
                        className="px-4 py-2 rounded-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {updateOrder.isPending ? "Đang lưu..." : "Xác nhận"}
                      </button>
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {isExpanded && !editingId && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4">
                        <div className="bg-background rounded-2xl p-4 border border-border/50">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Chi tiết mặt hàng</h4>
                          <ul className="space-y-2">
                            {(order.items as any[]).map((item, idx) => (
                              <li key={idx} className="flex justify-between items-center text-sm font-medium">
                                <span className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-md bg-secondary flex items-center justify-center text-muted-foreground text-xs">{item.quantity}</span>
                                  x {item.name}
                                </span>
                                <span className="text-muted-foreground">{formatCurrency(item.price * item.quantity)}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="mt-3 pt-3 border-t border-border/50 space-y-1">
                            <p className="text-xs text-muted-foreground">
                              🕐 Khởi tạo: {order.createdAt ? new Date(order.createdAt).toLocaleString("vi-VN", { 
                                day: "2-digit", 
                                month: "2-digit", 
                                year: "numeric", 
                                hour: "2-digit", 
                                minute: "2-digit" 
                              }) : "N/A"}
                            </p>
                            {(order as any).completedAt && (
                              <p className="text-xs text-green-600 font-medium">
                                ✅ Đã chốt: {new Date((order as any).completedAt).toLocaleString("vi-VN", { 
                                  day: "2-digit", 
                                  month: "2-digit", 
                                  year: "numeric", 
                                  hour: "2-digit", 
                                  minute: "2-digit" 
                                })}
                              </p>
                            )}
                          </div>
                        </div>

                        {!isComplete && !bulkMode && (
                          <button
                            onClick={() => handleComplete(order.id)}
                            disabled={completeOrders.isPending}
                            className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg transition-all duration-200"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                            Chốt đơn này
                          </button>
                        )}

                        {isComplete && (
                          <button
                            onClick={() => uncompleteOrder.mutate(order.id)}
                            disabled={uncompleteOrder.isPending}
                            className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold bg-red-100 text-red-600 hover:bg-red-200 transition-all duration-200"
                          >
                            <X className="w-5 h-5" />
                            Hủy đơn chốt
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Result Modal */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowResult(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground">Đơn hàng đã chốt</h3>
                  <p className="text-sm text-muted-foreground">{completedList.length} đơn hàng</p>
                </div>
              </div>

              <div className="bg-background rounded-2xl p-4 border border-border/50 max-h-60 overflow-y-auto mb-4">
                <ul className="space-y-3">
                  {completedList.map((order) => (
                    <li key={order.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <span className="font-medium">{order.customerName}</span>
                          <span className="text-xs text-muted-foreground block">{order.phone} • {order.address}</span>
                        </div>
                        <span className="font-bold text-accent">{formatCurrency(order.totalAmount)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {order.items.map((item: any) => `${item.name} x${item.quantity}`).join(", ")}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-between items-center p-4 bg-primary/10 rounded-2xl mb-6">
                <span className="text-lg font-bold text-foreground">TỔNG TIỀN</span>
                <span className="text-2xl font-bold text-accent">{formatCurrency(totalAmount)}</span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const shareText = completedList.map((order, idx) => 
                      `${idx + 1}. ${order.customerName} - ${order.phone} - ${order.address}\n   ${order.items.map((item: any) => `${item.name} x${item.quantity}`).join(", ")}\n   Tổng: ${formatCurrency(order.totalAmount)}`
                    ).join("\n\n") + `\n\n💰 TỔNG CỘNG: ${formatCurrency(totalAmount)}`;
                    
                    navigator.clipboard.writeText(shareText);
                    alert("Đã copy danh sách đơn hàng!");
                  }}
                  className="flex-1 px-4 py-3 rounded-xl font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                >
                  Chia Sẻ
                </button>
                <button
                  onClick={() => setShowResult(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
