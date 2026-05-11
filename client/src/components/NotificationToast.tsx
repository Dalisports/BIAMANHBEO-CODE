import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { X, Bell, UtensilsCrossed, ChefHat, CreditCard, Eye } from "lucide-react";
import { useNotificationDetail } from "@/contexts/NotificationDetailContext";

interface NotificationToastProps {
  isVisible: boolean;
  summary: {
    title: string;
    shortTitle: string;
    tableStr: string;
    content: string;
    time: string;
    username: string;
    count: number;
    types: Record<string, number>;
    hasKitchen: boolean;
    hasOrder: boolean;
    hasPayment: boolean;
    primaryEvent: {
      type: string;
      title: string;
      tableNumber?: string;
      items?: string[];
    };
  } | null;
  onDismiss: () => void;
}

export function NotificationToast({ isVisible, summary, onDismiss }: NotificationToastProps) {
  const { showNotificationDetail } = useNotificationDetail();
  
  if (!summary) return null;

  const getIcon = () => {
    if (summary.hasKitchen) return <ChefHat className="w-4 h-4" />;
    if (summary.hasPayment) return <CreditCard className="w-4 h-4" />;
    if (summary.hasOrder) return <UtensilsCrossed className="w-4 h-4" />;
    return <Bell className="w-4 h-4" />;
  };

  const getColor = () => {
    if (summary.hasKitchen) return "bg-orange-500";
    if (summary.hasPayment) return "bg-green-500";
    if (summary.hasOrder) return "bg-blue-500";
    return "bg-amber-500";
  };

  const handleViewDetails = () => {
    onDismiss();
    showNotificationDetail({
      id: `toast-${Date.now()}`,
      type: summary.hasKitchen ? "kitchen" : summary.hasPayment ? "payment" : "order",
      title: summary.shortTitle,
      subtitle: summary.content,
      items: summary.primaryEvent.items,
      tableNumber: summary.tableStr.replace("Bàn ", ""),
      username: summary.username,
      timestamp: new Date(),
      body: summary.content,
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[100]"
        >
          <div className="max-w-2xl mx-auto p-2">
            <div
              className={cn(
                "rounded-xl shadow-xl border overflow-hidden",
                "bg-card hover:bg-card/90 transition-colors",
                summary.hasKitchen && "border-orange-300",
                summary.hasPayment && "border-green-300",
                summary.hasOrder && "border-blue-300",
                !summary.hasKitchen && !summary.hasPayment && !summary.hasOrder && "border-amber-300"
              )}
            >
              <div className="flex items-center gap-2 px-3 py-2">
                {/* Icon */}
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0", getColor())}>
                  {getIcon()}
                </div>

                {/* Content - Single line */}
                <div className="flex-1 min-w-0 flex items-center gap-2 text-sm cursor-pointer" onClick={handleViewDetails}>
                  <span className={cn(
                    "font-black text-xs uppercase tracking-wide",
                    summary.hasKitchen && "text-orange-600",
                    summary.hasPayment && "text-green-600",
                    summary.hasOrder && "text-blue-600",
                    !summary.hasKitchen && !summary.hasPayment && !summary.hasOrder && "text-amber-600"
                  )}>
                    {summary.shortTitle}
                  </span>

                  {summary.tableStr && (
                    <>
                      <span className="text-muted-foreground">-</span>
                      <span className="font-semibold">{summary.tableStr}</span>
                    </>
                  )}

                  <span className="text-muted-foreground">-</span>
                  <span className="truncate flex-1">{summary.content}</span>
                </div>

                {/* User & Time */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
                  <span className="font-medium">{summary.username}</span>
                  <span>{summary.time}</span>
                </div>

                {/* View Details Button */}
                <button
                  onClick={handleViewDetails}
                  className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                  title="Xem chi tiết"
                >
                  <Eye className="w-4 h-4" />
                </button>

                {/* Close button */}
                <button
                  onClick={onDismiss}
                  className="p-1 rounded-full hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}