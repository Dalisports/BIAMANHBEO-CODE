import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, Loader2, RefreshCw, Trash2, ChevronDown, Brain, Star, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { useSpeech } from "@/hooks/use-speech";

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

interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
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
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("auto");
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [voiceInput, setVoiceInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Voice recognition
  const handleVoiceResult = useCallback((text: string) => {
    setVoiceInput(text);
  }, []);

  const speech = useSpeech(handleVoiceResult);

  // Memory system - tracks user preferences and habits
  const [userMemory, setUserMemory] = useState<string>(() => {
    try {
      return localStorage.getItem("gau_user_memory") || "";
    } catch {
      return "";
    }
  });

  // Build memory from chat history
  useEffect(() => {
    if (messages.length < 2) return;

    const newMemory = buildMemoryFromHistory(messages);
    if (newMemory !== userMemory) {
      setUserMemory(newMemory);
      try {
        localStorage.setItem("gau_user_memory", newMemory);
      } catch (e) {
        console.error("Failed to save memory:", e);
      }
    }
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

  // Load context and models on mount
  useEffect(() => {
    (async () => {
      fetchContext();
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

  // Build memory from chat history - extracts patterns and preferences
  function buildMemoryFromHistory(msgs: Message[]): string {
    const userMsgs = msgs.filter(m => m.role === "user");
    const assistantMsgs = msgs.filter(m => m.role === "assistant");

    if (userMsgs.length < 3) return "";

    const memory: string[] = [];

    // Extract frequently mentioned tables
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
      memory.push(`- Người dùng thường thao tác với: ${frequentTables.join(", ")}`);
    }

    // Extract common actions
    const actions: Record<string, number> = {};
    userMsgs.forEach(m => {
      const lower = m.content.toLowerCase();
      if (lower.includes("order") || lower.includes("đặt")) actions["Tạo order"] = (actions["Tạo order"] || 0) + 1;
      if (lower.includes("thêm")) actions["Thêm món"] = (actions["Thêm món"] || 0) + 1;
      if (lower.includes("thanh toán") || lower.includes("tính tiền")) actions["Thanh toán"] = (actions["Thanh toán"] || 0) + 1;
      if (lower.includes("chuyển") || lower.includes("đổi bàn")) actions["Đổi bàn"] = (actions["Đổi bàn"] || 0) + 1;
      if (lower.includes("gửi bếp")) actions["Gửi bếp"] = (actions["Gửi bếp"] || 0) + 1;
      if (lower.includes("tổng")) actions["Xem tổng tiền"] = (actions["Xem tổng tiền"] || 0) + 1;
    });

    const topActions = Object.entries(actions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([action, count]) => `${action} (${count} lần)`);

    if (topActions.length > 0) {
      memory.push(`- Hành động thường dùng: ${topActions.join(", ")}`);
    }

    // Extract recently ordered items from assistant success messages
    const orderedItems: Record<string, number> = {};
    assistantMsgs.forEach(m => {
      if (m.content.includes("✅")) {
        // Extract items mentioned in the conversation
        const prevUserMsg = msgs[msgs.indexOf(m) - 1]?.content;
        if (prevUserMsg) {
          const items = prevUserMsg.match(/(\d+)\s+([a-zA-Zàáảãạăắằẵặâấầẫậéèẻẽẹêếềễệíìỉĩịóòỏõọôốồỗộơớờỡợúùủũụưứừữựýỳỷỹỵđ]+)/gi);
          if (items) {
            items.forEach(item => {
              orderedItems[item.toLowerCase()] = (orderedItems[item.toLowerCase()] || 0) + 1;
            });
          }
        }
      }
    });

    const favoriteItems = Object.entries(orderedItems)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([item, count]) => `${item} (${count} lần)`);

    if (favoriteItems.length > 0) {
      memory.push(`- Món thường gọi: ${favoriteItems.join(", ")}`);
    }

    // Total interactions
    memory.push(`- Tổng số lần tương tác: ${msgs.length}`);

    return memory.join("\n");
  }

  const processMessage = async (text: string, conversationHistory: {role: string, content: string}[]) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/gau-assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: conversationHistory,
          memory: userMemory || undefined,
          model: selectedModel === "auto" ? undefined : selectedModel,
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
                : executeData.action === "PRODUCT_CREATED"
                ? `✅ Đã thêm "${executeData.data.name}" vào menu`
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
        assistantMessage = {
          ...assistantMessage,
          content: data.message || data.content || JSON.stringify(data),
          action: { type: "REPLY", message: data.message || data.content },
        };
      }

      setMessages(prev => [...prev, assistantMessage]);
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

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const conversationHistory = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    const text = input.trim();
    setInput("");
    await processMessage(text, conversationHistory);
  };

  const sendVoiceMessage = async () => {
    const text = voiceInput.trim();
    if (!text || isLoading) return;

    setVoiceInput("");
    const conversationHistory = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    await processMessage(text, conversationHistory);
  };

  const quickActions = [
    { label: "Order bàn mới", example: "Tạo order bàn 5: 2 gà rán, 1 cocacola" },
    { label: "Thanh toán", example: "Thanh toán bàn 3" },
    { label: "Đổi bàn", example: "Chuyển bàn 3 sang bàn 7" },
    { label: "Gửi bếp", example: "Gửi bếp bàn 5" },
  ];

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem("gau_chat_history");
  };

  const clearMemory = () => {
    setUserMemory("");
    localStorage.removeItem("gau_user_memory");
  };

  const toggleVoice = () => {
    if (isVoiceMode) {
      speech.stop();
      setIsVoiceMode(false);
      if (voiceInput.trim() && !isLoading) {
        sendVoiceMessage();
      }
    } else {
      if (!speech.supported) {
        alert("Trình duyệt không hỗ trợ nhận diện giọng nói");
        return;
      }
      if (isLoading) return;
      setVoiceInput("");
      speech.listen();
      setIsVoiceMode(true);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Bot className="w-7 h-7 text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Gấu Assistant 🐻</h1>
              <p className="text-sm text-muted-foreground">Trợ lý AI cho nhà hàng</p>
            </div>
          </div>
        <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowModelDropdown(!showModelDropdown)}
                className="px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 bg-secondary hover:bg-secondary/80 border border-border"
              >
                <Bot className="w-4 h-4 text-amber-500" />
                {models.find(m => m.id === selectedModel)?.name || "Tự động"}
                <ChevronDown className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {showModelDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
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
                          "w-full px-4 py-3 text-left hover:bg-secondary transition-colors flex flex-col",
                          selectedModel === model.id && "bg-amber-100"
                        )}
                      >
                        <span className="font-semibold text-sm">{model.name}</span>
                        <span className="text-xs text-muted-foreground">{model.description}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button
              onClick={clearChat}
              className="px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 bg-red-100 text-red-600 hover:bg-red-200"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
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
            <button
              onClick={() => setShowMemory(!showMemory)}
              className={cn(
                "px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2",
                showMemory 
                  ? "bg-purple-500 text-white" 
                  : "bg-purple-100 text-purple-700 hover:bg-purple-200"
              )}
            >
              <Brain className="w-4 h-4" />
              Trí nhớ
            </button>
          </div>
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
              className="overflow-hidden"
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

        {/* Memory Panel */}
        <AnimatePresence>
          {showMemory && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-card rounded-2xl border border-purple-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-purple-600 flex items-center gap-2">
              <Brain className="w-4 h-4" />
                    Trí nhớ Gấu 🧠
                  </h3>
                  <button
                    onClick={clearMemory}
                    className="px-2 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-600 hover:bg-red-200 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Xóa nhớ
                  </button>
                </div>
                {userMemory ? (
                  <div className="bg-purple-50 rounded-xl p-3">
                    <pre className="text-sm text-purple-800 whitespace-pre-wrap font-sans">
                      {userMemory}
                    </pre>
                    <p className="text-xs text-purple-500 mt-2">
                      Gấu tự động ghi nhớ thói quen từ các cuộc trò chuyện
                    </p>
                  </div>
                ) : (
                  <div className="bg-purple-50 rounded-xl p-3 text-center">
                    <Star className="w-8 h-8 text-purple-300 mx-auto mb-2" />
                    <p className="text-sm text-purple-600">
                      Chưa có dữ liệu. Trò chuyện nhiều hơn để Gấu học thói quen nhé!
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-card rounded-3xl border border-border p-4 mb-4 min-h-[400px]" style={{ scrollbarWidth: 'thin', scrollbarColor: '#fbbf24 transparent' }}>
        {speech.error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center mb-3">
            <p className="text-sm text-red-600">{speech.error}</p>
          </div>
        )}

        {isVoiceMode && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center mb-3">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-semibold text-amber-700">Đang nghe...</span>
            </div>
            {speech.interimText && (
              <p className="text-base text-amber-900 italic">"{speech.interimText}"</p>
            )}
            {voiceInput && !speech.interimText && (
              <p className="text-base text-amber-800">"{voiceInput}"</p>
            )}
          </div>
        )}
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
          value={isVoiceMode ? (speech.interimText || voiceInput || input) : input}
          onChange={(e) => !isVoiceMode && setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && !isVoiceMode && sendMessage()}
          placeholder={isVoiceMode ? "🎤 Đang nghe... Bấm lại để gửi" : "Nhắn cho Gấu... ví dụ: 'Order bàn 5: 2 gà rán'"}
          className="flex-1 px-4 py-3 rounded-2xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
          disabled={isLoading || isVoiceMode}
          readOnly={isVoiceMode}
        />
        <button
          onClick={toggleVoice}
          disabled={!speech.supported || isLoading}
          className={cn(
            "px-5 py-3 rounded-2xl transition-all flex items-center justify-center",
            isVoiceMode
              ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30"
              : "bg-secondary text-muted-foreground hover:bg-secondary/80 border border-border",
            (!speech.supported || isLoading) && "opacity-50 cursor-not-allowed"
          )}
          title={isVoiceMode ? "Tắt microphone - Gửi voice" : "Bật microphone"}
        >
          <Mic className="w-5 h-5" />
        </button>
        <button
          onClick={sendMessage}
          disabled={!input.trim() || isLoading || isVoiceMode}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 font-bold text-black hover:shadow-lg hover:shadow-amber-500/30 transition-all disabled:opacity-50 disabled:hover:shadow-none"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}