import { Link, useLocation } from "wouter";
import { MessageSquare, UtensilsCrossed, Receipt, ChefHat, BarChart3, Beer } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Trợ Lý AI", icon: MessageSquare },
  { href: "/orders", label: "Đơn Hàng", icon: Receipt },
  { href: "/kitchen", label: "Bếp", icon: ChefHat },
  { href: "/menu", label: "Thực Đơn", icon: UtensilsCrossed },
  { href: "/reports", label: "Báo Cáo", icon: BarChart3 },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className="hidden md:flex w-72 flex-col border-r border-border bg-card/50 backdrop-blur-xl sticky top-0 h-screen p-6">
        <div className="flex items-center gap-3 px-2 mb-12">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Beer className="w-8 h-8 text-black" />
          </div>
          <div>
            <h1 className="font-display text-2xl leading-none font-black tracking-tight">
              <span className="text-amber-500">BIA MẠNH BÉO</span>
            </h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Restaurant</p>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-2">
          {NAV_ITEMS.map((item) => {
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
                <span className="font-sans font-bold">{item.label}</span>
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
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 pb-24 md:pb-0 relative">
        <header className="md:hidden flex items-center gap-3 p-4 bg-background/80 backdrop-blur-md sticky top-0 z-40 border-b border-border/50">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-md shadow-amber-500/30">
            <Beer className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="font-display text-xl leading-none font-black">
              <span className="text-amber-500">BIA MẠNH BÉO</span>
            </h1>
            <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest">Restaurant</p>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
          {children}
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border p-2 px-6 flex items-center justify-between z-50 pb-safe">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200",
                isActive ? "text-amber-500" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-6 h-6", isActive && "fill-amber-500/20")} />
              <span className="font-sans text-[10px] font-bold">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
