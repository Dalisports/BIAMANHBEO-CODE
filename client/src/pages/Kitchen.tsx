import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useKitchenOrders, useStartKitchenOrder, useCompleteKitchenOrder } from "@/hooks/use-orders";
import { cn } from "@/lib/utils";
import { ChefHat, Clock, CheckCircle2, Play, Flame, Loader2 } from "lucide-react";

export default function Kitchen() {
  const { data: kitchenOrders, isLoading } = useKitchenOrders();
  const startOrder = useStartKitchenOrder();
  const completeOrder = useCompleteKitchenOrder();
  const audioRef = useRef<HTMLAudioElement>(null);

  const waitingOrders = kitchenOrders?.filter(o => o.status === "Waiting") || [];
  const cookingOrders = kitchenOrders?.filter(o => o.status === "Cooking") || [];
  const doneOrders = kitchenOrders?.filter(o => o.status === "Done") || [];

  useEffect(() => {
    if (waitingOrders.length > 0) {
      audioRef.current?.play().catch(() => {});
    }
  }, [waitingOrders.length]);

  const getElapsedTime = (startTime: Date | null) => {
    if (!startTime) return "0 phút";
    const mins = Math.floor((Date.now() - new Date(startTime).getTime()) / 60000);
    return `${mins} phút`;
  };

  const getPriorityColor = (priority: string) => {
    if (priority === "urgent") return "bg-red-500 text-white";
    if (priority === "high") return "bg-orange-500 text-white";
    return "bg-yellow-100 text-yellow-800";
  };

  return (
    <div className="h-full">
      <audio ref={audioRef} src="/notification.mp3" />
      
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-sans font-bold text-foreground">Màn Hình Bếp</h2>
          <p className="text-muted-foreground mt-1 text-sm">Theo dõi order cần chế biến</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-100 text-yellow-700 font-bold">
            <Clock className="w-5 h-5" />
            <span>{waitingOrders.length}</span>
            <span className="text-sm font-normal">chờ nấu</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-100 text-orange-700 font-bold">
            <Flame className="w-5 h-5" />
            <span>{cookingOrders.length}</span>
            <span className="text-sm font-normal">đang nấu</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-yellow-500" />
              <h3 className="text-lg font-bold text-yellow-600">CHỜ NẤU ({waitingOrders.length})</h3>
            </div>
            <div className="space-y-3">
              {waitingOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-dashed">
                  Không có order nào
                </div>
              ) : (
                waitingOrders.map((order) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-yellow-50 rounded-2xl border-2 border-yellow-400 p-4"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">Bàn {order.tableNumber}</span>
                        {order.priority !== "normal" && (
                          <span className={cn("px-2 py-0.5 rounded text-xs font-bold", getPriorityColor(order.priority))}>
                            {order.priority}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => startOrder.mutate(order.id)}
                        disabled={startOrder.isPending}
                        className="p-2 rounded-xl bg-yellow-500 text-white hover:bg-yellow-600 transition-colors disabled:opacity-50"
                      >
                        <Play className="w-5 h-5" />
                      </button>
                    </div>
                    <ul className="space-y-1">
                      {(order.items as any[]).map((item: any, idx: number) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded bg-yellow-500 text-white flex items-center justify-center text-sm font-bold">
                            {item.quantity}
                          </span>
                          <span className="font-medium">{item.name}</span>
                          {item.notes && <span className="text-xs text-yellow-700">({item.notes})</span>}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 pt-2 border-t border-yellow-300 text-xs text-yellow-600">
                      {order.sentAt && `Gửi lúc ${new Date(order.sentAt).toLocaleTimeString("vi-VN")}`}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-5 h-5 text-orange-500" />
              <h3 className="text-lg font-bold text-orange-600">ĐANG NẤU ({cookingOrders.length})</h3>
            </div>
            <div className="space-y-3">
              {cookingOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-dashed">
                  Không có order nào
                </div>
              ) : (
                cookingOrders.map((order) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-orange-50 rounded-2xl border-2 border-orange-400 p-4 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-bl-full" />
                    <div className="flex justify-between items-center mb-3 relative">
                      <div className="flex items-center gap-2">
                        <ChefHat className="w-6 h-6 text-orange-500" />
                        <span className="text-2xl font-bold">Bàn {order.tableNumber}</span>
                      </div>
                      <button
                        onClick={() => completeOrder.mutate(order.id)}
                        disabled={completeOrder.isPending}
                        className="p-2 rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                    </div>
                    <ul className="space-y-2">
                      {(order.items as any[]).map((item: any, idx: number) => (
                        <li key={idx} className="flex items-center gap-2 bg-white/50 rounded-lg p-2">
                          <span className="w-8 h-8 rounded bg-orange-500 text-white flex items-center justify-center text-sm font-bold">
                            {item.quantity}
                          </span>
                          <span className="font-semibold">{item.name}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 pt-3 border-t border-orange-300 flex justify-between text-sm">
                      <span className="text-orange-600">
                        Đang nấu: {getElapsedTime(order.startedAt)}
                      </span>
                      {order.startedAt && (
                        <span className="text-orange-700 font-medium">
                          Bắt đầu: {new Date(order.startedAt).toLocaleTimeString("vi-VN")}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <h3 className="text-lg font-bold text-green-600">HOÀN THÀNH ({doneOrders.length})</h3>
            </div>
            <div className="space-y-2">
              {doneOrders.slice(0, 10).map((order) => (
                <div
                  key={order.id}
                  className="bg-green-50 rounded-xl border border-green-200 p-3 flex justify-between items-center"
                >
                  <div>
                    <span className="font-bold">Bàn {order.tableNumber}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {order.items.length} món
                    </span>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
              ))}
              {doneOrders.length === 0 && (
                <div className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-dashed">
                  Chưa có món hoàn thành
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
