import { Link, useLocation } from "wouter";
import { UtensilsCrossed, ChefHat, BarChart3, Beer, History, LayoutGridIcon, LogOut, User, Menu, CreditCard, Users, ClipboardList } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useWebSocket } from "@/hooks/use-websocket";
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
  { href: "/orders", label: "Đơn Hàng", icon: ClipboardList },
  { href: "/profile", label: "Cá Nhân", icon: User },
];

const EMPLOYEE_NAV_ITEMS = [
  { href: "/attendance", label: "Chấm Công", icon: Clock },
];

const OWNER_NAV_ITEMS = [
  { href: "/kitchen", label: "Bếp", icon: ChefHat },
  { href: "/reports", label: "Báo Cáo", icon: BarChart3 },
  { href: "/history", label: "Lịch Sử", icon: History },
  { href: "/users", label: "Quản Lý User", icon: Users },
  { href: "/settings", label: "Cài đặt", icon: Settings },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { user, logout, isOwner } = useAuth();
  const { theme, toggleTheme, isDarkMode } = useTheme();

  useWebSocket();

  return (
    <div className={cn("min-h-screen flex flex-col md:flex-row", "bg-background")}>
      <aside className={cn(
        "hidden md:flex w-72 flex-col backdrop-blur-xl sticky top-0 h-screen p-6",
        "border-r border-border bg-card/50"
      )}>
        <div className={cn("flex items-center gap-3 px-2 mb-12")}>
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg",
            "bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 shadow-amber-500/30"
          )}>
            <Beer className="w-8 h-8 text-black" />
          </div>
          <div>
            <h1 className={cn("text-2xl leading-none font-extrabold tracking-tight")}>
              <span className="text-amber-500">BIA MANH BEO</span>
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest mt-1 text-muted-foreground">
              Restaurant
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
          <div className="mt-4 flex items-center justify-between pt-4 border-t border-border/50">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-amber-500" />
              <span className="font-medium">{user?.username || "Guest"}</span>
              {user && isOwner && (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-500 text-black">
                  Chủ Quán
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
                title="Chuyển giao diện"
              >
                <Palette className="w-4 h-4" />
              </button>
              {user && (
                <button onClick={logout} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors" title="Đăng xuất">
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
          "bg-background/80 border-border/50"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shadow-md",
              "bg-gradient-to-br from-amber-400 to-yellow-500 shadow-amber-500/30"
            )}>
              <Beer className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-xl leading-none font-extrabold">
                <span className="text-amber-500">BIA MANH BEO</span>
              </h1>
              <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                Restaurant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:hidden">
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
                          isActive ? "text-amber-500 font-bold" : ""
                        )}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuItem onClick={toggleTheme} className="text-amber-600 cursor-pointer">
                  <Palette className="w-4 h-4 mr-2" />
                  Chuyển giao diện
                </DropdownMenuItem>
                {user && (
                  <DropdownMenuItem onClick={logout} className="text-red-500 cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" />
                    Đăng xuất
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}