import { useState } from "react";
import { motion } from "framer-motion";
import { useProducts, useCreateProduct } from "@/hooks/use-products";
import { formatCurrency } from "@/lib/utils";
import { Plus, Package, Loader2 } from "lucide-react";

export default function Products() {
  const { data: products, isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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

  return (
    <div className="h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">Sản phẩm</h2>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product, i) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              key={product.id}
              className="bg-card rounded-2xl p-6 border border-border hover:shadow-xl hover:border-primary/20 transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform duration-300">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-1">{product.name}</h3>
              <p className="text-accent font-semibold text-lg">{formatCurrency(product.price)}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Manual Create Modal (Fallback for non-voice usage) */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card w-full max-w-md rounded-3xl p-6 shadow-2xl border border-border"
          >
            <h3 className="text-2xl font-display font-bold mb-6">Thêm Mặt Hàng Mới</h3>
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
