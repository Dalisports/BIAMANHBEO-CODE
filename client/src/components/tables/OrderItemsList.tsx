import { Minus, Plus, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatCurrency } from "@/lib/utils";
import type { Order, OrderItem } from "@/hooks/use-orders";

interface OrderItemsListProps {
  order: Order;
  onUpdateQuantity: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
  menuItems?: any[];
}

export function OrderItemsList({ order, onUpdateQuantity, onRemoveItem, menuItems = [] }: OrderItemsListProps) {
  const getMenuItem = (name: string) => menuItems.find(m => m.name === name);
  const isHiddenItem = (name: string) => {
    const menuItem = getMenuItem(name);
    return menuItem?.isHidden === true;
  };

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm h-[33vh] overflow-y-auto">
      {/* Items */}
      <div className="divide-y divide-border/50">
        <AnimatePresence mode="popLayout">
          {order.items?.map((item: OrderItem, idx: number) => {
            const isHidden = isHiddenItem(item.name);
            const isDone = item.cookingStatus === "done";
            return (
              <motion.div
                key={`${item.menuItemId}-${idx}`}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="p-1 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                    isHidden || isDone ? "bg-green-500" : "bg-gray-400"
                  )}>
                    <Check className="w-3 h-3 text-white" />
                  </div>

                  <p className="font-semibold truncate leading-tight flex-1 text-foreground">
                      {item.name}
                    </p>

                  <div className="flex items-center gap-1 bg-secondary/50 rounded-xl p-1">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onUpdateQuantity(idx, -1)}
                      className="w-8 h-8 rounded-lg bg-card shadow-sm flex items-center justify-center hover:bg-secondary active:bg-secondary/80 transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5 text-foreground" />
                    </motion.button>

                    <span className="min-w-[2rem] text-center text-base font-bold text-primary">
                      {item.quantity}
                    </span>

                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onUpdateQuantity(idx, 1)}
                      className="w-8 h-8 rounded-lg bg-card shadow-sm flex items-center justify-center hover:bg-secondary active:bg-secondary/80 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-foreground" />
                    </motion.button>
                  </div>

                  <div className="text-right min-w-[5rem]">
                    <p className="font-bold text-foreground">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Total */}
      <div className="px-2 py-4 bg-primary/10 border-t border-primary/20 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-sm text-muted-foreground">Tổng cộng</span>
            <span className="text-xs text-muted-foreground block">
              {order.items?.reduce((sum, item) => sum + item.quantity, 0)} món
            </span>
          </div>
          <span className="text-2xl font-black text-primary">
            {formatCurrency(order.totalAmount)}
          </span>
        </div>
      </div>
    </div>
  );
}