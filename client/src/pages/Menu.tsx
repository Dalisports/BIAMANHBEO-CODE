import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMenuItems, useCreateMenuItem, useUpdateMenuItem, useDeleteMenuItem } from "@/hooks/use-menu";
import { formatCurrency } from "@/lib/utils";
import { 
  Plus, Minus, ShoppingCart, Beer, X, Loader2, Search, Edit2, Trash2, AlertTriangle
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
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editItem, setEditItem] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  
  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    description: "",
  });
  
  const [editForm, setEditForm] = useState({
    name: "",
    price: "",
    description: "",
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
      },
      { onSuccess: () => {
        setShowAddDialog(false);
        setNewItem({ name: "", price: "", description: "" });
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 to-background">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="relative flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm món..."
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-secondary/50 border-2 border-transparent focus:border-amber-400 transition-all outline-none"
              />
            </div>
            <button
              onClick={() => setShowCart(true)}
              className="relative p-3 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all flex-shrink-0"
            >
              <ShoppingCart className="w-6 h-6" />
              {cartCount > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-black text-amber-500 text-xs font-bold flex items-center justify-center"
                >
                  {cartCount}
                </motion.span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
          </div>
        ) : !filteredItems?.length ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-100 to-yellow-100 flex items-center justify-center mb-6">
              <Beer className="w-12 h-12 text-amber-500" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Chưa có món nào</h3>
            <p className="text-muted-foreground mb-6">Hãy thêm món mới vào thực đơn</p>
            <button
              onClick={() => setShowAddDialog(true)}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold shadow-lg shadow-amber-500/30"
            >
              + Thêm Món Mới
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredItems.map((item, index) => {
              const cartItem = cart.find(c => c.id === item.id);
              const quantity = cartItem?.quantity || 0;
              
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="group bg-card rounded-3xl overflow-hidden border-2 border-border shadow-sm hover:shadow-xl hover:border-amber-300 transition-all duration-300"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-amber-100 to-yellow-100">
                    {item.image ? (
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <img 
                        src={getPlaceholderImage(index)}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    )}
                    
                    {!item.isAvailable && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">Hết món</span>
                      </div>
                    )}
                    
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg transition-colors"
                        title="Sửa"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenDelete(item.id)}
                        className="p-2 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-1 line-clamp-1">{item.name}</h3>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{item.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-black text-amber-600">
                        {formatCurrency(item.price)}
                      </span>

                      {item.isAvailable ? (
                        <div className="flex items-center gap-2">
                          {quantity > 0 ? (
                            <div className="flex items-center gap-1 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full p-1">
                              <button
                                onClick={() => updateQuantity(item.id, -1)}
                                className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-colors"
                              >
                                <Minus className="w-4 h-4 text-black" />
                              </button>
                              <span className="w-8 text-center font-bold text-black">{quantity}</span>
                              <button
                                onClick={() => addToCart(item)}
                                className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-colors"
                              >
                                <Plus className="w-4 h-4 text-black" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(item)}
                              className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black flex items-center justify-center shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all"
                            >
                              <Plus className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </motion.div>
              );
            })}

            <button
              onClick={() => setShowAddDialog(true)}
              className="aspect-[4/3] rounded-3xl border-2 border-dashed border-border hover:border-amber-400 bg-secondary/30 flex flex-col items-center justify-center gap-3 transition-all hover:bg-amber-50/50"
            >
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                <Plus className="w-8 h-8 text-amber-600" />
              </div>
              <span className="font-bold text-muted-foreground">Thêm món mới</span>
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCart && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCart(false)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-background shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col h-full">
                <div className="p-6 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black">
                      <span className="text-amber-500">GIỎ HÀNG</span>
                    </h2>
                    <button
                      onClick={() => setShowCart(false)}
                      className="p-2 rounded-full hover:bg-secondary transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <ShoppingCart className="w-16 h-16 text-muted-foreground/30 mb-4" />
                      <p className="text-muted-foreground">Giỏ hàng trống</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cart.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 p-4 bg-card rounded-2xl border-2 border-border">
                          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-100 to-yellow-100 overflow-hidden flex-shrink-0">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Beer className="w-8 h-8 text-amber-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold truncate">{item.name}</h4>
                            <p className="text-amber-600 font-bold">{formatCurrency(item.price)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center font-bold">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="w-8 h-8 rounded-full bg-amber-400 hover:bg-amber-500 text-black flex items-center justify-center transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {cart.length > 0 && (
                  <div className="p-6 border-t border-border bg-gradient-to-r from-amber-50 to-yellow-50">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-lg font-bold text-muted-foreground">Tổng cộng:</span>
                      <span className="text-3xl font-black text-amber-600">{formatCurrency(cartTotal)}</span>
                    </div>
                    <button className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-black text-lg shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all">
                      ĐẶT HÀNG NGAY
                    </button>
                  </div>
                )}
              </div>
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAddDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card w-full max-w-md rounded-3xl p-6 shadow-2xl border-2 border-amber-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black text-amber-500">THÊM MÓN MỚI</h3>
                <button
                  onClick={() => setShowAddDialog(false)}
                  className="p-2 rounded-full hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddItem} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Tên món</label>
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
                  <label className="block text-sm font-bold mb-2">Giá (VNĐ)</label>
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
                  <label className="block text-sm font-bold mb-2">Mô tả</label>
                  <textarea
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-background border-2 border-border focus:border-amber-400 transition-all outline-none resize-none"
                    rows={2}
                    placeholder="Mô tả món ăn..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddDialog(false)}
                    className="flex-1 px-4 py-3 rounded-xl font-bold bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={createMenuItem.isPending}
                    className="flex-1 px-4 py-3 rounded-xl font-bold bg-gradient-to-r from-amber-400 to-yellow-500 text-black disabled:opacity-50 transition-all"
                  >
                    {createMenuItem.isPending ? "Đang thêm..." : "Thêm món"}
                  </button>
                </div>
              </form>
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowEditDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card w-full max-w-md rounded-3xl p-6 shadow-2xl border-2 border-blue-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black text-blue-500">SỬA MÓN</h3>
                <button
                  onClick={() => setShowEditDialog(false)}
                  className="p-2 rounded-full hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditItem} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Tên món</label>
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
                  <label className="block text-sm font-bold mb-2">Giá (VNĐ)</label>
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
                  <label className="block text-sm font-bold mb-2">Mô tả</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-background border-2 border-border focus:border-blue-400 transition-all outline-none resize-none"
                    rows={2}
                    placeholder="Mô tả món ăn..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditDialog(false)}
                    className="flex-1 px-4 py-3 rounded-xl font-bold bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={updateMenuItem.isPending}
                    className="flex-1 px-4 py-3 rounded-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 text-white disabled:opacity-50 transition-all"
                  >
                    {updateMenuItem.isPending ? "Đang sửa..." : "Lưu"}
                  </button>
                </div>
              </form>
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
              className="bg-card w-full max-w-sm rounded-3xl p-6 shadow-2xl border-2 border-red-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
              </div>
              <h3 className="text-xl font-black text-center mb-2">XÁC NHẬN XÓA</h3>
              <p className="text-center text-muted-foreground mb-6">
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
