import { useState } from "react";
import { motion } from "framer-motion";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/hooks/use-products";
import { formatCurrency } from "@/lib/utils";
import { Plus, Package, Loader2, Pencil, Trash2, Check, X } from "lucide-react";

export default function Products() {
  const { data: products, isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;
    
    createProduct.mutate(
      { name, price: parseInt(price, 10) },
      {
        onSuccess: () => {
          setIsDialogOpen(false);
          setName("");
          setPrice("");
        }
      }
    );
  };

  const handleEdit = (product: { id: number; name: string; price: number }) => {
    setEditingId(product.id);
    setEditName(product.name);
    setEditPrice(product.price.toString());
  };

  const handleSaveEdit = (id: number) => {
    if (!editName || !editPrice) return;
    updateProduct.mutate(
      { id, name: editName, price: parseInt(editPrice, 10) },
      { onSuccess: () => setEditingId(null) }
    );
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditPrice("");
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa mặt hàng này?")) {
      deleteProduct.mutate(id);
    }
  };

  return (
    <div className="h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-sans font-bold text-foreground">Mặt hàng</h2>
          <p className="text-muted-foreground mt-1 text-sm">Quản lý danh sách mặt hàng của bạn</p>
        </div>
        <button
          onClick={() => setIsDialogOpen(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
        >
          <Plus className="w-5 h-5" />
          <span>Thêm Mặt Hàng</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : !products?.length ? (
        <div className="flex flex-col items-center justify-center py-24 text-center px-4 bg-card rounded-3xl border border-border border-dashed">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground mb-4">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Chưa có sản phẩm nào</h3>
          <p className="text-muted-foreground max-w-sm">Hãy sử dụng trợ lý giọng nói để thêm sản phẩm mới một cách nhanh chóng hoặc bấm nút Thêm bên trên.</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">STT</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Tên mặt hàng</th>
                <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Giá bán</th>
                <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product, i) => (
                <motion.tr
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  key={product.id}
                  className="border-t border-border hover:bg-muted/30 transition-colors group"
                >
                  <td className="px-4 py-3 text-sm font-medium text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-3">
                    {editingId === product.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-primary"
                        placeholder="Tên mặt hàng"
                      />
                    ) : (
                      <span className="font-medium">{product.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingId === product.id ? (
                      <input
                        type="number"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="w-32 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-primary text-right"
                        placeholder="Giá bán"
                      />
                    ) : (
                      <span className="text-accent font-semibold">{formatCurrency(product.price)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingId === product.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={handleCancelEdit}
                          className="p-2 rounded-lg bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors"
                          title="Hủy"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleSaveEdit(product.id)}
                          disabled={updateProduct.isPending}
                          className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                          title="Xác nhận"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Sửa"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Manual Create Modal */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card w-full max-w-md rounded-3xl p-6 shadow-2xl border border-border"
          >
            <h3 className="text-2xl font-sans font-bold mb-6">Thêm Mặt Hàng Mới</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-foreground">Tên mặt hàng</label>
                <input
                  autoFocus
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-background border-2 border-border focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                  placeholder="Ví dụ: Khoai tây lắc"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-foreground">Giá bán (VNĐ)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-background border-2 border-border focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                  placeholder="Ví dụ: 45000"
                  required
                />
              </div>
              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-semibold bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createProduct.isPending}
                  className="flex-1 px-4 py-3 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50"
                >
                  {createProduct.isPending ? "Đang thêm..." : "Thêm mặt hàng"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
