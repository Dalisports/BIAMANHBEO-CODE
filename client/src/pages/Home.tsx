import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Send, Bot, User, Volume2, VolumeX, UtensilsCrossed, ChefHat, DollarSign, Clock, ThumbsUp } from "lucide-react";
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

export default function Home() {
  const { data: orders } = useOrders();
  const { data: kitchenOrders } = useKitchenOrders();
  const { data: menuItems } = useMenuItems();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "intro",
      role: "assistant",
      content: "Xin chào! Tôi là SÓI F&B - Trợ lý nhà hàng F&B của bạn. Tôi có thể giúp bạn: Order món, gửi bếp, thanh toán và xem báo cáo.",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [pendingAction, setPendingAction] = useState<{ action: string; data: any; messageId: string } | null>(null);
  const [confirmingLike, setConfirmingLike] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const chatMutation = useProcessChat();
  
  const handleSpeechResult = (text: string) => {
    setInput(text);
    handleSend(text);
  };

  const { isListening, listen, stop, speak, supported } = useSpeech(handleSpeechResult);
  const [isPressing, setIsPressing] = useState(false);

  const handleMouseDown = () => {
    setIsPressing(true);
    listen();
  };

  const handleMouseUp = () => {
    setIsPressing(false);
    stop();
  };

  const handleMouseLeave = () => {
    if (isPressing) {
      setIsPressing(false);
      stop();
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatMutation.isPending]);

  const handleSend = (textToSend = input) => {
    if (!textToSend.trim() || chatMutation.isPending) return;
    
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    chatMutation.mutate(textToSend, {
      onSuccess: (data) => {
        const messageId = (Date.now() + 1).toString();
        const aiMsg: Message = {
          id: messageId,
          role: "assistant",
          content: data.reply,
          timestamp: new Date(),
          action: data.action !== "NONE" && data.action !== "QUERY" ? data.action : undefined,
          actionData: data.data
        };
        setMessages(prev => [...prev, aiMsg]);
        
        if (data.action && data.action !== "NONE" && data.action !== "QUERY") {
          setPendingAction({ action: data.action, data: data.data, messageId });
        }
        
        if (autoSpeak) {
          speak(data.reply);
        }
      }
    });
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
            paymentStatus: "Unpaid"
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
            isAvailable: true
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
          headers: method !== "DELETE" ? { "Content-Type": "application/json" } : {},
          body: method !== "DELETE" ? JSON.stringify(body) : undefined,
          credentials: "include"
        });
        
        if (res.ok) {
          queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
          queryClient.invalidateQueries({ queryKey: ["/api/products"] });
          queryClient.invalidateQueries({ queryKey: ["/api/kitchen"] });
          
          const confirmMsg: Message = {
            id: (Date.now() + 2).toString(),
            role: "assistant",
            content: `✅ Đã xác nhận thực hiện: ${action.replace(/_/g, " ").toLowerCase()}`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, confirmMsg]);
        }
      }
    } catch (err) {
      console.error("Failed to confirm action:", err);
    } finally {
      setConfirmingLike(false);
      setPendingAction(null);
    }
  };

  const activeOrders = orders?.filter(o => o.status !== "Complete").length || 0;
  const kitchenActive = kitchenOrders?.filter(o => o.status !== "Done").length || 0;
  const todayRevenue = orders?.filter(o => o.paymentStatus === "Paid")
    .reduce((acc, o) => acc + o.totalAmount, 0) || 0;

  return (
    <div className="h-full flex flex-col max-h-[calc(100vh-2rem)] md:max-h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-3xl font-sans font-bold text-foreground">Trợ Lý AI</h2>
          <p className="text-muted-foreground mt-1 text-sm">Quản lý nhà hàng F&B của bạn</p>
        </div>
        <button
          onClick={() => setAutoSpeak(!autoSpeak)}
          className={cn(
            "p-3 rounded-full transition-all duration-300",
            autoSpeak ? "bg-accent/10 text-accent hover:bg-accent/20" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
          )}
          title={autoSpeak ? "Tắt tự động đọc" : "Bật tự động đọc"}
        >
          {autoSpeak ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-2">
        <div className="bg-orange-50 rounded-lg p-2 border border-orange-200 text-center">
          <UtensilsCrossed className="w-3 h-3 text-orange-500 mx-auto mb-1" />
          <span className="text-lg font-bold text-orange-600">{activeOrders}</span>
          <p className="text-[10px] text-orange-600">Đơn đang xử lý</p>
        </div>
        <div className="bg-red-50 rounded-lg p-2 border border-red-200 text-center">
          <ChefHat className="w-3 h-3 text-red-500 mx-auto mb-1" />
          <span className="text-lg font-bold text-red-600">{kitchenActive}</span>
          <p className="text-[10px] text-red-600">Đang nấu</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-2 border border-blue-200 text-center">
          <UtensilsCrossed className="w-3 h-3 text-blue-500 mx-auto mb-1" />
          <span className="text-lg font-bold text-blue-600">{menuItems?.length || 0}</span>
          <p className="text-[10px] text-blue-600">Món trong menu</p>
        </div>
        <div className="bg-green-50 rounded-lg p-2 border border-green-200 text-center">
          <DollarSign className="w-3 h-3 text-green-500 mx-auto mb-1" />
          <span className="text-lg font-bold text-green-600">{formatCurrency(todayRevenue)}</span>
          <p className="text-[10px] text-green-600">Doanh thu</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-2 space-y-2 min-h-0">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={cn(
                "flex gap-4 max-w-[85%]",
                msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div className={cn(
                "flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm",
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border"
              )}>
                {msg.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5 text-primary" />}
              </div>
              <div className={cn(
                "p-4 rounded-2xl shadow-sm leading-relaxed",
                msg.role === "user" 
                  ? "bg-primary text-primary-foreground rounded-tr-sm" 
                  : "bg-card border border-border text-foreground rounded-tl-sm"
              )}>
                <p>{msg.content}</p>
                {msg.action && (
                  <div className="mt-3 pt-2 border-t border-border/50">
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                      {msg.action.replace(/_/g, " ")}
                    </span>
                  </div>
                )}
                <span className={cn(
                  "text-[10px] font-medium mt-2 block opacity-50",
                  msg.role === "user" ? "text-right" : "text-left"
                )}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {msg.action && msg.action !== "NONE" && msg.action !== "QUERY" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 mt-1 ml-14"
                >
                  <button
                    onClick={handleLikeConfirm}
                    disabled={confirmingLike || pendingAction?.messageId !== msg.id}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                      pendingAction?.messageId === msg.id
                        ? "bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/30"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    {confirmingLike && pendingAction?.messageId === msg.id ? "Đang xác nhận..." : "Xác nhận"}
                  </button>
                </motion.div>
              )}
            </motion.div>
          ))}
          {chatMutation.isPending && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-4 max-w-[85%] mr-auto"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-card border border-border flex items-center justify-center shadow-sm">
                <Bot className="w-5 h-5 text-primary animate-pulse" />
              </div>
              <div className="p-4 rounded-2xl bg-card border border-border rounded-tl-sm flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={chatEndRef} />
      </div>

      <div className="flex items-end gap-2 relative shrink-0">
        <div className="flex-1 bg-card border border-border rounded-3xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all duration-300 flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Hãy ra lệnh cho nhà hàng..."
            className="w-full max-h-32 min-h-[48px] bg-transparent resize-none outline-none py-3 px-4 text-foreground placeholder:text-muted-foreground"
            rows={1}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || chatMutation.isPending}
            className="flex-shrink-0 w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 mb-0.5 mr-0.5"
          >
            <Send className="w-5 h-5 ml-1" />
          </button>
        </div>

        {supported && (
          <div className="flex flex-col-reverse items-center gap-2">
            <button
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onTouchStart={handleMouseDown}
              onTouchEnd={handleMouseUp}
              className={cn(
                "flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 text-white shadow-lg",
                isListening 
                  ? "bg-accent animate-pulse-ring" 
                  : "bg-primary hover:bg-primary/90 hover:shadow-xl hover:-translate-y-1 active:translate-y-0"
              )}
            >
              <Mic className={cn("w-6 h-6", isListening && "scale-110")} />
            </button>
            <span className="text-xs text-muted-foreground whitespace-nowrap italic">
              {isListening ? "Đang nghe..." : "Bấm giữ để nói"}
            </span>
          </div>
        )}
      </div>

      <div className="bg-orange-50 rounded-t-2xl p-2 border-t-2 border-orange-200 shrink-0">
        <div className="grid grid-cols-3 gap-1">
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
              className="px-2 py-1.5 rounded-lg bg-white hover:bg-orange-100 text-xs font-semibold text-orange-700 hover:text-orange-800 border border-orange-200 transition-colors disabled:opacity-50"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
