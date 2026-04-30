import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, Loader2, X, Minimize2, Maximize2, ChevronDown, Brain, Trash2, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpeech } from "@/hooks/use-speech";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
}

interface FloatingChatBubbleProps {
  position?: "bottom-right" | "bottom-left";
  className?: string;
}

export function FloatingChatBubble({ position = "bottom-right", className }: FloatingChatBubbleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem("gau_bubble_history");
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
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("auto");
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [voiceInput, setVoiceInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice recognition handler
  const handleVoiceResult = useCallback((text: string) => {
    setVoiceInput(text);
  }, []);

  const speech = useSpeech(handleVoiceResult);

  // Memory system
  const [userMemory, setUserMemory] = useState<string>(() => {
    try {
      return localStorage.getItem("gau_bubble_memory") || "";
    } catch {
      return "";
    }
  });

  // Build memory from chat history
  useEffect(() => {
    if (messages.length < 3) return;

    const newMemory = buildMemoryFromHistory(messages);
    if (newMemory !== userMemory) {
      setUserMemory(newMemory);
      try {
        localStorage.setItem("gau_bubble_memory", newMemory);
      } catch (e) {
        console.error("Failed to save memory:", e);
      }
    }
  }, [messages]);

  // Load models on mount
  useEffect(() => {
    (async () => {
      const defaultModel = await fetchModels();
      const savedModel = localStorage.getItem("gau_selected_model");
      const validModels = ["fly/gemma2:2b", "ollama/gemma4:e4b"];
      if (savedModel && validModels.includes(savedModel)) {
        setSelectedModel(savedModel);
      } else {
        setSelectedModel(defaultModel);
      }
    })();
  }, []);

  const fetchModels = async () => {
    try {
      const res = await fetch("/api/gau-assistant/models");
      const data = await res.json();
      setModels(data.models.filter((m: AIModel) => !m.hidden));
      return data.defaultModel;
    } catch (err) {
      console.error("Failed to fetch models:", err);
      return "fly/gemma2:2b";
    }
  };

  // Save to localStorage
  useEffect(() => {
    try {
      const toSave = messages.slice(-50);
      localStorage.setItem("gau_bubble_history", JSON.stringify(toSave));
    } catch (e) {
      console.error("Failed to save chat history:", e);
    }
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    if (!isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isMinimized]);

  // Build memory from chat history
  function buildMemoryFromHistory(msgs: Message[]): string {
    const userMsgs = msgs.filter(m => m.role === "user");
    if (userMsgs.length < 3) return "";

    const memory: string[] = [];

    const tableMentions: Record<string, number> = {};
    userMsgs.forEach(m => {
      const tables = m.content.match(/bàn\s*(\d+)/gi);
      if (tables) {
        tables.forEach(t => {
          const num = t.match(/\d+/)?.[0];
          if (num) tableMentions[num] = (tableMentions[num] || 0) + 1;
        });
      }
    });

    const frequentTables = Object.entries(tableMentions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([table, count]) => `Bàn ${table} (${count} lần)`);

    if (frequentTables.length > 0) {
      memory.push(`- Thường thao tác với: ${frequentTables.join(", ")}`);
    }

    const actions: Record<string, number> = {};
    userMsgs.forEach(m => {
      const lower = m.content.toLowerCase();
      if (lower.includes("order") || lower.includes("đặt")) actions["Tạo order"] = (actions["Tạo order"] || 0) + 1;
      if (lower.includes("thêm")) actions["Thêm món"] = (actions["Thêm món"] || 0) + 1;
      if (lower.includes("thanh toán") || lower.includes("tính tiền")) actions["Thanh toán"] = (actions["Thanh toán"] || 0) + 1;
      if (lower.includes("gửi bếp")) actions["Gửi bếp"] = (actions["Gửi bếp"] || 0) + 1;
    });

    const topActions = Object.entries(actions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([action, count]) => `${action} (${count} lần)`);

    if (topActions.length > 0) {
      memory.push(`- Hành động thường dùng: ${topActions.join(", ")}`);
    }

    memory.push(`- Tổng tương tác: ${msgs.length}`);
    return memory.join("\n");
  }

  const processMessage = useCallback(async (text: string, conversationHistory: {role: string, content: string}[]) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/gau-assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: conversationHistory,
          memory: userMemory || undefined,
          model: selectedModel === "auto" ? undefined : selectedModel,
        }),
      });

      const data = await response.json();

      let content = "";

      if (data.action === "EXECUTE" && data.apiPath && data.apiMethod) {
        try {
          const executeRes = await fetch("/api/gau-assistant/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          const executeData = await executeRes.json();

          if (executeData.success) {
            if (executeData.action === "ORDER_CREATED") {
              content = `✅ Đã tạo đơn cho bàn ${executeData.data.tableNumber}`;
            } else if (executeData.action === "ORDER_PAID") {
              content = `✅ Đã thanh toán cho bàn ${executeData.data.tableNumber}`;
            } else if (executeData.action === "ORDER_MOVED") {
              content = `✅ Đã chuyển bàn ${executeData.data.tableNumber}`;
            } else if (executeData.action === "SENT_TO_KITCHEN") {
              content = `✅ Đã gửi bếp cho đơn`;
            } else if (executeData.action === "PRODUCT_CREATED") {
              content = `✅ Đã thêm "${executeData.data.name}" vào menu`;
            } else {
              content = "✅ Thực hiện thành công!";
            }
          } else {
            content = "❌ Thực hiện thất bại";
          }
        } catch (execErr) {
          console.error("Execute error:", execErr);
          content = "❌ Lỗi khi thực hiện lệnh";
        }
      } else if (data.message) {
        content = data.message;
      } else if (data.content) {
        content = data.content;
      } else if (data.action === "REPLY" || data.action === "ERROR") {
        content = data.message || "Không hiểu yêu cầu";
      } else if (data.success) {
        content = data.message || "Thực hiện thành công!";
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: content || "Xin lỗi, có lỗi xảy ra.",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "❌ Lỗi kết nối. Vui lòng thử lại.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [userMemory, selectedModel]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const conversationHistory = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    const text = input.trim();
    setInput("");
    await processMessage(text, conversationHistory);
  }, [input, isLoading, messages, processMessage]);

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem("gau_bubble_history");
  };

  const toggleVoice = useCallback(() => {
    if (isVoiceMode) {
      speech.stop();
      setIsVoiceMode(false);
      const text = speech.finalTextRef.current.trim();
      if (text && !isLoading) {
        setVoiceInput("");
        const conversationHistory = messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        }));
        processMessage(text, conversationHistory);
      }
    } else {
      if (!speech.supported) {
        speech.error || alert("Trình duyệt không hỗ trợ nhận diện giọng nói");
        return;
      }
      if (isLoading) return;
      setVoiceInput("");
      speech.listen();
      setIsVoiceMode(true);
    }
  }, [isVoiceMode, isLoading, speech, messages, processMessage]);

  return (
    <>
      {/* Floating Bubble Button - Gấu Avatar */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed z-50 rounded-full",
          "bg-gradient-to-br from-amber-400 to-yellow-500",
          "shadow-lg shadow-amber-500/40",
          "flex items-center justify-center",
          "hover:shadow-xl hover:shadow-amber-500/50",
          "transition-shadow duration-300",
          "w-14 h-14 sm:w-16 sm:h-16",
          "bottom-4 right-4 sm:bottom-6 sm:right-6",
          position === "bottom-right" ? "bottom-4 right-4 sm:right-6" : "bottom-4 left-4 sm:left-6",
          className
        )}
      >
        <Bot className="w-7 h-7 sm:w-8 sm:h-8 text-black" />
        <span className="absolute w-full h-full rounded-full bg-amber-400/30 animate-ping" />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "fixed z-50 flex flex-col bg-background border border-border rounded-3xl shadow-2xl",
              "w-[calc(100vw-32px)] max-w-[380px] h-[calc(100vh-120px)] max-h-[520px]",
              "bottom-20 right-4 sm:bottom-24 sm:right-6",
              "left-4 right-4 sm:left-auto sm:right-6 sm:w-[380px] sm:h-[520px]",
              isMinimized ? "h-14" : ""
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-amber-400 to-yellow-500 rounded-t-3xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-black/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-black">Gấu Assistant 🐻</h3>
                  <p className="text-[10px] text-black/60">Trợ lý nhà hàng</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowMemory(!showMemory)}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    showMemory ? "bg-black/30" : "hover:bg-black/20"
                  )}
                  title="Trí nhớ"
                >
                  <Brain className="w-4 h-4 text-black" />
                </button>
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 rounded-lg hover:bg-black/20 transition-colors"
                >
                  {isMinimized ? (
                    <Maximize2 className="w-4 h-4 text-black" />
                  ) : (
                    <Minimize2 className="w-4 h-4 text-black" />
                  )}
                </button>
                <button
                  onClick={clearChat}
                  className="p-1.5 rounded-lg hover:bg-black/20 transition-colors"
                  title="Xóa chat"
                >
                  <Trash2 className="w-4 h-4 text-black" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-black/20 transition-colors"
                >
                  <X className="w-4 h-4 text-black" />
                </button>
              </div>
            </div>

            {/* Messages */}
            {!isMinimized && (
              <>
                {/* Memory Panel */}
                {showMemory && (
                  <div className="bg-purple-50 border-b border-purple-200 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-purple-700 flex items-center gap-1">
                        <Brain className="w-3 h-3" />
                        Trí nhớ 🧠
                      </span>
                      <button
                        onClick={() => {
                          setUserMemory("");
                          localStorage.removeItem("gau_bubble_memory");
                        }}
                        className="text-[10px] text-purple-500 hover:text-purple-700"
                      >
                        Xóa
                      </button>
                    </div>
                    {userMemory ? (
                      <pre className="text-[11px] text-purple-800 whitespace-pre-wrap font-sans">
                        {userMemory}
                      </pre>
                    ) : (
                      <p className="text-[11px] text-purple-500">
                        Trò chuyện nhiều hơn để Gấu học nhé!
                      </p>
                    )}
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-card" style={{ scrollbarWidth: 'thin', scrollbarColor: '#fbbf24 transparent' }}>
                  {speech.error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-2 text-center">
                      <p className="text-xs text-red-600">{speech.error}</p>
                    </div>
                  )}

                  {isVoiceMode && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-xs font-semibold text-amber-700">Đang nghe...</span>
                      </div>
                      {speech.interimText && (
                        <p className="text-sm text-amber-900 italic">"{speech.interimText}"</p>
                      )}
                      {voiceInput && !speech.interimText && (
                        <p className="text-sm text-amber-800">"{voiceInput}"</p>
                      )}
                    </div>
                  )}
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-100 to-yellow-100 flex items-center justify-center mb-3">
                        <Bot className="w-7 h-7 text-amber-500" />
                      </div>
                      <h4 className="text-base font-bold mb-1">Chào bạn! 👋</h4>
                      <p className="text-xs text-muted-foreground max-w-[220px]">
                        Mình là Gấu 🐻, trợ lý nhà hàng. Hỏi mình về order, thanh toán, đổi bàn nhé!
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "flex gap-2",
                          msg.role === "user" ? "flex-row-reverse" : "flex-row"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0",
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-gradient-to-br from-amber-400 to-yellow-500"
                        )}>
                          {msg.role === "user" ? (
                            <span className="text-xs font-bold">B</span>
                          ) : (
                            <Bot className="w-4 h-4 text-black" />
                          )}
                        </div>
                        <div className={cn(
                          "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-tr-none"
                            : "bg-secondary rounded-tl-none"
                        )}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <p className={cn(
                            "text-[10px] mt-1",
                            msg.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                          )}>
                            {msg.timestamp.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </motion.div>
                    ))
                  )}

                  {isLoading && (
                    <div className="flex gap-2">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-black" />
                      </div>
                      <div className="bg-secondary rounded-2xl rounded-tl-none px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                          <span className="text-xs text-muted-foreground">Gấu đang suy nghĩ...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Model Selector & Input */}
                <div className="p-3 border-t border-border bg-background rounded-b-3xl">
                  {/* Model dropdown */}
                  <div className="relative mb-2">
                    <button
                      onClick={() => setShowModelDropdown(!showModelDropdown)}
                      className="w-full px-3 py-1.5 rounded-lg bg-secondary/50 text-xs font-medium flex items-center justify-between hover:bg-secondary transition-colors"
                    >
                      <span className="flex items-center gap-1">
                        <Bot className="w-3 h-3 text-amber-500" />
                        {models.find(m => m.id === selectedModel)?.name || "Tự động"}
                      </span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    <AnimatePresence>
                      {showModelDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute bottom-full left-0 right-0 mb-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden"
                        >
                          {models.map((model) => (
                            <button
                              key={model.id}
                              onClick={() => {
                                setSelectedModel(model.id);
                                setShowModelDropdown(false);
                                localStorage.setItem("gau_selected_model", model.id);
                              }}
                              className={cn(
                                "w-full px-3 py-2 text-left text-xs hover:bg-secondary transition-colors flex flex-col",
                                selectedModel === model.id && "bg-amber-100"
                              )}
                            >
                              <span className="font-semibold">{model.name}</span>
                              <span className="text-muted-foreground text-[10px]">{model.description}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={isVoiceMode ? (speech.interimText || voiceInput) : input}
                      onChange={(e) => !isVoiceMode && setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && !isVoiceMode && sendMessage()}
                      placeholder={isVoiceMode ? "🎤 Đang nghe..." : "Nhắn cho Gấu..."}
                      className="flex-1 px-3 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      disabled={isLoading || isVoiceMode}
                      readOnly={isVoiceMode}
                    />
                    <button
                      onClick={toggleVoice}
                      disabled={!speech.supported || isLoading}
                      className={cn(
                        "px-3 py-2 rounded-xl transition-all flex items-center justify-center",
                        isVoiceMode
                          ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80",
                        (!speech.supported || isLoading) && "opacity-50 cursor-not-allowed"
                      )}
                      title={isVoiceMode ? "Tắt microphone" : "Bật microphone"}
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                    <button
                      onClick={sendMessage}
                      disabled={!input.trim() || isLoading || isVoiceMode}
                      className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:shadow-lg hover:shadow-amber-500/30 transition-all disabled:opacity-50 disabled:hover:shadow-none"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                      ) : (
                        <Send className="w-4 h-4 text-black" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default FloatingChatBubble;