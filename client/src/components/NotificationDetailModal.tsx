import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { X, UtensilsCrossed, ChefHat, CreditCard, Clock, User, MapPin } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface NotificationDetailModalProps {
  isVisible: boolean;
  notification: {
    id: string;
    type: "order" | "kitchen" | "payment";
    title: string;
    subtitle?: string;
    items?: string[];
    tableNumber?: string;
    username?: string;
    timestamp: Date;
    body?: string;
  } | null;
  onClose: () => void;
}

export function NotificationDetailModal({ isVisible, notification, onClose }: NotificationDetailModalProps) {
  if (!notification) return null;

  const getIcon = () => {
    switch (notification.type) {
      case "kitchen":
        return <ChefHat className="w-6 h-6" />;
      case "payment":
        return <CreditCard className="w-6 h-6" />;
      default:
        return <UtensilsCrossed className="w-6 h-6" />;
    }
  };

  const getColor = () => {
    switch (notification.type) {
      case "kitchen":
        return "bg-orange-500";
      case "payment":
        return "bg-green-500";
      default:
        return "bg-blue-500";
    }
  };

  const getTypeLabel = () => {
    switch (notification.type) {
      case "kitchen":
        return "Bếp";
      case "payment":
        return "Thanh toán";
      default:
        return "Order";
    }
  };

  const formatDateTime = (date: Date) => {
    return format(new Date(date), "HH:mm 'ngày' dd/MM/yyyy", { locale: vi });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-card rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={cn("p-4 flex items-center gap-3", getColor(), "text-white")}>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                {getIcon()}
              </div>
              <div className="flex-1">
                <h3 className="font-black text-xl">{notification.title}</h3>
                <p className="text-sm text-white/90">{getTypeLabel()}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Body/Description */}
              {notification.body && (
                <div className="bg-secondary/50 rounded-xl p-3">
                  <p className="text-sm text-muted-foreground">{notification.body}</p>
                </div>
              )}

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                {notification.tableNumber && (
                  <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-xl">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Bàn</p>
                      <p className="font-bold">{notification.tableNumber}</p>
                    </div>
                  </div>
                )}
                
                {notification.username && (
                  <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-xl">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Người tạo</p>
                      <p className="font-bold">{notification.username}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-xl col-span-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Thời gian</p>
                    <p className="font-bold">{formatDateTime(notification.timestamp)}</p>
                  </div>
                </div>
              </div>

              {/* Items List */}
              {notification.items && notification.items.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-muted-foreground mb-2 uppercase">
                    Danh sách món ({notification.items.length})
                  </h4>
                  <div className="bg-secondary/50 rounded-xl p-3">
                    <ul className="space-y-2">
                      {notification.items.map((item, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </span>
                          <span className="flex-1">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl font-bold bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  Đóng
                </button>
                <button
                  onClick={() => {
                    if (notification.type === "kitchen" || notification.title.includes("CẦN NẤU")) {
                      window.location.href = "/kitchen";
                    } else {
                      window.location.href = "/";
                    }
                  }}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold text-white transition-colors",
                    notification.type === "kitchen" 
                      ? "bg-orange-500 hover:bg-orange-600" 
                      : "bg-blue-500 hover:bg-blue-600"
                  )}
                >
                  {notification.type === "kitchen" ? "Xem bếp" : "Xem đơn hàng"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}