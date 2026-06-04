import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, X, MessageCircle, Trash2, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgentHistory } from "@/hooks/use-agent-history";
import { getAuthHeaders } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { useSpeech } from "@/hooks/use-speech";

interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
}

export function AgentBubble() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [models, setModels] = useState<AIModel[]>([]);
  const [model, setModel] = useState("step-3.5-flash");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { messages, addMessage, updateMessage, clearHistory } = useAgentHistory("bubble");

  const { isListening, listen, stop, supported, interimText, speak } = useSpeech((text) => {
    setInput((prev) => (prev ? prev + " " + text : text));
  });

  // Fetch models on mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await fetch("/api/gau-assistant/models", {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.models) {
            setModels(data.models);
            // Select default model if it exists in the fetched list
            if (data.models.length > 0 && !data.models.some((m: any) => m.id === model)) {
              setModel(data.models[0].id);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch models:", err);
      }
    };
    fetchModels();
  }, []);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [isOpen, messages.length]);

  const sendMessage = async (e?: React.FormEvent, messageText?: string) => {
    e?.preventDefault();
    const text = messageText || input.trim();
    if (!text || loading) return;

    setInput("");
    setLoading(true);
    setError("");

    addMessage({ role: "user", content: text });

    try {
      const res = await fetch("/api/gau-assistant/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          message: text,
          model,
        }),
      });

      if (!res.ok) throw new Error("Lỗi server");

      const data = await res.json();
      let reply = "";
      let action: any = undefined;

      if (data.action === "CONFIRM") {
        reply = data.confirmText || "Xác nhận thực hiện?";
        action = { type: "CONFIRM", ...data };
      } else if (data.action === "REPLY" || data.action === "ERROR") {
        reply = data.message || "Không hiểu yêu cầu";
        action = { type: data.action, message: data.message };
      } else {
        reply = data.message || data.content || JSON.stringify(data);
        action = { type: "REPLY", message: reply };
      }

      if (reply) {
        addMessage({ 
          role: "assistant", 
          content: reply,
          action
        });
      }
    } catch {
      setError("Kết nối thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async (index: number, action: any) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/gau-assistant/execute", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify(action),
      });
      const executeData = await res.json();

      if (executeData.success) {
        const content = executeData.action === "ORDER_CREATED" 
          ? `✅ Đã tạo đơn cho bàn ${executeData.data.tableNumber}`
          : executeData.action === "ORDER_PAID"
          ? `✅ Đã thanh toán cho bàn ${executeData.data.tableNumber}`
          : executeData.action === "ORDER_MOVED"
          ? `✅ Đã chuyển bàn ${executeData.data.tableNumber}`
          : executeData.action === "SENT_TO_KITCHEN"
          ? `✅ Đã gửi bếp cho đơn`
          : "✅ Thực hiện thành công!";

        updateMessage(index, { action: undefined });
        addMessage({ role: "assistant", content });

        // Invalidate react-query cache to refresh POS screen
        queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
        queryClient.invalidateQueries({ queryKey: ["/api/kitchen"] });
      } else {
        setError("Thực hiện thất bại");
      }
    } catch (execErr) {
      console.error("Execute error:", execErr);
      setError("Lỗi kết nối khi thực hiện");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAction = (index: number) => {
    updateMessage(index, { action: undefined });
    addMessage({ role: "assistant", content: "❌ Đã hủy bỏ thao tác." });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="agent-bubble fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 shadow-2xl shadow-amber-500/40 flex items-center justify-center hover:scale-110 transition-transform duration-300 group"
        title="Gấu Assistant - Chat ngay"
      >
        <MessageCircle className="w-6 h-6 md:w-7 md:h-7 text-black group-hover:scale-110 transition-transform" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
      </button>
    );
  }

  return (
    <div className="agent-bubble fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 w-[calc(100vw-2rem)] md:w-96 h-[60vh] md:h-[28rem] min-h-[400px] flex flex-col bg-background rounded-2xl md:rounded-3xl shadow-2xl shadow-black/30 border border-border/50 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-amber-400 to-yellow-500">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center">
            <Bot className="w-6 h-6 text-black" />
          </div>
          <div>
            <h3 className="font-bold text-black text-sm">Gấu Assistant</h3>
            <p className="text-xs text-black/60">
              {messages.length > 0 ? `${messages.length} tin nhắn` : "AI Assistant"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="text-xs bg-black/20 text-black border-0 rounded px-2 py-1 font-medium cursor-pointer max-w-[110px]"
          >
            {models.length > 0 ? (
              models.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))
            ) : (
              <option value="step-3.5-flash">Step-3.5 Flash</option>
            )}
          </select>
          {messages.length > 0 && (
            <button
              onClick={clearHistory}
              className="p-2 rounded-full hover:bg-black/10 transition-colors"
              title="Xóa lịch sử"
            >
              <Trash2 className="w-4 h-4 text-black/60" />
            </button>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-full hover:bg-black/10 transition-colors"
          >
            <X className="w-5 h-5 text-black/70" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Bot className="w-12 h-12 text-amber-400/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Chào bạn!</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Tôi là <span className="text-amber-500 font-semibold">Gấu Assistant</span> - trợ lý AI quản lý nhà hàng
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-black" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-3 py-2 text-sm flex flex-col gap-1.5",
                msg.role === "user"
                  ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-black rounded-br-sm font-medium"
                  : "bg-secondary rounded-bl-sm"
              )}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              
              {msg.role === "assistant" && msg.action?.type === "CONFIRM" && (
                <div className="mt-1 flex gap-2 border-t border-border/30 pt-1.5">
                  <button
                    onClick={() => handleConfirmAction(i, msg.action)}
                    disabled={loading}
                    className="px-2 py-1 rounded bg-emerald-500 text-white font-bold text-[10px] hover:bg-emerald-600 transition-colors disabled:opacity-50"
                  >
                    Đồng ý
                  </button>
                  <button
                    onClick={() => handleCancelAction(i)}
                    disabled={loading}
                    className="px-2 py-1 rounded bg-red-100 text-red-600 font-bold text-[10px] hover:bg-red-200 transition-colors disabled:opacity-50"
                  >
                    Hủy bỏ
                  </button>
                </div>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-black" />
            </div>
            <div className="bg-secondary rounded-2xl rounded-bl-sm px-3 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        {error && <div className="text-center text-xs text-red-500 py-2">{error}</div>}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="flex gap-2 p-3 border-t border-border/50 relative">
        {supported && (
          <button
            type="button"
            onClick={isListening ? stop : listen}
            className={cn(
              "px-3 py-2 rounded-xl transition-all",
              isListening
                ? "bg-red-500 text-white animate-pulse-ring"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
            title={isListening ? "Tắt micro" : "Bật micro"}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        )}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isListening ? interimText || "Đang nghe..." : "Hỏi Gấu..."}
          className="flex-1 rounded-xl border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || (!input.trim() && !interimText)}
          className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}