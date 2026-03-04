import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { useOrders, useCompleteOrders } from "@/hooks/use-orders";
import { formatCurrency, cn } from "@/lib/utils";
import { CheckCircle2, Clock, MapPin, Phone, User, Loader2, Receipt } from "lucide-react";

export default function Orders() {
  const { data: orders, isLoading } = useOrders();
  const completeOrders = useCompleteOrders();
  const [filter, setFilter] = useState<"All" | "Pending" | "Complete">("All");

  const filteredOrders = orders?.filter(o => 
    filter === "All" ? true : o.status.includes(filter)
  );

  const handleComplete = (id: number) => {
    completeOrders.mutate([id]);
  };

  return (
    <div className="h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">Đơn hàng</h2>
          <p className="text-muted-foreground mt-1 text-sm">Quản lý và theo dõi trạng thái giao hàng</p>
        </div>
        
        {/* Filter Pills */}
        <div className="flex items-center gap-2 p-1 bg-card rounded-2xl border border-border shadow-sm">
          {["All", "Pending", "Complete"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={cn(
                "px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200",
                filter === f 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              {f === "All" ? "Tất cả" : f === "Pending" ? "Chưa giao" : "Hoàn thành"}
            </button>
          ))}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredOrders.map((order, i) => {
            const isComplete = order.status === "Complete";
            
            return (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                key={order.id}
                className={cn(
                  "bg-card rounded-3xl p-6 border-2 transition-all duration-300 hover:shadow-xl group",
                  isComplete ? "border-accent/20 bg-accent/5" : "border-border hover:border-primary/20"
                )}
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <User className="w-5 h-5 text-muted-foreground" />
                        {order.customerName}
                      </h3>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1",
                        isComplete ? "bg-accent/20 text-accent" : "bg-primary/10 text-primary"
                      )}>
                        {isComplete ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {order.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mb-1">
                      <MapPin className="w-4 h-4" /> {order.address}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Phone className="w-4 h-4" /> {order.phone}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Tổng tiền</p>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(order.totalAmount)}</p>
                  </div>
                </div>

                <div className="bg-background rounded-2xl p-4 border border-border/50 mb-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Chi tiết mặt hàng</h4>
                  <ul className="space-y-3">
                    {(order.items as any[]).map((item, idx) => (
                      <li key={idx} className="flex justify-between items-center text-sm font-medium">
                        <span className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center text-muted-foreground text-xs">{item.quantity}</span>
                          x {item.name}
                        </span>
                        <span className="text-muted-foreground">{formatCurrency(item.price * item.quantity)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {!isComplete && (
                  <button
                    onClick={() => handleComplete(order.id)}
                    disabled={completeOrders.isPending}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg transition-all duration-200"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Chốt đơn này
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
