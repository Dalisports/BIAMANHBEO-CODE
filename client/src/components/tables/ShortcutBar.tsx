import { cn } from "@/lib/utils";
import type { OrderItem } from "@/hooks/use-orders";

interface ShortcutBarProps {
  menuItems: any[];
  cachedTopItemIds: number[];
  shortcuts: Record<number, number>;
  onAddItem: (menuItem: any, quantity?: number) => void;
}

export function ShortcutBar({ menuItems, cachedTopItemIds, shortcuts, onAddItem }: ShortcutBarProps) {
  const getShortcutItemLocal = (pos: number) => {
    if (pos >= 1 && pos <= 3) {
      return shortcuts[pos] ? menuItems?.find(m => m.id === shortcuts[pos]) || null : null;
    }
    if (pos >= 4 && pos <= 10) {
      const idx = pos - 4;
      const itemId = cachedTopItemIds[idx];
      return itemId ? menuItems?.find(m => m.id === itemId) || null : null;
    }
    return null;
  };

  return (
    <div className="bg-secondary/50 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold text-yellow-600 uppercase tracking-wider">Phím tắt (10 món)</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {[1,2,3,4,5,6,7,8,9,10].map(idx => {
          const item = getShortcutItemLocal(idx);
          return (
            <button
              key={idx}
              data-testid={`shortcut-${idx}`}
              onClick={() => { try { navigator.vibrate?.(50); } catch {} item && onAddItem(item, 1); }}
              disabled={!item}
              className={cn(
                "p-3 rounded-lg border-2 text-center flex flex-col items-center justify-center min-h-[70px]",
                idx <= 3
                  ? "border-red-400 bg-red-50 hover:bg-red-100"
                  : "border-yellow-400 bg-yellow-50 hover:bg-yellow-100",
                !item && "opacity-30 cursor-not-allowed"
              )}
            >
              {item && (
                <p className={cn(
                  "text-sm font-bold leading-tight",
                  idx <= 3 ? "text-red-700" : "text-yellow-700"
                )}>
                  {item.name.length > 12 ? item.name.slice(0, 12) + "..." : item.name}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
