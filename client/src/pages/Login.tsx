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
    <div className="min-h-screen bg-gradient-to-br from-amber-500 via-[#1e190f] to-[#0f0e0b] flex flex-col items-center justify-center relative px-6 py-12 font-sans overflow-hidden">
      {/* Background decoration elements */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-amber-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-amber-600/10 blur-[120px] pointer-events-none" />

      {/* Container chính với hiệu ứng Glassmorphism */}
      <div className="w-full max-w-[400px] bg-[#171510]/85 backdrop-blur-xl border border-amber-500/10 rounded-[2.5rem] p-8 md:p-10 shadow-[0_25px_60px_rgba(0,0,0,0.65)] flex flex-col items-center z-10 mb-16">
        {/* Logo */}
        <div className="mb-6 hover:scale-105 transition-transform duration-300">
          <img src="/logo.png" alt="Logo" className="w-44 h-auto drop-shadow-[0_4px_12px_rgba(245,158,11,0.2)]" />
        </div>

        {/* Tiêu đề */}
        <h1 className="text-3xl md:text-4xl font-black tracking-widest text-amber-500 mb-12 text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
          BIA MẠNH BÉO
        </h1>

        {/* Form đăng nhập */}
        <form onSubmit={handleLogin} className="w-full flex flex-col space-y-5">
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
              className="w-full bg-[#24211a]/80 text-white placeholder-amber-500/30 px-6 py-4 rounded-2xl text-sm font-bold tracking-widest border border-amber-500/10 transition-all duration-300 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10"
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
              className="w-full bg-[#24211a]/80 text-white placeholder-amber-500/30 px-6 py-4 rounded-2xl text-sm font-bold tracking-widest border border-amber-500/10 transition-all duration-300 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10"
              required
            />
          </div>

          {/* Nút Đăng nhập */}
          <div className="w-full pt-6">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-400 text-black font-black text-sm py-4 rounded-2xl shadow-[0_8px_30px_rgba(245,158,11,0.2)] hover:from-amber-600 hover:to-amber-500 hover:shadow-[0_8px_40px_rgba(245,158,11,0.4)] active:scale-[0.98] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed tracking-widest"
            >
              {isLoading ? "ĐANG ĐĂNG NHẬP..." : "ĐĂNG NHẬP"}
            </button>
          </div>
        </form>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-0 w-full px-8 flex justify-between items-center text-white/30 font-bold text-xs tracking-wider">
        <span>POS v1.0</span>
        <span className="hover:text-amber-500 transition-colors duration-300">0904 478 593</span>
      </div>
    </div>
  );
}
