import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOrders, useCreateOrder, useUpdateOrder, type Order, type OrderItem } from "@/hooks/use-orders";
import { useMenuItems } from "@/hooks/use-menu";
import { formatCurrency, cn } from "@/lib/utils";
import { 
  Plus, Minus, X, Send, CreditCard, Trash2, UtensilsCrossed, 
  Clock, CheckCircle2, Loader2, ChefHat, Receipt
} from "lucide-react";

const TABLE_STATUS = {
  empty: { label: "Trống", bg: "bg-green-50", border: "border-green-300", text: "text-green-700" },
  pending: { label: "Chờ xử lý", bg: "bg-yellow-50", border: "border-yellow-400", text: "text-yellow-700" },
  cooking: { label: "Đang nấu", bg: "bg-red-50", border: "border-red-400", text: "text-red-700" },
  ready: { label: "Chờ thanh toán", bg: "bg-blue-50", border: "border-blue-400", text: "text-blue-700" },
  paid: { label: "Đã thanh toán", bg: "bg-gray-50", border: "border-gray-300", text: "text-gray-500" },
};

const QUICK_ITEMS = [
  { id: 100, name: "Cốc bia", price: 15000 },
  { id: 101, name: "Ca bia", price: 25000 },
  { id: 102, name: "Lạc", price: 20000 },
];

const MAX_TABLES = 15;

function getTableStatus(order: Order | undefined): keyof typeof TABLE_STATUS {
  if (!order) return "empty";
  if (order.paymentStatus === "Paid") return "paid";
  if (order.status === "Ready") return "ready";
  if (order.status === "InKitchen") return "cooking";
  if (order.status === "Pending") return "pending";
  return "empty";
}

export default function Tables() {
  const { data: orders, isLoading: ordersLoading } = useOrders();
  const { data: menuItems, isLoading: menuLoading } = useMenuItems();
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();
  
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [searchMenu, setSearchMenu] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  const getOrderByTable = (tableNum: number): Order | undefined => {
    return orders?.find(o => o.tableNumber === tableNum.toString() && o.status !== "Complete");
  };

  const selectedOrder = selectedTable ? getOrderByTable(selectedTable) : undefined;

  const filteredMenuItems = menuItems?.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(searchMenu.toLowerCase());
    const matchCategory = !selectedCategory || item.categoryId === selectedCategory;
    return matchSearch && matchCategory && item.isAvailable;
  }) || [];

  const handleSelectTable = (tableNum: number) => {
    setSelectedTable(tableNum);
  };

  const handleQuickAdd = (menuItem: typeof QUICK_ITEMS[0]) => {
    if (!selectedTable) {
      setSelectedTable(1);
      setTimeout(() => {
        const order = getOrderByTable(1);
        if (order) {
          const existingItems = [...order.items];
          const existingIndex = existingItems.findIndex(i => i.name === menuItem.name);
          if (existingIndex >= 0) {
            existingItems[existingIndex] = { ...existingItems[existingIndex], quantity: existingItems[existingIndex].quantity + 1 };
          } else {
            existingItems.push({ menuItemId: menuItem.id, name: menuItem.name, quantity: 1, price: menuItem.price });
          }
          const newTotal = existingItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
          updateOrder.mutate({ id: order.id, items: existingItems, totalAmount: newTotal });
        } else {
          createOrder.mutate({
            tableNumber: "1",
            items: [{ menuItemId: menuItem.id, name: menuItem.name, quantity: 1, price: menuItem.price }],
            totalAmount: menuItem.price,
          });
        }
      }, 100);
      return;
    }

    const existingOrder = selectedOrder;
    if (existingOrder) {
      const existingItems = [...existingOrder.items];
      const existingIndex = existingItems.findIndex(i => i.name === menuItem.name);
      if (existingIndex >= 0) {
        existingItems[existingIndex] = { ...existingItems[existingIndex], quantity: existingItems[existingIndex].quantity + 1 };
      } else {
        existingItems.push({ menuItemId: menuItem.id, name: menuItem.name, quantity: 1, price: menuItem.price });
      }
      const newTotal = existingItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      updateOrder.mutate({ id: existingOrder.id, items: existingItems, totalAmount: newTotal });
    } else {
      createOrder.mutate({
        tableNumber: selectedTable.toString(),
        items: [{ menuItemId: menuItem.id, name: menuItem.name, quantity: 1, price: menuItem.price }],
        totalAmount: menuItem.price,
      });
    }
  };

  const handleAddItem = (menuItem: any, quantity: number = 1) => {
    if (!selectedTable) return;
    
    const newItem: OrderItem = {
      menuItemId: menuItem.id,
      name: menuItem.name,
      quantity,
      price: menuItem.price,
    };

    if (selectedOrder) {
      const existingItems = [...selectedOrder.items];
      const existingIndex = existingItems.findIndex(
        i => i.menuItemId === menuItem.id
      );
      
      if (existingIndex >= 0) {
        existingItems[existingIndex] = {
          ...existingItems[existingIndex],
          quantity: existingItems[existingIndex].quantity + quantity
        };
      } else {
        existingItems.push(newItem);
      }
      
      const newTotal = existingItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      updateOrder.mutate({
        id: selectedOrder.id,
        items: existingItems,
        totalAmount: newTotal,
      });
    } else {
      createOrder.mutate({
        tableNumber: selectedTable.toString(),
        items: [newItem],
        totalAmount: menuItem.price * quantity,
      });
    }
  };

  const handleRemoveItem = (index: number) => {
    if (!selectedOrder) return;
    
    const existingItems = [...selectedOrder.items];
    existingItems.splice(index, 1);
    
    if (existingItems.length === 0) {
      return;
    }
    
    const newTotal = existingItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    updateOrder.mutate({
      id: selectedOrder.id,
      items: existingItems,
      totalAmount: newTotal,
    });
  };

  const handleUpdateQuantity = (index: number, delta: number) => {
    if (!selectedOrder) return;
    
    const existingItems = [...selectedOrder.items];
    const newQty = existingItems[index].quantity + delta;
    
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    
    existingItems[index] = {
      ...existingItems[index],
      quantity: newQty
    };
    
    const newTotal = existingItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    updateOrder.mutate({
      id: selectedOrder.id,
      items: existingItems,
      totalAmount: newTotal,
    });
  };

  const handleSendToKitchen = async () => {
    if (!selectedOrder) return;
    await fetch(`/api/orders/${selectedOrder.id}/send-to-kitchen`, {
      method: "POST",
      credentials: "include",
    });
  };

  const handlePay = async () => {
    if (!selectedOrder) return;
    await fetch(`/api/orders/${selectedOrder.id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: "cash" }),
      credentials: "include",
    });
  };

  const currentTableStatus = selectedOrder ? getTableStatus(selectedOrder) : "empty";
  const statusInfo = TABLE_STATUS[currentTableStatus];

  if (ordersLoading || menuLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Quản lý Bàn</h2>
          <p className="text-sm text-muted-foreground">Chọn bàn để thêm/xóa món</p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-2 overflow-y-auto pr-1 mb-4">
        {Array.from({ length: MAX_TABLES }, (_, i) => i + 1).map(tableNum => {
          const order = getOrderByTable(tableNum);
          const status = getTableStatus(order);
          const statusConfig = TABLE_STATUS[status];
          const isSelected = selectedTable === tableNum;
          
          return (
            <button
              key={tableNum}
              onClick={() => handleSelectTable(tableNum)}
              className={cn(
                "aspect-square rounded-xl border-2 flex flex-col items-center justify-center transition-all duration-200 p-1",
                isSelected 
                  ? "ring-2 ring-primary ring-offset-2 shadow-lg" 
                  : "hover:scale-105 hover:shadow-md",
                statusConfig.bg,
                statusConfig.border
              )}
            >
              <span className="text-lg font-bold">Bàn</span>
              <span className="text-xl font-bold">{tableNum}</span>
              {order && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-white/70">
                    {order.items?.length || 0} món
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedTable && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm p-4 flex flex-col"
          >
            <div className="flex-1 max-w-2xl mx-auto w-full flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-sm font-bold border",
                    statusInfo.bg, statusInfo.border, statusInfo.text
                  )}>
                    {statusInfo.label}
                  </span>
                  <h3 className="text-2xl font-bold">Bàn {selectedTable}</h3>
                </div>
                <button
                  onClick={() => setSelectedTable(null)}
                  className="p-2 rounded-lg hover:bg-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {selectedOrder && selectedOrder.items && selectedOrder.items.length > 0 && (
                <div className="bg-card rounded-xl border p-3 flex-shrink-0 max-h-40 overflow-y-auto">
                  <h4 className="text-sm font-bold text-muted-foreground mb-2">Đã đặt ({selectedOrder.items.length} món)</h4>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                            {item.quantity}
                          </span>
                          <span className="font-medium text-sm">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                          <button
                            onClick={() => handleUpdateQuantity(idx, -1)}
                            className="w-6 h-6 rounded hover:bg-secondary flex items-center justify-center"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleUpdateQuantity(idx, 1)}
                            className="w-6 h-6 rounded hover:bg-secondary flex items-center justify-center"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleRemoveItem(idx)}
                            className="w-6 h-6 rounded bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-2 border-t flex justify-between">
                    <span className="font-bold">Tổng cộng</span>
                    <span className="text-xl font-bold text-accent">
                      {formatCurrency(selectedOrder.totalAmount)}
                    </span>
                  </div>
                </div>
              )}

              <div className="bg-secondary/50 rounded-xl p-2 flex-shrink-0">
                <input
                  type="text"
                  placeholder="Tìm món..."
                  value={searchMenu}
                  onChange={(e) => setSearchMenu(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-background border mb-2"
                />
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {QUICK_ITEMS.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleQuickAdd(item)}
                      className="p-2 rounded-lg border-2 border-yellow-400 bg-yellow-50 hover:bg-yellow-100 text-center"
                    >
                      <p className="font-bold text-sm">{item.name}</p>
                      <p className="text-xs text-yellow-700 font-semibold">{formatCurrency(item.price)}</p>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {filteredMenuItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleAddItem(item, 1)}
                      className="p-2 rounded-lg bg-background border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                    >
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(item.price)}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                {selectedOrder && currentTableStatus === "pending" && (
                  <button
                    onClick={handleSendToKitchen}
                    disabled={createOrder.isPending || updateOrder.isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    Gửi Bếp
                  </button>
                )}
                {selectedOrder && (currentTableStatus === "ready" || currentTableStatus === "cooking") && (
                  <button
                    onClick={handlePay}
                    disabled={createOrder.isPending || updateOrder.isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
                  >
                    <CreditCard className="w-4 h-4" />
                    Thanh Toán
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}