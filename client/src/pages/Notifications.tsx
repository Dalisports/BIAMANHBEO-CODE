import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOrders } from "@/hooks/use-orders";
import { useAuth } from "@/hooks/use-auth";
import { useNotificationContext } from "@/contexts/NotificationContext";
import { useNotificationDetail } from "@/contexts/NotificationDetailContext";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Bell, BellOff, RefreshCw, Trash2, ChevronLeft,
  UtensilsCrossed, ChefHat, CreditCard, Clock, CheckCircle2,
  AlertCircle, Loader2, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotificationItem {
  id: string;
  type: "order" | "kitchen" | "payment";
  title: string;
  subtitle?: string;
  items?: string[];
  tableNumber?: string;
  username?: string;
  timestamp: Date;
  read: boolean;
  eventCount?: number;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const { notifications: batchNotifications, clearAll: clearAllBatches } = useNotificationContext();
  const { showNotificationDetail } = useNotificationDetail();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "order" | "kitchen" | "payment">("all");
  const [isMuted, setIsMuted] = useState(false);

  const handleViewDetail = (notification: NotificationItem) => {
    showNotificationDetail({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      subtitle: notification.subtitle,
      items: notification.items,
      tableNumber: notification.tableNumber,
      username: notification.username,
      timestamp: notification.timestamp,
    });
  };

  // Sync from batch notification context
  useEffect(() => {
    const items: NotificationItem[] = [];
    
    batchNotifications.forEach(batch => {
      // Create separate notification for EACH event in the batch
      batch.events.forEach((event, eventIndex) => {
        const eventTitle = event.title || 
          (event.type === "order" ? "ORDER MỚI" : 
           event.type === "kitchen" ? "RA MÓN" : "Thông báo");
        
        // For batched events, prefix with "GỘP" if multiple
        const title = batch.events.length > 1 ? `${eventTitle} x${batch.events.length}` : eventTitle;
        
        items.push({
          id: `${batch.id}-${eventIndex}`,
          type: event.type as "order" | "kitchen" | "payment",
          title,
          subtitle: event.items?.slice(0, 3).join(", ") || "",
          items: event.items || [],
          tableNumber: event.tableNumber,
          username: event.username,
          timestamp: new Date(batch.createdAt),
          read: batch.displayed,
          eventCount: batch.events.length,
        });
      });
    });
    
    setNotifications(items);
  }, [batchNotifications]);

  // Format time
  const formatTime = (date: Date) => {
    const d = new Date(date);
    const time = format(d, "HH:mm");
    return time;
  };

  const formatDateLabel = (date: Date) => {
    if (isToday(date)) return "Hôm nay";
    if (isYesterday(date)) return "Hôm qua";
    return format(date, "EEEE, dd/MM", { locale: vi });
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    if (filter === "all") return true;
    return n.type === filter;
  });

  // Group by date
  const groupedByDate = filteredNotifications.reduce((acc, notif) => {
    const dateKey = format(new Date(notif.timestamp), "yyyy-MM-dd");
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(notif);
    return acc;
  }, {} as Record<string, NotificationItem[]>);

  // Toggle mute
  const toggleMute = () => setIsMuted(!isMuted);

  // Mark as read
  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Delete notification
  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    clearAllBatches();
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "order": return <UtensilsCrossed className="w-4 h-4" />;
      case "kitchen": return <ChefHat className="w-4 h-4" />;
      case "payment": return <CreditCard className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "order": return "bg-blue-500";
      case "kitchen": return "bg-orange-500";
      case "payment": return "bg-green-500";
      default: return "bg-amber-500";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Bell className="w-6 h-6 text-amber-500" />
              <h1 className="text-xl font-bold">Thông báo</h1>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleMute}
              className={cn(
                "p-2 rounded-lg transition-colors",
                isMuted ? "text-red-500 bg-red-100" : "hover:bg-secondary"
              )}
              title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
            >
              {isMuted ? <BellOff className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
          {[
            { id: "all", label: "Tất cả" },
            { id: "order", label: "Order" },
            { id: "kitchen", label: "Bếp" },
            { id: "payment", label: "Thanh toán" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors",
                filter === tab.id
                  ? "bg-amber-500 text-black"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Bell className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-bold mb-2">Không có thông báo</h3>
            <p className="text-muted-foreground text-sm">
              {filter === "all"
                ? "Chưa có thông báo nào"
                : `Không có thông báo ${filter}`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedByDate)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([date, dateNotifs]) => (
                <div key={date}>
                  {/* Date header */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-sm font-semibold text-muted-foreground">
                      {formatDateLabel(new Date(date))}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* Notifications */}
                  <div className="space-y-2">
                    <AnimatePresence>
                      {dateNotifs.map((notif, index) => (
                        <motion.div
                          key={notif.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -100 }}
                          transition={{ delay: index * 0.03 }}
                          className={cn(
                            "relative rounded-2xl border overflow-hidden",
                            notif.read
                              ? "bg-card border-border"
                              : "bg-blue-50/50 border-blue-200"
                          )}
                        >
                          {/* Unread indicator */}
                          {!notif.read && (
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full" />
                          )}

                          <div className="p-4">
                            {/* Header row */}
                            <div className="flex items-start gap-3">
                              {/* Icon */}
                              <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0",
                                getTypeColor(notif.type)
                              )}>
                                {getTypeIcon(notif.type)}
                              </div>

{/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={cn(
                                      "font-black text-sm uppercase tracking-wide",
                                      notif.type === "order" ? "text-blue-600" :
                                      notif.type === "kitchen" ? "text-orange-600" :
                                      "text-green-600"
                                    )}>
                                      {notif.title}
                                    </span>
                                    {notif.eventCount && notif.eventCount > 1 && (
                                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded">
                                        x{notif.eventCount}
                                      </span>
                                    )}
                                  </div>

                                  {/* Title with table */}
                                  {notif.tableNumber && (
                                    <p className="font-bold text-base mb-1">
                                      Bàn {notif.tableNumber}
                                    </p>
                                  )}

                                  {/* Subtitle/items */}
                                  <p className="text-sm text-foreground leading-relaxed">
                                    {notif.subtitle}
                                  </p>

                                  {/* Items list - show more for batched */}
                                  {notif.items && notif.items.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {notif.items.slice(0, 8).map((item, i) => (
                                        <span
                                          key={i}
                                          className="px-2 py-0.5 bg-secondary rounded text-xs font-medium"
                                        >
                                          {item}
                                        </span>
                                      ))}
                                      {notif.items.length > 8 && (
                                        <span className="px-2 py-0.5 text-xs text-muted-foreground">
                                          +{notif.items.length - 8} món
                                        </span>
                                    )}
                                  </div>
                                )}

                                {/* Footer */}
                                <div className="flex items-center justify-between mt-3">
                                  <span className="text-xs text-muted-foreground">
                                    {notif.username} · {formatTime(notif.timestamp)}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleViewDetail(notif)}
                                      className="p-1.5 text-muted-foreground hover:text-amber-500 transition-colors"
                                      title="Xem chi tiết"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    {notif.type === "order" && (
                                      <button
                                        onClick={() => { markAsRead(notif.id); window.location.href = "/"; }}
                                        className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-lg hover:bg-blue-600 transition-colors"
                                      >
                                        Xem đơn
                                      </button>
                                    )}
                                    {notif.type === "kitchen" && (
                                      <button
                                        onClick={() => { markAsRead(notif.id); window.location.href = "/kitchen"; }}
                                        className="px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-lg hover:bg-orange-600 transition-colors"
                                      >
                                        Xem bếp
                                      </button>
                                    )}
                                    <button
                                      onClick={() => deleteNotification(notif.id)}
                                      className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Bottom action bar */}
        {notifications.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-md border-t border-border">
            <div className="max-w-2xl mx-auto flex gap-3">
              <Button
                variant="outline"
                onClick={markAllAsRead}
                className="flex-1"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Đánh dấu đã đọc
              </Button>
              <Button
                variant="outline"
                onClick={clearAll}
                className="flex-1 text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Xóa tất cả
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}