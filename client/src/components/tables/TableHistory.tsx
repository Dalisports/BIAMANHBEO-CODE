import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import type { Order } from "@/hooks/use-orders";

interface TableHistoryProps {
  selectedTable: number;
  recentPaidOrder?: Order;
  orders?: any[];
}

export function TableHistory({ selectedTable, recentPaidOrder }: TableHistoryProps) {
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());

  const toggleOrder = (id: number) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getTablePaidHistory = (tableNum: number): Order[] => {
    return []; // Sẽ implement sau khi có API
  };

  const history = getTablePaidHistory(selectedTable);

  return (
    <div className="space-y-3">
      {recentPaidOrder && (
        <div className="bg-green-50 rounded-xl p-3 border border-green-200">
          <p className="text-sm font-bold text-green-700 mb-2">Đơn hàng gần nhất</p>
          <div className="flex justify-between items-center">
            <span className="text-sm">{formatCurrency(recentPaidOrder.totalAmount)}</span>
            <span className="text-xs text-muted-foreground">
              {recentPaidOrder.createdAt && format(new Date(recentPaidOrder.createdAt), "HH:mm")}
            </span>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <p className="text-sm font-bold mb-2">Lịch sử gần đây</p>
          <div className="space-y-2">
            {history.map(order => {
              const isExpanded = expandedOrders.has(order.id);
              return (
                <div key={order.id} className="bg-white rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => toggleOrder(order.id)}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-secondary/50"
                  >
                    <div>
                      <p className="font-medium text-sm">{formatCurrency(order.totalAmount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.createdAt && format(new Date(order.createdAt), "dd/MM HH:mm")}
                      </p>
                    </div>
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-1">
                      {order.items?.map((item: any, idx: number) => (
                        <p key={idx} className="text-sm text-muted-foreground">
                          {item.quantity}x {item.name}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!recentPaidOrder && history.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>Chưa có lịch sử thanh toán</p>
        </div>
      )}
    </div>
  );
}
