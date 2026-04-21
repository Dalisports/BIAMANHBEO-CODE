import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, Loader2, RefreshCw, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  action?: {
    type: "CONFIRM" | "EXECUTE" | "REPLY" | "ERROR" | "SUCCESS";
    apiPath?: string;
    apiMethod?: string;
    apiBody?: any;
    confirmText?: string;
    message?: string;
  };
}

interface ContextData {
  menuItems: { id: number; name: string; price: number }[];
  activeOrders: { id: number; table: string; items: any[]; total: number; status: string }[];
  pendingCount: number;
}

export default function GauAssistant() {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem("gau_chat_history");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
      }
    } catch (e) {
      console.error("Failed to load chat history:", e);
    }
    return [];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState<ContextData | null>(null);
  const [showContext, setShowContext] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load context on mount
  useEffect(() => {
    fetchContext();
  }, []);

  // Save to localStorage whenever messages change
  useEffect(() => {
    try {
      const toSave = messages.slice(-20); // Keep last 20 messages
      localStorage.setItem("gau_chat_history", JSON.stringify(toSave));
    } catch (e) {
      console.error("Failed to save chat history:", e);
    }
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchContext = async () => {
    try {
      const res = await fetch("/api/gau-assistant/context");
      const data = await res.json();
      setContext(data);
    } catch (err) {
      console.error("Failed to fetch context:", err);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Call Gau Assistant API
      const res = await fetch("/api/gau-assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input.trim(),
          userId: 1,
          userRole: "employee"
        }),
      });

      const data = await res.json();

      let assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      if (data.action === "CONFIRM") {
        assistantMessage = {
          ...assistantMessage,
          content: data.confirmText || "Xác nhận thực hiện?",
          action: { type: "CONFIRM", ...data },
        };
      } else if (data.action === "EXECUTE" && data.apiPath && data.apiMethod) {
        // Execute the action
        try {
          const executeRes = await fetch("/api/gau-assistant/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          const executeData = await executeRes.json();

          if (executeData.success) {
            assistantMessage = {
              ...assistantMessage,
              content: executeData.action === "ORDER_CREATED" 
                ? `✅ Đã tạo đơn cho ${executeData.data.tableNumber}`
                : executeData.action === "ORDER_PAID"
                ? `✅ Đã thanh toán cho bàn ${executeData.data.tableNumber}`
                : executeData.action === "ORDER_MOVED"
                ? `✅ Đã chuyển bàn ${executeData.data.tableNumber}`
                : executeData.action === "SENT_TO_KITCHEN"
                ? `✅ Đã gửi bếp cho đơn ${data.apiPath.split("/")[2]}`
                : "✅ Thực hiện thành công!",
              action: { type: "SUCCESS", ...executeData },
            };
          } else {
            assistantMessage = {
              ...assistantMessage,
              content: "❌ Thực hiện thất bại",
              action: { type: "ERROR", message: "Execution failed" },
            };
          }
        } catch (execErr) {
          assistantMessage = {
            ...assistantMessage,
            content: "❌ Lỗi khi thực hiện lệnh",
            action: { type: "ERROR", message: "Execution error" },
          };
        }
      } else if (data.action === "REPLY" || data.action === "ERROR") {
        assistantMessage = {
          ...assistantMessage,
          content: data.message || "Không hiểu yêu cầu",
          action: { type: data.action, message: data.message },
        };
      } else {
        // Try to parse as message
        assistantMessage = {
          ...assistantMessage,
          content: data.message || data.content || JSON.stringify(data),
          action: { type: "REPLY", message: data.message || data.content },
        };
      }

      setMessages(prev => [...prev, assistantMessage]);

      // If action is CONFIRM, we need to handle it differently
      if (data.action === "CONFIRM" && data.apiPath && data.apiMethod) {
        // Auto-execute after showing confirmation? Or wait for user?
        // For now, we'll show the confirmation message
      }

    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "❌ Lỗi kết nối. Vui lòng thử lại.",
        timestamp: new Date(),
        action: { type: "ERROR", message: "Connection error" },
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { label: "Order bàn mới", example: "Tạo order bàn 5: 2 gà rán, 1 cocacola" },
    { label: "Thanh toán", example: "Thanh toán bàn 3" },
    { label: "Đổi bàn", example: "Chuyển bàn 3 sang bàn 7" },
    { label: "Gửi bếp", example: "Gửi bếp bàn 5" },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Bot className="w-7 h-7 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Gấu Assistant 🐻</h1>
            <p className="text-sm text-muted-foreground">Trợ lý AI cho nhà hàng</p>
          </div>
        </div>
        <button
          onClick={() => setShowContext(!showContext)}
          className={cn(
            "px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2",
            showContext 
              ? "bg-primary text-primary-foreground" 
              : "bg-secondary text-foreground hover:bg-secondary/80"
          )}
        >
          {showContext ? "Ẩn" : "Xem"} Menu ({context?.menuItems?.length || 0} món)
        </button>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mb-4">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => setInput(action.example)}
            className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 text-sm font-medium hover:bg-amber-200 transition-colors"
          >
            {action.label}
          </button>
        ))}
        <button
          onClick={fetchContext}
          className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 text-sm font-medium hover:bg-blue-200 transition-colors flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          Cập nhật
        </button>
      </div>

      {/* Context Panel */}
      <AnimatePresence>
        {showContext && context && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="bg-card rounded-2xl border border-border p-4">
              <h3 className="font-bold mb-3 text-sm uppercase tracking-wider text-muted-foreground">
                Menu ({context.menuItems.length} món)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {context.menuItems.slice(0, 20).map((item) => (
                  <div 
                    key={item.id} 
                    className="flex justify-between items-center px-3 py-2 bg-secondary/50 rounded-lg text-sm"
                  >
                    <span className="font-medium">{item.name}</span>
                    <span className="text-muted-foreground">{formatCurrency(item.price)}</span>
                  </div>
                ))}
              </div>
              {context.pendingCount > 0 && (
                <p className="mt-3 text-sm text-orange-600 font-medium">
                  ⚠️ Có {context.pendingCount} đơn đang chờ xử lý
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-card rounded-3xl border border-border p-4 mb-4 min-h-[400px]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-100 to-yellow-100 flex items-center justify-center mb-4">
              <Bot className="w-10 h-10 text-amber-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">Chào bạn! 👋</h3>
            <p className="text-muted-foreground max-w-sm mb-6">
              Mình là Gấu 🐻, trợ lý AI của nhà hàng. Hỏi mình bất cứ điều gì về order, thanh toán, đổi bàn nhé!
            </p>
            <div className="text-sm text-left bg-secondary/50 rounded-xl p-4 max-w-md">
              <p className="font-semibold mb-2">Ví dụ câu hỏi:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• "Tạo order bàn 5: 2 gà rán, 1 cocacola"</li>
                <li>• "Thanh toán bàn 3 bằng chuyển khoản"</li>
                <li>• "Chuyển bàn 3 sang bàn 7"</li>
                <li>• "Gửi bếp bàn 5"</li>
                <li>• "Kiểm tra đơn bàn 2"</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-3",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0",
                  msg.role === "user" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-gradient-to-br from-amber-400 to-yellow-500"
                )}>
                  {msg.role === "user" ? (
                    <span className="text-sm font-bold">B</span>
                  ) : (
                    <Bot className="w-5 h-5 text-black" />
                  )}
                </div>
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3",
                  msg.role === "user" 
                    ? "bg-primary text-primary-foreground rounded-tr-none" 
                    : "bg-secondary rounded-tl-none"
                )}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p className={cn(
                    "text-xs mt-1",
                    msg.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}>
                    {msg.timestamp.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </motion.div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-black" />
                </div>
                <div className="bg-secondary rounded-2xl rounded-tl-none px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                    <span className="text-sm text-muted-foreground">Gấu đang suy nghĩ...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-3">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="Nhắn cho Gấu... ví dụ: 'Order bàn 5: 2 gà rán'"
          className="flex-1 px-4 py-3 rounded-2xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
          disabled={isLoading}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || isLoading}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 font-bold text-black hover:shadow-lg hover:shadow-amber-500/30 transition-all disabled:opacity-50 disabled:hover:shadow-none"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}