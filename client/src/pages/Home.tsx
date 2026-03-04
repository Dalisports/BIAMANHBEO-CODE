import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Send, Bot, User, Volume2, VolumeX } from "lucide-react";
import { useProcessChat } from "@/hooks/use-chat";
import { useSpeech } from "@/hooks/use-speech";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "intro",
      role: "assistant",
      content: "Xin chào! Tôi là Trợ lý ảo Thanh Sói VoxFlow. Bạn có thể ra lệnh bằng giọng nói hoặc gõ phím để tạo mặt hàng, lên đơn, chốt đơn hoặc xem báo cáo.",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const chatMutation = useProcessChat();
  
  const handleSpeechResult = (text: string) => {
    setInput(text);
    handleSend(text);
  };

  const { isListening, listen, stop, speak, supported } = useSpeech(handleSpeechResult);

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
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.reply,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMsg]);
        
        if (autoSpeak) {
          speak(data.reply);
        }
      }
    });
  };

  return (
    <div className="h-full flex flex-col max-h-[calc(100vh-2rem)] md:max-h-[calc(100vh-4rem)]">
      {/* Header Area */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">Trợ Lý AI</h2>
          <p className="text-muted-foreground mt-1 text-sm">Giao tiếp quản lý cửa hàng của bạn</p>
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

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto pr-2 pb-4 space-y-6">
        <div className="bg-muted/50 rounded-2xl p-4 mb-4 border border-border/50">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Mẫu câu lệnh hướng dẫn</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-primary">Nhập liệu:</span>
              <span className="text-muted-foreground italic">"Tạo mặt hàng Khoai tây lắc giá 45k"</span>
              <span className="text-muted-foreground italic">"Lên đơn chị Thanh - 2 phần khoai tây lắc - địa chỉ 582 trần lãm"</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-primary">Truy vấn & Chốt đơn:</span>
              <span className="text-muted-foreground italic">"Hôm nay có bao nhiêu đơn hàng?"</span>
              <span className="text-muted-foreground italic">"Chốt đơn chị Thanh trần lãm"</span>
            </div>
          </div>
        </div>
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
                <span className={cn(
                  "text-[10px] font-medium mt-2 block opacity-50",
                  msg.role === "user" ? "text-right" : "text-left"
                )}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
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

      {/* Input Area */}
      <div className="mt-4 flex items-end gap-3 relative">
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
            placeholder="Nhập hoặc nói yêu cầu của bạn..."
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
          <button
            onClick={isListening ? stop : listen}
            className={cn(
              "flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 text-white shadow-lg",
              isListening 
                ? "bg-accent animate-pulse-ring" 
                : "bg-primary hover:bg-primary/90 hover:shadow-xl hover:-translate-y-1 active:translate-y-0"
            )}
          >
            <Mic className={cn("w-6 h-6", isListening && "scale-110")} />
          </button>
        )}
      </div>
    </div>
  );
}
