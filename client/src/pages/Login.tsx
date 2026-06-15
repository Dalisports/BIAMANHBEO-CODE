import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Download } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const success = await login(loginForm.username, loginForm.password);
    setIsLoading(false);
    if (!success) {
      toast({
        title: "Đăng nhập thất bại",
        description: "Tên đăng nhập hoặc mật khẩu không đúng",
        variant: "destructive",
      });
    } else {
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen bg-[#f1b400] flex flex-col items-center justify-center relative px-6 py-12 font-sans overflow-hidden">
      {/* Main container directly holds the logo, title, and form without dark box */}
      <div className="w-full max-w-[320px] flex flex-col items-center z-10 mb-16">
        {/* Logo */}
        <div className="mb-6 hover:scale-105 transition-transform duration-300">
          <img 
            src="/logo.png" 
            alt="Logo" 
            className="w-36 h-auto drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)]" 
          />
        </div>

        {/* Brand Title */}
        <h1 className="text-3xl font-black tracking-widest text-black mb-10 text-center uppercase">
          BIA MẠNH BÉO
        </h1>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="w-full flex flex-col space-y-4">
          {/* Username Input */}
          <div className="w-full">
            <input
              type="text"
              id="username"
              placeholder="TÊN ĐĂNG NHẬP"
              value={loginForm.username}
              onChange={(e) =>
                setLoginForm({ ...loginForm, username: e.target.value })
              }
              className="w-full bg-[#e8f0fe] text-black placeholder-gray-400 px-6 py-3.5 rounded-2xl text-sm font-bold tracking-widest text-center border-none transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-black/10"
              required
            />
          </div>

          {/* Password Input */}
          <div className="w-full">
            <input
              type="password"
              id="password"
              placeholder="MẬT KHẨU"
              value={loginForm.password}
              onChange={(e) =>
                setLoginForm({ ...loginForm, password: e.target.value })
              }
              className="w-full bg-[#e8f0fe] text-black placeholder-gray-400 px-6 py-3.5 rounded-2xl text-sm font-bold tracking-widest text-center border-none transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-black/10"
              required
            />
          </div>

          {/* Submit Button */}
          <div className="w-full pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-white text-black font-black text-sm py-4 rounded-full shadow-md hover:bg-gray-50 active:scale-[0.98] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed tracking-widest"
            >
              {isLoading ? "ĐANG ĐĂNG NHẬP..." : "ĐĂNG NHẬP"}
            </button>
          </div>
        </form>
      </div>

      {/* Footer and App Install Button at the bottom */}
      <div className="absolute bottom-6 left-0 w-full px-6 flex justify-between items-center text-black font-bold text-xs tracking-wider">
        <span className="opacity-80">POS v1.0</span>
        <button 
          type="button"
          onClick={() => {
            // Install App handler if any, or trigger default PWA install
            const installEvent = (window as any).deferredPrompt;
            if (installEvent) {
              installEvent.prompt();
            } else {
              alert("Ứng dụng đã được cài đặt hoặc trình duyệt không hỗ trợ.");
            }
          }}
          className="bg-[#d28b03] hover:bg-[#b07402] text-white border border-white/20 px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          Cài đặt App
        </button>
        <span className="opacity-80">0904 478 593</span>
      </div>
    </div>
  );
}
