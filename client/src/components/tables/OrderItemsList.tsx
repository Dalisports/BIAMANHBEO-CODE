import { Minus, Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Order, OrderItem } from "@/hooks/use-orders";

interface OrderItemsListProps {
  order: Order;
  onUpdateQuantity: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
}

export function OrderItemsList({ order, onUpdateQuantity, onRemoveItem }: OrderItemsListProps) {
  return (
    <div className="space-y-2">
      {order.items?.map((item: OrderItem, idx: number) => (
        <div key={idx} className="flex items-center gap-2 bg-white rounded-lg p-2 border border-border hover:border-amber-200 transition-colors text-sm">
          {/* Delete button */}
          <button
            onClick={() => onRemoveItem(idx)}
            className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 active:scale-95 transition-transform touch-action:manipulation flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {/* Item name */}
          <span className="flex-1 font-medium truncate">{item.name}</span>
          {/* Minus button */}
          <button
            onClick={() => onUpdateQuantity(idx, -1)}
            className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 active:scale-95 transition-transform touch-action:manipulation flex-shrink-0"
          >
            <Minus className="w-4 h-4" />
          </button>
          {/* Quantity */}
          <span className="min-w-[3rem] text-center text-lg font-black text-amber-600">
            x{item.quantity}
          </span>
          {/* Plus button */}
          <button
            onClick={() => onUpdateQuantity(idx, 1)}
            className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 active:scale-95 transition-transform touch-action:manipulation flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
          </button>
          {/* Price */}
          <span className="text-muted-foreground text-xs font-medium min-w-[4rem] text-right">
            {formatCurrency(item.price * item.quantity)}
          </span>
        </div>
      ))}
      <div className="flex justify-between items-center pt-4 border-t-2 border-border mt-4">
        <span className="font-bold text-lg">Tổng cộng</span>
        <span className="text-2xl font-black text-amber-600"><b>{formatCurrency(order.totalAmount)}</b></span>
      </div>
    </div>
  );
}
