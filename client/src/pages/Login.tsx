import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

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
    <div className="min-h-screen bg-[#FFBE00] flex flex-col items-center justify-center relative px-6 py-12 font-sans">
      {/* Container chính */}
      <div className="w-full max-w-sm flex flex-col items-center z-10 mb-20">
        {/* Logo */}
        <div className="mb-4">
          <img src="/logo.png" alt="Logo" className="w-48 h-auto" />
        </div>

        {/* Tiêu đề */}
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-wide text-[#1A1813] mb-16 text-center whitespace-nowrap">
          BIA MẠNH BÉO
        </h1>

        {/* Form đăng nhập */}
        <form onSubmit={handleLogin} className="w-full flex flex-col space-y-4">
          {/* Tên đăng nhập */}
          <div className="w-full">
            <input
              type="text"
              id="username"
              placeholder="TÊN ĐĂNG NHẬP"
              value={loginForm.username}
              onChange={(e) =>
                setLoginForm({ ...loginForm, username: e.target.value })
              }
              className="w-full bg-[#1E190F] text-white placeholder-[#868378] px-6 py-4 rounded-xl text-base font-semibold tracking-wider transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/20"
              required
            />
          </div>

          {/* Mật khẩu */}
          <div className="w-full">
            <input
              type="password"
              id="password"
              placeholder="MẬT KHẨU"
              value={loginForm.password}
              onChange={(e) =>
                setLoginForm({ ...loginForm, password: e.target.value })
              }
              className="w-full bg-[#1E190F] text-white placeholder-[#868378] px-6 py-4 rounded-xl text-base font-semibold tracking-wider transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/20"
              required
            />
          </div>

          {/* Nút Đăng nhập */}
          <div className="w-full pt-8 pb-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#F5F5F5] text-[#2C281F] font-bold text-lg py-3 rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.15)] hover:bg-white hover:shadow-[0_6px_15px_rgba(0,0,0,0.2)] active:scale-95 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? "ĐANG ĐĂNG NHẬP..." : "ĐĂNG NHẬP"}
            </button>
          </div>
        </form>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-0 w-full px-6 flex justify-between items-center text-[#231F14] font-semibold text-sm">
        <span>POS v1.0</span>
        <span>0904 478 593</span>
      </div>
    </div>
  );
}
