import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgentHistory } from "@/hooks/use-agent-history";

const MODELS = [
  { key: "step-3.5-flash", label: "Step-3.5 Flash", tokens: "16K" },
  { key: "minimax-m2", label: "MiniMax M2", tokens: "8K" },
  { key: "gemma-2-2b-it", label: "Gemma-2-2B", tokens: "4K" },
];

interface AgentResponse {
  reply: string;
  action?: string;
  data?: unknown;
}

export default function Agent() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [model, setModel] = useState("step-3.5-flash");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, addMessage, clearHistory } = useAgentHistory("page");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    setLoading(true);
    setError("");

    addMessage({ role: "user", content: userMsg });

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          model,
          history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) throw new Error("Lỗi server");

      const data: AgentResponse = await res.json();
      addMessage({ role: "assistant", content: data.reply });
    } catch {
      setError("Không thể kết nối với Agent. Hãy thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Bot className="w-7 h-7 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sói Agent</h1>
            <p className="text-sm text-muted-foreground">
              AI Assistant • {messages.length > 0 ? `${messages.length} tin nhắn` : "Gemma-2-2b-it"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="text-xs bg-secondary border border-border rounded px-3 py-1.5 cursor-pointer"
          >
            {MODELS.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
          {messages.length > 0 && (
            <button
              onClick={clearHistory}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Xóa lịch sử
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-lg font-medium">Chào bạn!</p>
            <p className="text-muted-foreground text-sm mt-1 max-w-md">
              Tôi là <span className="text-amber-500 font-semibold">Sói Agent</span> - trợ lý AI quản lý nhà hàng.
              Tôi có thể giúp bạn quản lý Orders, Menu, Tables, Kitchen... và lưu trữ 10 tin nhắn gần nhất trong bộ nhớ dài hạn.
            </p>
            <div className="mt-4 text-sm text-muted-foreground/60 space-y-1">
              <p>Ví dụ: "tạo mặt hàng khoai tây lắc giá 45k"</p>
              <p>Ví dụ: "tạo đơn hàng cho anh Tuấn 3 ly trà sữa"</p>
              <p>Ví dụ: "báo cáo hôm nay có bao nhiêu đơn"</p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-4 h-4 text-black" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[75%] rounded-2xl px-4 py-3",
                msg.role === "user"
                  ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-black rounded-br-md"
                  : "bg-secondary rounded-bl-md"
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center">
              <Bot className="w-4 h-4 text-black" />
            </div>
            <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập tin nhắn cho Sói Agent..."
          className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}