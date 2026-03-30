import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOrders } from "@/hooks/use-orders";
import { formatCurrency, cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, subMonths, isToday, isYesterday } from "date-fns";
import { vi } from "date-fns/locale";
import { 
  Calendar, ChevronLeft, ChevronRight, Loader2, Receipt, Clock, 
  CreditCard, Search, TrendingUp
} from "lucide-react";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Pending: { bg: "bg-yellow-50", text: "text-yellow-600" },
  InKitchen: { bg: "bg-orange-50", text: "text-orange-600" },
  Ready: { bg: "bg-green-50", text: "text-green-600" },
  Complete: { bg: "bg-blue-50", text: "text-blue-600" },
};

const STATUS_LABELS: Record<string, string> = {
  Pending: "Chờ xử lý",
  InKitchen: "Đang nấu",
  Ready: "Sẵn sàng",
  Complete: "Hoàn thành",
};

export default function History() {
  const { data: orders, isLoading } = useOrders();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());

  const isTodayOrder = (date: Date | string | null) => {
    if (!date) return false;
    return isToday(new Date(date));
  };

  const isYesterdayOrder = (date: Date | string | null) => {
    if (!date) return false;
    return isYesterday(new Date(date));
  };

  const pastOrders = orders?.filter(o => !isTodayOrder(o.createdAt)) || [];

  const filteredByMonth = pastOrders.filter(o => {
    if (!o.createdAt) return false;
    const orderDate = new Date(o.createdAt);
    return orderDate >= startOfMonth(selectedMonth) && orderDate <= endOfMonth(selectedMonth);
  });

  const filteredBySearch = filteredByMonth.filter(o => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      o.tableNumber?.toLowerCase().includes(query) ||
      o.customerName?.toLowerCase().includes(query) ||
      (o.items as any[])?.some(item => item.name?.toLowerCase().includes(query))
    );
  });

  const groupedByDate = filteredBySearch.reduce((acc, order) => {
    if (!order.createdAt) return acc;
    const date = format(new Date(order.createdAt), "yyyy-MM-dd");
    if (!acc[date]) acc[date] = [];
    acc[date].push(order);
    return acc;
  }, {} as Record<string, typeof filteredBySearch>);

  const monthStats = {
    totalOrders: filteredByMonth.length,
    totalRevenue: filteredByMonth
      .filter(o => o.paymentStatus === "Paid")
      .reduce((acc, o) => acc + o.totalAmount, 0),
    avgOrderValue: filteredByMonth.length > 0
      ? filteredByMonth.reduce((acc, o) => acc + o.totalAmount, 0) / filteredByMonth.length
      : 0,
  };

  const toggleOrder = (id: number) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const navigateMonth = (direction: number) => {
    setSelectedMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Hôm nay";
    if (isYesterday(date)) return "Hôm qua";
    return format(date, "EEEE, dd/MM/yyyy", { locale: vi });
  };

  return (
    <div className="h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-sans font-bold text-foreground">Lịch Sử Đơn Hàng</h2>
          <p className="text-muted-foreground mt-1 text-sm">Xem lại các đơn hàng đã xử lý</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-blue-100 text-blue-700 font-semibold">
            <span className="text-2xl">{monthStats.totalOrders}</span> đơn/tháng
          </div>
          <div className="px-4 py-2 rounded-xl bg-green-100 text-green-700 font-semibold">
            <span className="text-2xl">{formatCurrency(monthStats.totalRevenue)}</span> doanh thu
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex items-center gap-2 bg-card rounded-xl border border-border p-1">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 px-3 min-w-[180px] justify-center">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold">
              {format(selectedMonth, "MMMM yyyy", { locale: vi })}
            </span>
          </div>
          <button
            onClick={() => navigateMonth(1)}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo bàn, khách hàng, món..."
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-card border border-border"
          />
        </div>
      </div>

      {monthStats.totalOrders > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Receipt className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Tổng đơn</span>
            </div>
            <p className="text-2xl font-bold">{monthStats.totalOrders}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Doanh thu</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(monthStats.totalRevenue)}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <CreditCard className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">TB/Đơn</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(monthStats.avgOrderValue)}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Đơn đã thanh toán</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {monthStats.totalOrders > 0 ? Math.round((monthStats.totalRevenue > 0 ? monthStats.totalOrders : 0)) : 0}
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : filteredBySearch.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center px-4 bg-card rounded-3xl border border-border border-dashed">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground mb-4">
            <Receipt className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Không có đơn hàng nào</h3>
          <p className="text-muted-foreground max-w-sm">
            {searchQuery ? "Không tìm thấy đơn hàng phù hợp với từ khóa" : "Chưa có đơn hàng nào trong tháng này"}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByDate).map(([date, dateOrders]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-lg font-bold capitalize">{formatDateLabel(date)}</h3>
                <div className="flex-1 h-px bg-border" />
                <span className="text-sm text-muted-foreground">
                  {dateOrders.length} đơn - {formatCurrency(dateOrders.reduce((acc, o) => acc + o.totalAmount, 0))}
                </span>
              </div>
              
              <div className="space-y-2">
                {dateOrders.map((order, i) => {
                  const isExpanded = expandedOrders.has(order.id);
                  const itemCount = (order.items as any[]).length;
                  const colors = STATUS_COLORS[order.status] || STATUS_COLORS.Complete;
                  const isPaid = order.paymentStatus === "Paid";
                  
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      key={order.id}
                      className="bg-card rounded-2xl border border-border overflow-hidden"
                    >
                      <div 
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/50 transition-colors"
                        onClick={() => toggleOrder(order.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-yellow-100 flex items-center justify-center">
                            <span className="text-xl font-bold text-amber-600">B{order.tableNumber}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">
                                {order.customerName || `Bàn ${order.tableNumber}`}
                              </span>
                              <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", colors.bg, colors.text)}>
                                {STATUS_LABELS[order.status]}
                              </span>
                              {isPaid && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-600">
                                  Đã thanh toán
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                              <span>{itemCount} món</span>
                              <span>•</span>
                              <span>{formatCurrency(order.totalAmount)}</span>
                              {order.createdAt && (
                                <>
                                  <span>•</span>
                                  <span>{format(new Date(order.createdAt), "HH:mm")}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className={cn("w-5 h-5 text-muted-foreground transition-transform", isExpanded && "rotate-90")} />
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            className="overflow-hidden border-t border-border"
                          >
                            <div className="p-4 bg-secondary/30">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Chi tiết đơn hàng</h4>
                              <ul className="space-y-2">
                                {(order.items as any[]).map((item: any, idx: number) => (
                                  <li key={idx} className="flex justify-between items-center text-sm">
                                    <span className="flex items-center gap-2">
                                      <span className="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                        {item.quantity}
                                      </span>
                                      {item.name}
                                      {item.notes && <span className="text-xs text-muted-foreground">({item.notes})</span>}
                                    </span>
                                    <span className="text-muted-foreground">{formatCurrency(item.price * item.quantity)}</span>
                                  </li>
                                ))}
                              </ul>
                              <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                                <div>
                                  {order.paymentMethod && (
                                    <span className="text-sm text-muted-foreground">
                                      Thanh toán: {order.paymentMethod === "cash" ? "Tiền mặt" : order.paymentMethod}
                                    </span>
                                  )}
                                </div>
                                <span className="text-xl font-bold text-accent">{formatCurrency(order.totalAmount)}</span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
