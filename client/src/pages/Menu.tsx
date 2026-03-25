import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMenuItems, useCategories, useCreateMenuItem, useUpdateMenuItem, useDeleteMenuItem, useCreateCategory, useDeleteCategory } from "@/hooks/use-menu";
import { formatCurrency, cn } from "@/lib/utils";
import { Plus, Package, Loader2, Pencil, Trash2, Check, X, UtensilsCrossed, Wine, Coffee, IceCream, Salad } from "lucide-react";

const CATEGORY_ICONS: Record<string, any> = {
  default: UtensilsCrossed,
  "Món ăn": UtensilsCrossed,
  "Đồ uống": Wine,
  "Cà phê": Coffee,
  "Tráng miệng": IceCream,
  "Khai vị": Salad,
};

export default function Menu() {
  const { data: menuItems, isLoading } = useMenuItems();
  const { data: categories } = useCategories();
  const createMenuItem = useCreateMenuItem();
  const updateMenuItem = useUpdateMenuItem();
  const deleteMenuItem = useDeleteMenuItem();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCategoryId, setEditCategoryId] = useState<number | undefined>();
  const [editDescription, setEditDescription] = useState("");
  const [filterCategory, setFilterCategory] = useState<number | null>(null);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const filteredItems = filterCategory 
    ? menuItems?.filter(item => item.categoryId === filterCategory)
    : menuItems;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName || !editPrice) return;
    
    createMenuItem.mutate(
      { name: editName, price: parseInt(editPrice, 10), categoryId: editCategoryId, description: editDescription },
      { onSuccess: () => {
        setShowDialog(false);
        resetForm();
      }}
    );
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditPrice(item.price.toString());
    setEditCategoryId(item.categoryId || undefined);
    setEditDescription(item.description || "");
  };

  const handleSaveEdit = () => {
    if (!editingId || !editName || !editPrice) return;
    updateMenuItem.mutate(
      { id: editingId, name: editName, price: parseInt(editPrice, 10), categoryId: editCategoryId, description: editDescription },
      { onSuccess: () => resetForm() }
    );
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc muốn xóa món này?")) {
      deleteMenuItem.mutate(id);
    }
  };

  const handleToggleAvailability = (item: any) => {
    updateMenuItem.mutate({ id: item.id, isAvailable: !item.isAvailable });
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    createCategory.mutate(
      { name: newCategoryName, displayOrder: (categories?.length || 0) + 1 },
      { onSuccess: () => {
        setShowCategoryDialog(false);
        setNewCategoryName("");
      }}
    );
  };

  const handleDeleteCategory = (id: number) => {
    if (confirm("Xóa danh mục này?")) {
      deleteCategory.mutate(id);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setEditName("");
    setEditPrice("");
    setEditCategoryId(undefined);
    setEditDescription("");
    setShowDialog(false);
  };

  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId) return "Không phân loại";
    return categories?.find(c => c.id === categoryId)?.name || "Không phân loại";
  };

  return (
    <div className="h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-sans font-bold text-foreground">Thực Đơn</h2>
          <p className="text-muted-foreground mt-1 text-sm">Quản lý món ăn và đồ uống</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCategoryDialog(true)}
            className="px-4 py-2 rounded-xl font-semibold bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
          >
            + Danh mục
          </button>
          <button
            onClick={() => setShowDialog(true)}
            className="flex items-center gap-2 px-6 py-2 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl transition-all"
          >
            <Plus className="w-5 h-5" />
            Thêm Món
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilterCategory(null)}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-semibold transition-all",
            filterCategory === null 
              ? "bg-primary text-primary-foreground" 
              : "bg-secondary text-muted-foreground hover:text-foreground"
          )}
        >
          Tất cả ({menuItems?.length || 0})
        </button>
        {categories?.map((cat) => {
          const count = menuItems?.filter(m => m.categoryId === cat.id).length || 0;
          return (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2",
                filterCategory === cat.id 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {cat.name}
              <span className="text-xs opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : !filteredItems?.length ? (
        <div className="flex flex-col items-center justify-center py-24 text-center px-4 bg-card rounded-3xl border border-border border-dashed">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground mb-4">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Chưa có món nào</h3>
          <p className="text-muted-foreground max-w-sm">Hãy thêm món mới vào thực đơn</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={cn(
                "bg-card rounded-2xl border-2 overflow-hidden transition-all hover:shadow-lg",
                item.isAvailable ? "border-border" : "border-red-200 opacity-60"
              )}
            >
              {editingId === item.id ? (
                <div className="p-4 space-y-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                    placeholder="Tên món"
                  />
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                    placeholder="Giá (VNĐ)"
                  />
                  <select
                    value={editCategoryId || ""}
                    onChange={(e) => setEditCategoryId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                  >
                    <option value="">Chọn danh mục</option>
                    {categories?.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={resetForm}
                      className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground hover:bg-secondary/80"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={updateMenuItem.isPending}
                      className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground"
                    >
                      Lưu
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-lg">{item.name}</h3>
                        <p className="text-xs text-muted-foreground">{getCategoryName(item.categoryId)}</p>
                      </div>
                      <span className="text-lg font-bold text-accent">{formatCurrency(item.price)}</span>
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleAvailability(item)}
                        className={cn(
                          "px-2 py-1 rounded text-xs font-semibold",
                          item.isAvailable 
                            ? "bg-green-100 text-green-700" 
                            : "bg-red-100 text-red-700"
                        )}
                      >
                        {item.isAvailable ? "Còn món" : "Hết món"}
                      </button>
                    </div>
                  </div>
                  <div className="flex border-t border-border">
                    <button
                      onClick={() => handleEdit(item)}
                      className="flex-1 py-2 text-sm text-muted-foreground hover:bg-secondary transition-colors flex items-center justify-center gap-1"
                    >
                      <Pencil className="w-4 h-4" /> Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="flex-1 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" /> Xóa
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-card w-full max-w-md rounded-3xl p-6 shadow-2xl border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold mb-6">Thêm Món Mới</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Tên món</label>
                  <input
                    autoFocus
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-background border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                    placeholder="Ví dụ: Gà rán giòn"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Giá (VNĐ)</label>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-background border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                    placeholder="Ví dụ: 89000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Danh mục</label>
                  <select
                    value={editCategoryId || ""}
                    onChange={(e) => setEditCategoryId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-4 py-3 rounded-xl bg-background border-2 border-border focus:border-primary transition-all"
                  >
                    <option value="">Chọn danh mục</option>
                    {categories?.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Mô tả (tùy chọn)</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-background border-2 border-border focus:border-primary transition-all resize-none"
                    rows={2}
                    placeholder="Mô tả món ăn..."
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowDialog(false)}
                    className="flex-1 px-4 py-3 rounded-xl font-semibold bg-secondary text-foreground hover:bg-secondary/80"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={createMenuItem.isPending}
                    className="flex-1 px-4 py-3 rounded-xl font-semibold bg-primary text-primary-foreground disabled:opacity-50"
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
        {showCategoryDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowCategoryDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-card w-full max-w-md rounded-3xl p-6 shadow-2xl border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold mb-6">Thêm Danh Mục Mới</h3>
              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Tên danh mục</label>
                  <input
                    autoFocus
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-background border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                    placeholder="Ví dụ: Món ăn, Đồ uống..."
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCategoryDialog(false)}
                    className="flex-1 px-4 py-3 rounded-xl font-semibold bg-secondary text-foreground hover:bg-secondary/80"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={createCategory.isPending}
                    className="flex-1 px-4 py-3 rounded-xl font-semibold bg-primary text-primary-foreground disabled:opacity-50"
                  >
                    {createCategory.isPending ? "Đang thêm..." : "Thêm"}
                  </button>
                </div>
              </form>
              
              {categories && categories.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h4 className="text-sm font-semibold mb-3">Danh mục hiện có</h4>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <div key={cat.id} className="flex items-center gap-1 px-3 py-1 rounded-full bg-secondary text-sm">
                        {cat.name}
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="ml-1 text-muted-foreground hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
