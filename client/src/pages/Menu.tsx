import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMenuItems, useCreateMenuItem, useUpdateMenuItem, useDeleteMenuItem } from "@/hooks/use-menu";
import { useCreateOrder } from "@/hooks/use-orders";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, Minus, ShoppingCart, Beer, X, Loader2, Search, Edit2, Trash2, AlertTriangle, UtensilsCrossed, Link
} from "lucide-react";

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=400&h=300&fit=crop",
];

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export default function Menu() {
  const { data: menuItems, isLoading } = useMenuItems();
  const createMenuItem = useCreateMenuItem();
  const updateMenuItem = useUpdateMenuItem();
  const deleteMenuItem = useDeleteMenuItem();
  const createOrder = useCreateOrder();
  const { toast } = useToast();
  const { isOwner } = useAuth();
  
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cart");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [showCart, setShowCart] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editItem, setEditItem] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  const [selectedTable, setSelectedTable] = useState("");

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);
  
  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    description: "",
    image: "",
  });
  
  const [editForm, setEditForm] = useState({
    name: "",
    price: "",
    description: "",
    image: "",
    isSticky: false,
  });

  const filteredItems = menuItems?.filter(item => {
    const matchesSearch = searchQuery === "" || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && item.isActive;
  });

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => 
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, {
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        image: item.image,
      }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !newItem.price) return;
    
    createMenuItem.mutate(
      { 
        name: newItem.name, 
        price: parseInt(newItem.price, 10), 
        description: newItem.description,
        image: newItem.image || null,
      },
      { onSuccess: () => {
        setShowAddDialog(false);
        setNewItem({ name: "", price: "", description: "", image: "" });
      }}
    );
  };

  const getPlaceholderImage = (index: number) => {
    return PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length];
  };

  const handleOpenEdit = (item: any) => {
    setEditItem(item);
    setEditForm({
      name: item.name,
      price: item.price.toString(),
      description: item.description || "",
      image: item.image || "",
      isSticky: item.isSticky || false,
    });
    setShowEditDialog(true);
  };

  const handleEditItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem || !editForm.name || !editForm.price) return;
    
    updateMenuItem.mutate(
      {
        id: editItem.id,
        name: editForm.name,
        price: parseInt(editForm.price, 10),
        description: editForm.description,
        image: editForm.image || null,
        isSticky: editItem.isSticky || false,
      },
      {
        onSuccess: () => {
          setShowEditDialog(false);
          setEditItem(null);
        },
      }
    );
  };

  const handleOpenDelete = (id: number) => {
    setDeleteItemId(id);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (!deleteItemId) return;
    deleteMenuItem.mutate(deleteItemId, {
      onSuccess: () => {
        setShowDeleteDialog(false);
        setDeleteItemId(null);
      },
    });
  };

  const handleSubmitOrder = async () => {
    if (!selectedTable.trim()) {
      toast({
        title: "Chưa chọn bàn",
        description: "Vui lòng chọn số bàn trước khi đặt hàng",
        variant: "destructive",
      });
      return;
    }

    const orderData = {
      tableNumber: selectedTable.trim(),
      items: cart.map(item => ({
        menuItemId: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      totalAmount: cartTotal,
    };

    createOrder.mutate(orderData, {
      onSuccess: () => {
        setCart([]);
        localStorage.removeItem("cart");
        setSelectedTable("");
        toast({
          title: "Đặt hàng thành công!",
          description: `Đơn hàng bàn ${selectedTable} đã được tạo`,
        });
        setCart([]);
        setSelectedTable("");
        setShowCart(false);
      },
      onError: (error) => {
        toast({
          title: "Lỗi",
          description: error instanceof Error ? error.message : "Không thể tạo đơn hàng",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 to-background pb-24 md:pb-6">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="px-3 py-3 md:px-4 md:py-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm món..."
                className="w-full pl-9 md:pl-12 pr-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl bg-secondary/50 border-2 border-transparent focus:border-amber-400 transition-all outline-none text-sm md:text-base"
              />
            </div>
            <button
              onClick={() => setShowCart(true)}
              className="relative p-2.5 md:p-3 rounded-xl md:rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all flex-shrink-0 active:scale-95"
            >
              <ShoppingCart className="w-5 h-5 md:w-6 md:h-6" />
              {cartCount > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 min-w-[20px] h-5 md:h-6 px-1 rounded-full bg-black text-amber-500 text-[10px] md:text-xs font-bold flex items-center justify-center"
                >
                  {cartCount > 99 ? "99+" : cartCount}
                </motion.span>
              )}
            </button>
            {isOwner && (
              <button
                onClick={() => setShowAddDialog(true)}
                className="p-2.5 md:p-3 rounded-xl md:rounded-2xl bg-blue-500 hover:bg-blue-600 text-white shadow-lg transition-all flex-shrink-0 active:scale-95"
              >
                <Plus className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-3 py-4 md:px-4 md:py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
          </div>
        ) : !filteredItems?.length ? (
          <div className="flex flex-col items-center justify-center py-16 md:py-24 text-center px-4">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl md:rounded-3xl bg-gradient-to-br from-amber-100 to-yellow-100 flex items-center justify-center mb-4 md:mb-6">
              <Beer className="w-10 h-10 md:w-12 md:h-12 text-amber-500" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold mb-2">Chưa có món nào</h3>
            <p className="text-muted-foreground mb-6 text-sm md:text-base">Hãy thêm món mới vào thực đơn</p>
            <button
              onClick={() => setShowAddDialog(true)}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold shadow-lg shadow-amber-500/30 active:scale-95 transition-transform"
            >
              + Thêm Món Mới
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-5">
            {filteredItems.map((item, index) => {
              const cartItem = cart.find(c => c.id === item.id);
              const quantity = cartItem?.quantity || 0;
              
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="group bg-card rounded-2xl md:rounded-3xl overflow-hidden border-2 border-border shadow-sm hover:shadow-xl hover:border-amber-300 transition-all duration-300"
                >
                  <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-amber-100 to-yellow-100">
                    {item.image ? (
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <img 
                        src={getPlaceholderImage(index)}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                    
                    {!item.isAvailable && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white font-bold text-sm md:text-lg">Hết món</span>
                      </div>
                    )}
                    
                    {isOwner && (
                      <div className="absolute top-1.5 right-1.5 md:top-2 md:right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 md:p-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg transition-colors active:scale-90"
                          title="Sửa"
                        >
                          <Edit2 className="w-3 h-3 md:w-4 md:h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(item.id)}
                          className="p-1.5 md:p-2 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg transition-colors active:scale-90"
                          title="Xóa"
                        >
                          <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="p-2.5 md:p-4">
                    <h3 className="font-bold text-sm md:text-base lg:text-lg mb-0.5 md:mb-1 line-clamp-2 leading-tight">{item.name}</h3>
                    {item.description && (
                      <p className="text-[10px] md:text-xs text-muted-foreground mb-2 line-clamp-1 hidden md:block">{item.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm md:text-base lg:text-xl font-black text-amber-600 truncate">
                        {formatCurrency(item.price)}
                      </span>

                      {item.isAvailable ? (
                        <div className="flex items-center gap-1">
                          {quantity > 0 ? (
                            <div className="flex items-center gap-0.5 md:gap-1 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full p-0.5 md:p-1">
                              <button
                                onClick={() => updateQuantity(item.id, -1)}
                                className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-colors active:scale-90"
                              >
                                <Minus className="w-3 h-3 md:w-4 md:h-4 text-black" />
                              </button>
                              <span className="w-6 md:w-8 text-center font-bold text-black text-xs md:text-sm">{quantity}</span>
                              <button
                                onClick={() => addToCart(item)}
                                className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-colors active:scale-90"
                              >
                                <Plus className="w-3 h-3 md:w-4 md:h-4 text-black" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(item)}
                              className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black flex items-center justify-center shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all active:scale-95"
                            >
                              <Plus className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCart && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:flex md:items-center md:justify-center md:p-4"
            onClick={() => setShowCart(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-background shadow-2xl flex flex-col md:rounded-3xl md:max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 md:p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl md:text-2xl font-black">
                    <span className="text-amber-500">GIỎ HÀNG</span>
                  </h2>
                  <button
                    onClick={() => setShowCart(false)}
                    className="p-2 rounded-full hover:bg-secondary transition-colors active:scale-90"
                  >
                    <X className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-6">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <ShoppingCart className="w-12 h-12 md:w-16 md:h-16 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">Giỏ hàng trống</p>
                  </div>
                ) : (
                  <div className="space-y-3 md:space-y-4">
                    <div className="p-3 md:p-4 bg-gradient-to-r from-amber-100 to-yellow-100 rounded-xl md:rounded-2xl border-2 border-amber-300">
                      <label className="flex items-center gap-2 text-sm font-bold text-amber-800 mb-2">
                        <UtensilsCrossed className="w-4 h-4" />
                        Chọn bàn
                      </label>
                      <Select value={selectedTable} onValueChange={setSelectedTable}>
                        <SelectTrigger className="bg-white border-2 border-amber-300 focus:border-amber-500">
                          <SelectValue placeholder="Chọn bàn..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Bàn 1</SelectItem>
                          <SelectItem value="2">Bàn 2</SelectItem>
                          <SelectItem value="3">Bàn 3</SelectItem>
                          <SelectItem value="4">Bàn 4</SelectItem>
                          <SelectItem value="5">Bàn 5</SelectItem>
                          <SelectItem value="6">Bàn 6</SelectItem>
                          <SelectItem value="7">Bàn 7</SelectItem>
                          <SelectItem value="8">Bàn 8</SelectItem>
                          <SelectItem value="9">Bàn 9</SelectItem>
                          <SelectItem value="10">Bàn 10</SelectItem>
                          <SelectItem value="11">Bàn 11</SelectItem>
                          <SelectItem value="12">Bàn 12</SelectItem>
                          <SelectItem value="Quầy bar">Quầy bar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-card rounded-xl md:rounded-2xl border-2 border-border">
                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-gradient-to-br from-amber-100 to-yellow-100 overflow-hidden flex-shrink-0">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Beer className="w-6 h-6 md:w-8 md:h-8 text-amber-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm md:text-base truncate">{item.name}</h4>
                          <p className="text-amber-600 font-bold text-sm md:text-base">{formatCurrency(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors active:scale-90"
                          >
                            <Minus className="w-3 h-3 md:w-4 md:h-4" />
                          </button>
                          <span className="w-6 md:w-8 text-center font-bold text-sm md:text-base">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-amber-400 hover:bg-amber-500 text-black flex items-center justify-center transition-colors active:scale-90"
                          >
                            <Plus className="w-3 h-3 md:w-4 md:h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-4 md:p-6 border-t border-border bg-gradient-to-r from-amber-50 to-yellow-50">
                  <div className="flex items-center justify-between mb-3 md:mb-4">
                    <span className="text-sm md:text-lg font-bold text-muted-foreground">Tổng cộng:</span>
                    <span className="text-2xl md:text-3xl font-black text-amber-600">{formatCurrency(cartTotal)}</span>
                  </div>
                  <button 
                    onClick={handleSubmitOrder}
                    disabled={createOrder.isPending}
                    className="w-full py-3 md:py-4 rounded-xl md:rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-black text-base md:text-lg shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all disabled:opacity-50 active:scale-[0.98]"
                  >
                    {createOrder.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Đang xử lý...
                      </span>
                    ) : (
                      "ĐẶT HÀNG NGAY"
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAddDialog(false)}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="bg-card w-full max-w-md rounded-t-3xl md:rounded-3xl shadow-2xl border-2 border-amber-200 flex flex-col"
              style={{ maxHeight: "90dvh" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Fixed header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
                <h3 className="text-xl md:text-2xl font-black text-amber-500">THÊM MÓN MỚI</h3>
                <button
                  onClick={() => setShowAddDialog(false)}
                  className="p-2 rounded-full hover:bg-secondary transition-colors active:scale-90"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable form content */}
              <div className="overflow-y-auto flex-1 px-5">
                <form id="add-item-form" onSubmit={handleAddItem} className="space-y-4 pb-2">
                  <div>
                    <label className="block text-sm font-bold mb-1.5">Tên món</label>
                    <input
                      autoFocus
                      type="text"
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-background border-2 border-border focus:border-amber-400 transition-all outline-none"
                      placeholder="VD: Gà rán giòn"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold mb-1.5">Giá (VNĐ)</label>
                    <input
                      type="number"
                      value={newItem.price}
                      onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-background border-2 border-border focus:border-amber-400 transition-all outline-none"
                      placeholder="VD: 89000"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold mb-1.5">Mô tả</label>
                    <textarea
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-background border-2 border-border focus:border-amber-400 transition-all outline-none resize-none"
                      rows={2}
                      placeholder="Mô tả món ăn..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-1.5">Ảnh món ăn</label>
                    <div className="relative">
                      <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="url"
                        value={newItem.image}
                        onChange={(e) => setNewItem({ ...newItem, image: e.target.value })}
                        className="w-full pl-10 px-4 py-3 rounded-xl bg-background border-2 border-border focus:border-amber-400 transition-all outline-none"
                        placeholder="Link ảnh..."
                      />
                    </div>
                    {newItem.image && (
                      <div className="mt-2 relative aspect-video rounded-lg overflow-hidden bg-secondary">
                        <img 
                          src={newItem.image} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                          onError={(e) => e.currentTarget.style.display = 'none'} 
                        />
                      </div>
                    )}
                  </div>
                </form>
              </div>

              {/* Fixed action buttons */}
              <div className="flex gap-3 px-5 pt-3 pb-6 flex-shrink-0 border-t border-border bg-card">
                <button
                  type="button"
                  onClick={() => setShowAddDialog(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-bold bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  form="add-item-form"
                  disabled={createMenuItem.isPending}
                  className="flex-1 px-4 py-3 rounded-xl font-bold bg-gradient-to-r from-amber-400 to-yellow-500 text-black disabled:opacity-50 transition-all"
                >
                  {createMenuItem.isPending ? "Đang thêm..." : "Thêm món"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEditDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowEditDialog(false)}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="bg-card w-full max-w-md rounded-t-3xl md:rounded-3xl shadow-2xl border-2 border-blue-200 flex flex-col"
              style={{ maxHeight: "90dvh" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Fixed header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
                <h3 className="text-xl md:text-2xl font-black text-blue-500">SỬA MÓN</h3>
                <button
                  onClick={() => setShowEditDialog(false)}
                  className="p-2 rounded-full hover:bg-secondary transition-colors active:scale-90"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable form content */}
              <div className="overflow-y-auto flex-1 px-5">
                <form id="edit-item-form" onSubmit={handleEditItem} className="space-y-4 pb-2">
                  <div>
                    <label className="block text-sm font-bold mb-1.5">Tên món</label>
                    <input
                      autoFocus
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-background border-2 border-border focus:border-blue-400 transition-all outline-none"
                      placeholder="VD: Gà rán giòn"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold mb-1.5">Giá (VNĐ)</label>
                    <input
                      type="number"
                      value={editForm.price}
                      onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-background border-2 border-border focus:border-blue-400 transition-all outline-none"
                      placeholder="VD: 89000"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold mb-1.5">Mô tả</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-background border-2 border-border focus:border-blue-400 transition-all outline-none resize-none"
                      rows={2}
                      placeholder="Mô tả món ăn..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-1.5">Ảnh món ăn</label>
                    <div className="relative">
                      <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="url"
                        value={editForm.image}
                        onChange={(e) => setEditForm({ ...editForm, image: e.target.value })}
                        className="w-full pl-10 px-4 py-3 rounded-xl bg-background border-2 border-border focus:border-blue-400 transition-all outline-none"
                        placeholder="Link ảnh..."
                      />
                    </div>
                    {editForm.image && (
                      <div className="mt-2 relative aspect-video rounded-lg overflow-hidden bg-secondary">
                        <img 
                          src={editForm.image} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                          onError={(e) => e.currentTarget.style.display = 'none'} 
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl border-2 border-yellow-300">
                    <div>
                      <p className="font-bold text-yellow-800 text-sm">Sticky TV</p>
                      <p className="text-xs text-yellow-600">Hiển thị trên màn hình TV</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newSticky = !editForm.isSticky;
                        setEditForm({ ...editForm, isSticky: newSticky });
                        if (editItem) {
                          updateMenuItem.mutate({ id: editItem.id, isSticky: newSticky }, {
                            onSuccess: () => {
                              toast({
                                title: newSticky ? "Đã bật Sticky TV" : "Đã tắt Sticky TV",
                                description: `Món "${editItem.name}" đã ${newSticky ? 'hiển thị' : 'ẩn'} khỏi màn hình TV`,
                              });
                            },
                            onError: () => {
                              toast({
                                title: "Lỗi",
                                description: "Không thể cập nhật Sticky TV",
                                variant: "destructive",
                              });
                            },
                          });
                        }
                      }}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${editForm.isSticky ? 'bg-yellow-500' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${editForm.isSticky ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </form>
              </div>

              {/* Fixed action buttons */}
              <div className="flex gap-3 px-5 pt-3 pb-6 flex-shrink-0 border-t border-border bg-card">
                <button
                  type="button"
                  onClick={() => setShowEditDialog(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-bold bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  form="edit-item-form"
                  disabled={updateMenuItem.isPending}
                  className="flex-1 px-4 py-3 rounded-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 text-white disabled:opacity-50 transition-all"
                >
                  {updateMenuItem.isPending ? "Đang sửa..." : "Lưu"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDeleteDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card w-full max-w-sm rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-2xl border-2 border-red-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-center mb-4">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-7 h-7 md:w-8 md:h-8 text-red-500" />
                </div>
              </div>
              <h3 className="text-lg md:text-xl font-black text-center mb-2">XÁC NHẬN XÓA</h3>
              <p className="text-center text-muted-foreground mb-5 text-sm md:text-base">
                Bạn có chắc muốn xóa món này? Hành động này không thể hoàn tác.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteDialog(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-bold bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleteMenuItem.isPending}
                  className="flex-1 px-4 py-3 rounded-xl font-bold bg-gradient-to-r from-red-500 to-red-600 text-white disabled:opacity-50 transition-all"
                >
                  {deleteMenuItem.isPending ? "Đang xóa..." : "Xóa"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
