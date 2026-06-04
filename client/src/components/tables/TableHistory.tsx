import { useState, useMemo } from "react";
import { useOrders } from "@/hooks/use-orders";
import { formatCurrency, cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, isToday, isYesterday } from "date-fns";
import { vi } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronLeft, ChevronRight, Calendar, Receipt, Clock, CreditCard } from "lucide-react";

interface TableHistoryProps {
  selectedTable: number;
}

const STATUS_LABELS: Record<string, string> = {
  Pending: "Chờ xử lý",
  InKitchen: "Đang nấu",
  Ready: "Sẵn sàng",
  Complete: "Hoàn thành",
};

export function TableHistory({ selectedTable }: TableHistoryProps) {
  const { data: allOrders } = useOrders();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());

  const tableOrders = useMemo(() => {
    if (!allOrders) return [];
    return allOrders
      .filter(o => o.tableNumber === selectedTable.toString())
      .filter(o => o.paymentStatus === "Paid")
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [allOrders, selectedTable]);

  const filteredByMonth = useMemo(() => {
    return tableOrders.filter(o => {
      if (!o.createdAt) return false;
      const orderDate = new Date(o.createdAt);
      return orderDate >= startOfMonth(selectedMonth) && orderDate <= endOfMonth(selectedMonth);
    });
  }, [tableOrders, selectedMonth]);

  const monthStats = useMemo(() => {
    return {
      totalOrders: filteredByMonth.length,
      totalRevenue: filteredByMonth.reduce((acc, o) => acc + o.totalAmount, 0),
      avgOrderValue: filteredByMonth.length > 0
        ? filteredByMonth.reduce((acc, o) => acc + o.totalAmount, 0) / filteredByMonth.length
        : 0,
    };
  }, [filteredByMonth]);

  const groupedByDate = useMemo(() => {
    const grouped = filteredByMonth.reduce((acc, order) => {
      if (!order.createdAt) return acc;
      const date = format(new Date(order.createdAt), "yyyy-MM-dd");
      if (!acc[date]) acc[date] = [];
      acc[date].push(order);
      return acc;
    }, {} as Record<string, typeof filteredByMonth>);
    return grouped;
  }, [filteredByMonth]);

  const navigateMonth = (direction: number) => {
    setSelectedMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const toggleOrder = (id: number) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Hôm nay";
    if (isYesterday(date)) return "Hôm qua";
    return format(date, "EEEE, dd/MM", { locale: vi });
  };

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center gap-2 bg-secondary/50 rounded-xl p-2">
        <button
          onClick={() => navigateMonth(-1)}
          className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 flex items-center justify-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold text-sm">
            {format(selectedMonth, "MMMM yyyy", { locale: vi })}
          </span>
        </div>
        <button
          onClick={() => navigateMonth(1)}
          className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Stats */}
      {monthStats.totalOrders > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card rounded-xl p-3 border border-border text-center">
            <p className="text-xs text-muted-foreground mb-1">Đơn</p>
            <p className="text-lg font-bold">{monthStats.totalOrders}</p>
          </div>
          <div className="bg-card rounded-xl p-3 border border-border text-center">
            <p className="text-xs text-muted-foreground mb-1">Doanh thu</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(monthStats.totalRevenue)}</p>
          </div>
          <div className="bg-card rounded-xl p-3 border border-border text-center">
            <p className="text-xs text-muted-foreground mb-1">TB/Đơn</p>
            <p className="text-lg font-bold">{formatCurrency(monthStats.avgOrderValue)}</p>
          </div>
        </div>
      )}

      {/* Orders List */}
      {filteredByMonth.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground bg-card rounded-2xl border border-dashed border-border">
          <Receipt className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>Chưa có đơn thanh toán nào</p>
          <p className="text-xs mt-1">trong tháng này</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {Object.entries(groupedByDate)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, dateOrders]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {formatDateLabel(date)}
                  </h4>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">
                    {formatCurrency(dateOrders.reduce((acc, o) => acc + o.totalAmount, 0))}
                  </span>
                </div>
                <div className="space-y-2">
                  {dateOrders.map((order) => {
                    const isExpanded = expandedOrders.has(order.id);
                    return (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-card rounded-xl border border-border overflow-hidden"
                      >
                        <button
                          onClick={() => toggleOrder(order.id)}
                          className="w-full flex items-center justify-between p-3 text-left hover:bg-secondary/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                              <Clock className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm">{formatCurrency(order.totalAmount)}</span>
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-[10px] font-bold",
                                  order.paymentMethod === "cash" ? "bg-green-100 text-green-700" :
                                  order.paymentMethod === "transfer" ? "bg-blue-100 text-blue-700" :
                                  "bg-purple-100 text-purple-700"
                                )}>
                                  {order.paymentMethod === "cash" ? "TM" : order.paymentMethod === "transfer" ? "CK" : order.paymentMethod?.toUpperCase().slice(0, 2)}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {order.createdAt && format(new Date(order.createdAt), "HH:mm")}
                                {" • "}
                                {order.items?.length || 0} món
                              </p>
                            </div>
                          </div>
                          <ChevronDown className={cn(
                            "w-4 h-4 text-muted-foreground transition-transform",
                            isExpanded && "rotate-180"
                          )} />
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: "auto" }}
                              exit={{ height: 0 }}
                              className="overflow-hidden border-t border-border"
                            >
                              <div className="p-3 bg-secondary/20">
                                <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Chi tiết đơn</h5>
                                <ul className="space-y-1.5">
                                  {(order.items as any[]).map((item: any, idx: number) => (
                                    <li key={idx} className="flex justify-between items-center text-sm">
                                      <span className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                                          {item.quantity}
                                        </span>
                                        {item.name}
                                        {item.notes && <span className="text-xs text-muted-foreground">({item.notes})</span>}
                                      </span>
                                      <span className="text-muted-foreground text-xs">
                                        {formatCurrency(item.price * item.quantity)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                                <div className="mt-3 pt-2 border-t border-border flex justify-between items-center">
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <CreditCard className="w-3 h-3" />
                                    {order.paymentMethod === "cash" ? "Tiền mặt" :
                                     order.paymentMethod === "transfer" ? "Chuyển khoản" :
                                     order.paymentMethod || "Khác"}
                                  </span>
                                  <span className="font-bold text-accent">{formatCurrency(order.totalAmount)}</span>
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