import { Link, useLocation } from "wouter";
import { UtensilsCrossed, ChefHat, BarChart3, Beer, History, LayoutGridIcon, LogOut, User, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWebSocket } from "@/hooks/use-websocket";
import { useNotificationSound } from "@/hooks/use-notification-sound";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Settings, Clock, Palette } from "lucide-react";

const BASE_NAV_ITEMS = [
  { href: "/", label: "Bàn", icon: LayoutGridIcon },
  { href: "/menu", label: "Thực Đơn", icon: UtensilsCrossed },
  { href: "/profile", label: "Cá Nhân", icon: User },
];

const EMPLOYEE_NAV_ITEMS = [
  { href: "/attendance", label: "Chấm Công", icon: Clock },
];

const OWNER_NAV_ITEMS = [
  { href: "/kitchen", label: "Bếp", icon: ChefHat },
  { href: "/reports", label: "Báo Cáo", icon: BarChart3 },
  { href: "/history", label: "Lịch Sử", icon: History },
  { href: "/settings", label: "Cài đặt", icon: Settings },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const playSound = useNotificationSound();
  const { user, logout, isOwner } = useAuth();
  const { theme, toggleTheme } = useTheme();

  useWebSocket(() => {
    playSound();
  });

  const isBusinessTheme = theme === "business";

  return (
    <div className={cn("min-h-screen flex flex-col md:flex-row", isBusinessTheme ? "bg-slate-50" : "bg-background")}>
      <aside className={cn(
        "hidden md:flex w-72 flex-col backdrop-blur-xl sticky top-0 h-screen p-6",
        isBusinessTheme
          ? "bg-white border-r border-slate-200 shadow-sm"
          : "border-r border-border bg-card/50"
      )}>
        <div className={cn("flex items-center gap-3 px-2 mb-12")}>
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg",
            isBusinessTheme
              ? "bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-cyan-500/30"
              : "bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 shadow-amber-500/30"
          )}>
            {isBusinessTheme ? (
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="currentColor">
                <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v2H7V7zm0 4h10v2H7v-2zm0 4h6v2H7v-2z"/>
              </svg>
            ) : (
              <Beer className="w-8 h-8 text-black" />
            )}
          </div>
          <div>
            <h1 className={cn("text-2xl leading-none font-extrabold tracking-tight", isBusinessTheme ? "text-slate-800" : "")}>
              <span className={cn(isBusinessTheme ? "text-cyan-600" : "text-amber-500")}>
                {isBusinessTheme ? "QUAN LY" : "BIA MANH BEO"}
              </span>
            </h1>
            <p className={cn("text-[10px] font-bold uppercase tracking-widest mt-1",
              isBusinessTheme ? "text-slate-500" : "text-muted-foreground"
            )}>
              {isBusinessTheme ? "Business Edition" : "Restaurant"}
            </p>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-2">
          {[...BASE_NAV_ITEMS, ...(isOwner ? OWNER_NAV_ITEMS : EMPLOYEE_NAV_ITEMS)].map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group",
                  isActive
                    ? isBusinessTheme
                      ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20"
                      : "bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg shadow-amber-500/20"
                    : isBusinessTheme
                      ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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
          <div className={cn(
            "rounded-2xl p-4 border-2",
            isBusinessTheme
              ? "bg-cyan-50 border-cyan-200/50"
              : "bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200/50"
          )}>
            <h4 className={cn("text-[10px] font-black uppercase tracking-wider mb-3",
              isBusinessTheme ? "text-cyan-600" : "text-amber-600"
            )}>
              Mẫu câu lệnh
            </h4>
            <div className="space-y-3 text-xs">
              <div className="flex flex-col gap-1">
                <span className={cn("font-bold", isBusinessTheme ? "text-cyan-600" : "text-amber-600")}>Order:</span>
                <span className={cn("italic leading-relaxed", isBusinessTheme ? "text-slate-600" : "text-muted-foreground")}>"Order bàn 5: 2 gà rán"</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className={cn("font-bold", isBusinessTheme ? "text-cyan-600" : "text-amber-600")}>Gửi bếp:</span>
                <span className={cn("italic leading-relaxed", isBusinessTheme ? "text-slate-600" : "text-muted-foreground")}>"Gửi bếp bàn 5"</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className={cn("font-bold", isBusinessTheme ? "text-cyan-600" : "text-amber-600")}>Thanh toán:</span>
                <span className={cn("italic leading-relaxed", isBusinessTheme ? "text-slate-600" : "text-muted-foreground")}>"Thanh toán bàn 3"</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between pt-4 border-t border-border/50">
            <div className="flex items-center gap-2 text-sm">
              <User className={cn("w-4 h-4", isBusinessTheme ? "text-cyan-500" : "text-amber-500")} />
              <span className="font-medium">{user?.username || "Guest"}</span>
              {user && isOwner && (
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-bold",
                  isBusinessTheme ? "bg-cyan-500 text-white" : "bg-amber-500 text-black"
                )}>
                  Chủ Quán
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleTheme}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  isBusinessTheme
                    ? "hover:bg-cyan-100 text-cyan-600"
                    : "hover:bg-secondary text-muted-foreground"
                )}
                title={isBusinessTheme ? "Chuyển về giao diện gốc" : "Chuyển sang giao diện mới"}
              >
                <Palette className="w-4 h-4" />
              </button>
              {user && (
                <button onClick={logout} className={cn(
                  "p-2 rounded-lg transition-colors",
                  isBusinessTheme ? "hover:bg-slate-100 text-slate-500" : "hover:bg-secondary text-muted-foreground"
                )} title="Đăng xuất">
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative">
        <header className={cn(
          "flex items-center justify-between p-4 sticky top-0 z-40 border-b backdrop-blur-md",
          isBusinessTheme ? "bg-white/90 border-slate-200 shadow-sm" : "bg-background/80 border-border/50"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shadow-md",
              isBusinessTheme
                ? "bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-cyan-500/20"
                : "bg-gradient-to-br from-amber-400 to-yellow-500 shadow-amber-500/30"
            )}>
              {isBusinessTheme ? (
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                  <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v2H7V7zm0 4h10v2H7v-2zm0 4h6v2H7v-2z"/>
                </svg>
              ) : (
                <Beer className="w-6 h-6 text-black" />
              )}
            </div>
            <div>
              <h1 className={cn("text-xl leading-none font-extrabold", isBusinessTheme ? "text-cyan-600" : "")}>
                <span className={cn(isBusinessTheme ? "text-cyan-500" : "text-amber-500")}>
                  {isBusinessTheme ? "QUAN LY" : "BIA MANH BEO"}
                </span>
              </h1>
              <p className={cn("text-[8px] font-bold uppercase tracking-widest",
                isBusinessTheme ? "text-slate-500" : "text-muted-foreground"
              )}>
                {isBusinessTheme ? "Business Edition" : "Restaurant"}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <Menu className="w-6 h-6" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {[...BASE_NAV_ITEMS, ...(isOwner ? OWNER_NAV_ITEMS : EMPLOYEE_NAV_ITEMS)].map((item) => {
                const isActive = location === item.href;
                return (
                  <DropdownMenuItem asChild key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2 cursor-pointer",
                        isActive
                          ? isBusinessTheme
                            ? "text-cyan-500 font-bold"
                            : "text-amber-500 font-bold"
                          : ""
                      )}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuItem onClick={toggleTheme} className={cn(
                "cursor-pointer",
                isBusinessTheme ? "text-cyan-600" : "text-amber-600"
              )}>
                <Palette className="w-4 h-4 mr-2" />
                {isBusinessTheme ? "Giao diện gốc" : "Giao diện mới"}
              </DropdownMenuItem>
              {user && (
                <DropdownMenuItem onClick={logout} className="text-red-500 cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  Đăng xuất
                </DropdownMenuItem>
              )}
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