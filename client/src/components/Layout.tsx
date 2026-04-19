import { Link, useLocation } from "wouter";
import { MessageSquare, UtensilsCrossed, ChefHat, BarChart3, Beer, History, LayoutGrid, LogOut, User, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWebSocket } from "@/hooks/use-websocket";
import { useNotificationSound } from "@/hooks/use-notification-sound";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Settings, Clock } from "lucide-react";

const BASE_NAV_ITEMS = [
  { href: "/", label: "Bàn", icon: LayoutGrid },
  { href: "/menu", label: "Thực Đơn", icon: UtensilsCrossed },
  { href: "/attendance", label: "Chấm Công", icon: Clock },
  { href: "/profile", label: "Cá Nhân", icon: User },
];

const OWNER_NAV_ITEMS = [
  { href: "/home", label: "Trợ Lý AI", icon: MessageSquare },
  { href: "/kitchen", label: "Bếp", icon: ChefHat },
  { href: "/reports", label: "Báo Cáo", icon: BarChart3 },
  { href: "/history", label: "Lịch Sử", icon: History },
  { href: "/settings", label: "Cài đặt", icon: Settings },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const playSound = useNotificationSound();
  const { user, logout, isOwner } = useAuth();
  
  useWebSocket(() => {
    playSound();
  });

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className="hidden md:flex w-72 flex-col border-r border-border bg-card/50 backdrop-blur-xl sticky top-0 h-screen p-6">
        <div className="flex items-center gap-3 px-2 mb-12">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Beer className="w-8 h-8 text-black" />
          </div>
          <div>
            <h1 className="text-2xl leading-none font-extrabold tracking-tight">
              <span className="text-amber-500">BIA MẠNH BÉO</span>
            </h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Restaurant</p>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-2">
          {[...BASE_NAV_ITEMS, ...(isOwner ? OWNER_NAV_ITEMS : [])].map((item) => {
            const isActive = location === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group",
                  isActive 
                    ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg shadow-amber-500/20" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5 transition-transform duration-300", isActive ? "scale-110" : "group-hover:scale-110")} />
                <span className="text-sm font-bold">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-border/50">
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-4 border-2 border-amber-200/50">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-amber-600 mb-3">Mẫu câu lệnh</h4>
            <div className="space-y-3 text-xs">
              <div className="flex flex-col gap-1">
                <span className="font-bold text-amber-600">Order:</span>
                <span className="text-muted-foreground italic leading-relaxed">"Order bàn 5: 2 gà rán"</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-bold text-amber-600">Gửi bếp:</span>
                <span className="text-muted-foreground italic leading-relaxed">"Gửi bếp bàn 5"</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-bold text-amber-600">Thanh toán:</span>
                <span className="text-muted-foreground italic leading-relaxed">"Thanh toán bàn 3"</span>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between pt-4 border-t border-border/50">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-amber-500" />
              <span className="font-medium">{user?.username || "Guest"}</span>
              {user && isOwner && <span className="text-xs bg-amber-500 text-black px-2 py-0.5 rounded-full font-bold">Chủ Quán</span>}
            </div>
            {user && <button onClick={logout} className="p-2 hover:bg-secondary rounded-lg transition-colors" title="Đăng xuất">
              <LogOut className="w-4 h-4 text-muted-foreground" />
            </button>}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative">
        <header className="flex items-center justify-between p-4 bg-background/80 backdrop-blur-md sticky top-0 z-40 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-md shadow-amber-500/30">
              <Beer className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-xl leading-none font-extrabold">
                <span className="text-amber-500">BIA MẠNH BÉO</span>
              </h1>
              <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest">Restaurant</p>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <Menu className="w-6 h-6" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {[...BASE_NAV_ITEMS, ...(isOwner ? OWNER_NAV_ITEMS : [])].map((item) => {
                const isActive = location === item.href;
                return (
                  <DropdownMenuItem asChild key={item.href}>
                    <Link 
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2 cursor-pointer",
                        isActive && "text-amber-500 font-bold"
                      )}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
              {user && <DropdownMenuItem onClick={logout} className="text-red-500 cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />
                Đăng xuất
              </DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <div className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}