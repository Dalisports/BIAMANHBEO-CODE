import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Send,
  Bot,
  User,
  Volume2,
  VolumeX,
  UtensilsCrossed,
  ChefHat,
  DollarSign,
  Clock,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { useProcessChat } from "@/hooks/use-chat";
import { useSpeech } from "@/hooks/use-speech";
import { useOrders, useKitchenOrders } from "@/hooks/use-orders";
import { useMenuItems } from "@/hooks/use-menu";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency, cn } from "@/lib/utils";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  action?: string;
  actionData?: any;
};

const INTRO_MESSAGE: Message = {
  id: "intro",
  role: "assistant",
  content: "Xin chào! Tôi là SÓI F&B - Trợ lý nhà hàng F&B của bạn. Tôi có thể giúp bạn: Order món, gửi bếp, thanh toán và xem báo cáo.",
  timestamp: new Date(),
};

const CHAT_STORAGE_KEY = "soi-fb-chat-history";
const MAX_STORED_INTERACTIONS = 10;

function loadMessages(): Message[] {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [INTRO_MESSAGE];
    const parsed = JSON.parse(raw) as Message[];
    return [INTRO_MESSAGE, ...parsed.map(m => ({ ...m, timestamp: new Date(m.timestamp) }))];
  } catch {
    return [INTRO_MESSAGE];
  }
}

function saveMessages(msgs: Message[]) {
  try {
    const withoutIntro = msgs.filter(m => m.id !== "intro");
    const recent = withoutIntro.slice(-(MAX_STORED_INTERACTIONS * 2));
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(recent));
  } catch {}
}

export default function Home() {
  const { data: orders } = useOrders();
  const { data: kitchenOrders } = useKitchenOrders();
  const { data: menuItems } = useMenuItems();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [input, setInput] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [pendingAction, setPendingAction] = useState<{
    action: string;
    data: any;
    messageId: string;
  } | null>(null);
  const [confirmingLike, setConfirmingLike] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const chatMutation = useProcessChat();

  const handleSpeechResult = (text: string) => {
    setInput(text);
    handleSend(text);
  };

  const { isListening, listen, stop, speak, supported } =
    useSpeech(handleSpeechResult);

  const handleToggleVoice = () => {
    if (isListening) {
      stop();
    } else {
      listen();
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatMutation.isPending]);

  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  const handleSend = (textToSend = input) => {
    if (!textToSend.trim() || chatMutation.isPending) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    const history = messages
      .filter(m => m.id !== "intro")
      .slice(-20)
      .map(m => ({ role: m.role, content: m.content }));

    chatMutation.mutate({ message: textToSend, history }, {
      onSuccess: (data) => {
        const messageId = (Date.now() + 1).toString();
        const aiMsg: Message = {
          id: messageId,
          role: "assistant",
          content: data.reply,
          timestamp: new Date(),
          action:
            data.action !== "NONE" && data.action !== "QUERY"
              ? data.action
              : undefined,
          actionData: data.data,
        };
        setMessages((prev) => [...prev, aiMsg]);

        if (data.action && data.action !== "NONE" && data.action !== "QUERY") {
          setPendingAction({ action: data.action, data: data.data, messageId });
          executeAction(data.action, data.data);
        }

        if (autoSpeak) {
          speak(data.reply);
        }
      },
    });
  };

  const executeAction = async (action: string, data: any) => {
    try {
      let endpoint = "";
      let method = "POST";
      let body: any = {};

      switch (action) {
        case "CREATE_ORDER":
          endpoint = "/api/orders";
          body = {
            tableNumber: data.tableNumber,
            items: data.items,
            totalAmount: data.totalAmount || 0,
            customerName: data.customerName,
            phone: data.phone,
            notes: data.notes,
            status: "Pending",
            paymentStatus: "Unpaid",
          };
          break;
        case "SEND_TO_KITCHEN":
          endpoint = `/api/orders/${data.orderId}/send-to-kitchen`;
          body = {};
          break;
        case "PAY_ORDER":
          endpoint = `/api/orders/${data.orderId}/pay`;
          body = { method: data.paymentMethod || "cash" };
          break;
        case "CREATE_MENU_ITEM":
          endpoint = "/api/products";
          body = {
            name: data.name,
            price: Number(data.price),
            categoryId: data.categoryId || null,
            description: data.description || null,
            isAvailable: true,
          };
          break;
        case "DELETE_ORDER":
          endpoint = `/api/orders/${data.orderId}`;
          method = "DELETE";
          break;
        default:
          break;
      }

      if (endpoint) {
        const res = await fetch(endpoint, {
          method,
          headers:
            method !== "DELETE" ? { "Content-Type": "application/json" } : {},
          body: method !== "DELETE" ? JSON.stringify(body) : undefined,
          credentials: "include",
        });

        if (res.ok) {
          queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
          queryClient.invalidateQueries({ queryKey: ["/api/products"] });
          queryClient.invalidateQueries({ queryKey: ["/api/kitchen"] });

          const confirmMsg: Message = {
            id: (Date.now() + 2).toString(),
            role: "assistant",
            content: `✅ Đã th��c hiện: ${action.replace(/_/g, " ").toLowerCase()}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, confirmMsg]);
        }
      }
    } catch (err) {
      console.error("Failed to execute action:", err);
    } finally {
      setPendingAction(null);
    }
  };

  const handleLikeConfirm = async () => {
    if (!pendingAction) return;

    setConfirmingLike(true);
    const { action, data } = pendingAction;

    try {
      let endpoint = "";
      let method = "POST";
      let body: any = {};

      switch (action) {
        case "CREATE_ORDER":
          endpoint = "/api/orders";
          body = {
            tableNumber: data.tableNumber,
            items: data.items,
            totalAmount: data.totalAmount || 0,
            customerName: data.customerName,
            phone: data.phone,
            notes: data.notes,
            status: "Pending",
            paymentStatus: "Unpaid",
          };
          break;
        case "SEND_TO_KITCHEN":
          endpoint = `/api/orders/${data.orderId}/send-to-kitchen`;
          body = {};
          break;
        case "PAY_ORDER":
          endpoint = `/api/orders/${data.orderId}/pay`;
          body = { method: data.paymentMethod || "cash" };
          break;
        case "CREATE_MENU_ITEM":
          endpoint = "/api/products";
          body = {
            name: data.name,
            price: Number(data.price),
            categoryId: data.categoryId || null,
            description: data.description || null,
            isAvailable: true,
          };
          break;
        case "DELETE_ORDER":
          endpoint = `/api/orders/${data.orderId}`;
          method = "DELETE";
          break;
        default:
          break;
      }

      if (endpoint) {
        const res = await fetch(endpoint, {
          method,
          headers:
            method !== "DELETE" ? { "Content-Type": "application/json" } : {},
          body: method !== "DELETE" ? JSON.stringify(body) : undefined,
          credentials: "include",
        });

        if (res.ok) {
          queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
          queryClient.invalidateQueries({ queryKey: ["/api/products"] });
          queryClient.invalidateQueries({ queryKey: ["/api/kitchen"] });

          const confirmMsg: Message = {
            id: (Date.now() + 2).toString(),
            role: "assistant",
            content: `✅ Đã xác nhận thực hiện: ${action.replace(/_/g, " ").toLowerCase()}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, confirmMsg]);
        }
      }
    } catch (err) {
      console.error("Failed to confirm action:", err);
    }
  };

  const activeOrders =
    orders?.filter((o) => o.status !== "Complete").length || 0;
  const kitchenActive =
    kitchenOrders?.filter((o) => o.status !== "Done").length || 0;
  const todayRevenue =
    orders
      ?.filter((o) => o.paymentStatus === "Paid")
      .reduce((acc, o) => acc + o.totalAmount, 0) || 0;

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-amber-500 tracking-wider">
            Trợ Lý AI
          </h2>
          <p className="text-muted-foreground mt-1 text-xs font-semibold">
            Quản lý nhà hàng F&B của bạn bằng giọng nói và chatbot
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (confirm("Xóa toàn bộ lịch sử trò chuyện?")) {
                localStorage.removeItem(CHAT_STORAGE_KEY);
                setMessages([INTRO_MESSAGE]);
              }
            }}
            className="p-3 rounded-2xl bg-gray-100 hover:bg-red-50 hover:text-red-500 text-gray-600 transition-all duration-300 shadow-sm border border-gray-200/50"
            title="Xóa lịch sử trò chuyện"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setAutoSpeak(!autoSpeak)}
            className={cn(
              "p-3 rounded-2xl transition-all duration-300 shadow-sm border",
              autoSpeak
                ? "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20"
                : "bg-gray-100 text-gray-500 border-gray-200/50 hover:bg-gray-200",
            )}
            title={autoSpeak ? "Tắt tự động đọc" : "Bật tự động đọc"}
          >
            {autoSpeak ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* 4 Cards Thống kê kiểu Pro Max */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-white dark:bg-card rounded-2xl p-3 border border-orange-100 dark:border-orange-950 flex flex-col justify-between items-center text-center shadow-sm hover:shadow-md hover:border-orange-300 transition-all duration-300">
          <div className="w-7 h-7 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center mb-1">
            <UtensilsCrossed className="w-3.5 h-3.5" />
          </div>
          <span className="text-lg font-black text-orange-600">
            {activeOrders}
          </span>
          <p className="text-[9px] font-extrabold text-orange-500 uppercase tracking-widest mt-0.5">Đơn đang chạy</p>
        </div>
        <div className="bg-white dark:bg-card rounded-2xl p-3 border border-red-100 dark:border-red-950 flex flex-col justify-between items-center text-center shadow-sm hover:shadow-md hover:border-red-300 transition-all duration-300">
          <div className="w-7 h-7 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center mb-1">
            <ChefHat className="w-3.5 h-3.5" />
          </div>
          <span className="text-lg font-black text-red-600">
            {kitchenActive}
          </span>
          <p className="text-[9px] font-extrabold text-red-500 uppercase tracking-widest mt-0.5">Đang nấu</p>
        </div>
        <div className="bg-white dark:bg-card rounded-2xl p-3 border border-blue-100 dark:border-blue-950 flex flex-col justify-between items-center text-center shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-300">
          <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center mb-1">
            <UtensilsCrossed className="w-3.5 h-3.5" />
          </div>
          <span className="text-lg font-black text-blue-600">
            {menuItems?.length || 0}
          </span>
          <p className="text-[9px] font-extrabold text-blue-500 uppercase tracking-widest mt-0.5">Thực đơn</p>
        </div>
        <div className="bg-white dark:bg-card rounded-2xl p-3 border border-emerald-100 dark:border-emerald-950 flex flex-col justify-between items-center text-center shadow-sm hover:shadow-md hover:border-emerald-300 transition-all duration-300">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-1">
            <DollarSign className="w-3.5 h-3.5" />
          </div>
          <span className="text-base font-black text-emerald-600 truncate max-w-full">
            {formatCurrency(todayRevenue)}
          </span>
          <p className="text-[9px] font-extrabold text-emerald-500 uppercase tracking-widest mt-0.5">Doanh thu</p>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto pr-2 pb-3 space-y-3 min-h-0 scrollbar-thin scrollbar-thumb-gray-200">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={cn(
                "flex gap-3 max-w-[85%]",
                msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto",
              )}
            >
              <div
                className={cn(
                  "flex-shrink-0 w-9 h-9 rounded-2xl flex items-center justify-center shadow-sm",
                  msg.role === "user"
                    ? "bg-amber-500 text-black font-black"
                    : "bg-white dark:bg-card border border-gray-200/50 dark:border-border",
                )}
              >
                {msg.role === "user" ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4 text-amber-500" />
                )}
              </div>
              <div
                className={cn(
                  "p-3.5 rounded-2xl shadow-sm leading-relaxed text-sm",
                  msg.role === "user"
                    ? "bg-amber-500 text-black rounded-tr-none font-medium"
                    : "bg-white dark:bg-card border border-gray-100 dark:border-border text-gray-800 dark:text-foreground rounded-tl-none",
                )}
              >
                <p className="whitespace-pre-line">{msg.content}</p>
                {msg.action && (
                  <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-border/30">
                    <span className="text-[10px] font-black text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Action: {msg.action.replace(/_/g, " ")}
                    </span>
                  </div>
                )}
                <span
                  className={cn(
                    "text-[9px] font-bold mt-2 block opacity-40 uppercase tracking-widest",
                    msg.role === "user" ? "text-right" : "text-left",
                  )}
                >
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {msg.action &&
                msg.action !== "NONE" &&
                msg.action !== "QUERY" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 mt-1 ml-12"
                  >
                    <button
                      onClick={handleLikeConfirm}
                      disabled={
                        confirmingLike || pendingAction?.messageId !== msg.id
                      }
                      className={cn(
                        "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 shadow-sm",
                        pendingAction?.messageId === msg.id
                          ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-md hover:shadow-emerald-500/20 active:scale-[0.98]"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200",
                      )}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      {confirmingLike && pendingAction?.messageId === msg.id
                        ? "ĐANG LÀM..."
                        : "XÁC NHẬN CHẠY"}
                    </button>
                  </motion.div>
                )}
            </motion.div>
          ))}
          {chatMutation.isPending && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3 max-w-[85%] mr-auto"
            >
              <div className="flex-shrink-0 w-9 h-9 rounded-2xl bg-white dark:bg-card border border-gray-200/50 flex items-center justify-center shadow-sm">
                <Bot className="w-4 h-4 text-amber-500 animate-pulse" />
              </div>
              <div className="p-3.5 rounded-2xl bg-white dark:bg-card border border-gray-100 dark:border-border rounded-tl-none flex items-center gap-1.5 shadow-sm">
                <div
                  className="w-1.5 h-1.5 rounded-full bg-amber-500/60 animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <div
                  className="w-1.5 h-1.5 rounded-full bg-amber-500/60 animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <div
                  className="w-1.5 h-1.5 rounded-full bg-amber-500/60 animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div className="flex items-end gap-3 relative shrink-0 pt-2 pb-1">
        <div className="flex-1 bg-white dark:bg-card border border-gray-200 dark:border-border rounded-[2rem] p-2 shadow-sm focus-within:ring-4 focus-within:ring-amber-500/10 focus-within:border-amber-500 transition-all duration-300 flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Nói gì đó hoặc yêu cầu order..."
            className="w-full max-h-32 min-h-[46px] bg-transparent resize-none outline-none py-3 px-4 text-sm text-foreground placeholder:text-gray-400"
            rows={1}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || chatMutation.isPending}
            className="flex-shrink-0 w-11 h-11 rounded-2xl bg-amber-500 text-black flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-600 hover:shadow-lg active:scale-95 transition-all duration-200 mb-0.5 mr-0.5"
          >
            <Send className="w-4.5 h-4.5 ml-0.5" />
          </button>
        </div>

        {supported && (
          <div className="flex flex-col-reverse items-center gap-1.5">
            <button
              onClick={handleToggleVoice}
              className={cn(
                "flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 text-black shadow-md",
                isListening
                  ? "bg-amber-500 animate-pulse-ring"
                  : "bg-amber-400 hover:bg-amber-500 hover:shadow-lg active:scale-95",
              )}
            >
              <Mic className={cn("w-5 h-5", isListening && "scale-110")} />
            </button>
            <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap uppercase tracking-wider">
              {isListening ? "ĐANG NGHE" : "BẤM NÓI"}
            </span>
          </div>
        )}
      </div>

      {/* Phím tắt nhanh */}
      <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl p-2.5 border border-amber-200/50 dark:border-amber-950/40 shrink-0 mt-2">
        <div className="grid grid-cols-6 gap-1.5">
          {[
            { label: "Order bàn", cmd: "order bàn 5" },
            { label: "Gửi bếp", cmd: "gửi bếp bàn" },
            { label: "Thanh toán", cmd: "thanh toán bàn" },
            { label: "Xem đơn", cmd: "hiển thị đơn hàng" },
            { label: "Thêm món", cmd: "thêm món vào menu" },
            { label: "Báo cáo", cmd: "báo cáo hôm nay" },
          ].map((item) => (
            <button
              key={item.cmd}
              onClick={() => handleSend(item.cmd)}
              disabled={chatMutation.isPending}
              className="px-2 py-2 rounded-xl bg-white dark:bg-card hover:bg-amber-500/10 text-[10px] font-black text-amber-800 dark:text-amber-500 border border-amber-200/60 dark:border-border/30 transition-colors shadow-sm hover:border-amber-400 disabled:opacity-50"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
