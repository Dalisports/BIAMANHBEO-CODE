import { motion } from "framer-motion";
import { useDailyReport, useBestSellers, useOrders } from "@/hooks/use-orders";
import { formatCurrency, cn } from "@/lib/utils";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  Clock,
  Trophy,
  Loader2,
} from "lucide-react";

export default function Reports() {
  const { data: report, isLoading: loadingReport } = useDailyReport();
  const { data: bestSellers, isLoading: loadingBestSellers } = useBestSellers();
  const { data: orders } = useOrders();

  const totalRevenue =
    orders
      ?.filter((o) => o.paymentStatus === "Paid")
      .reduce((acc, o) => acc + o.totalAmount, 0) || 0;

  const totalOrders = orders?.length || 0;
  const paidOrders =
    orders?.filter((o) => o.paymentStatus === "Paid").length || 0;

  return (
    <div className="h-full">
      <div className="mb-6">
        <h2 className="text-3xl font-sans font-bold text-foreground">
          Báo Cáo
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Thống kê doanh thu và món bán chạy
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-green-400 to-green-600 rounded-2xl p-5 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <DollarSign className="w-8 h-8 opacity-80" />
            <TrendingUp className="w-5 h-5 opacity-60" />
          </div>
          <p className="text-sm opacity-80">Doanh thu hôm nay</p>
          <p className="text-2xl font-bold mt-1">
            {formatCurrency(report?.todayRevenue || 0)}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl p-5 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <ShoppingBag className="w-8 h-8 opacity-80" />
            <span className="text-sm opacity-60">Đơn</span>
          </div>
          <p className="text-sm opacity-80">Đơn đã thanh toán</p>
          <p className="text-2xl font-bold mt-1">
            {report?.completedOrders || 0}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl p-5 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <Clock className="w-8 h-8 opacity-80" />
            <span className="text-sm opacity-60">Bếp</span>
          </div>
          <p className="text-sm opacity-80">Đang xử lý</p>
          <p className="text-2xl font-bold mt-1">
            {report?.pendingOrders || 0}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl p-5 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <Users className="w-8 h-8 opacity-80" />
            <span className="text-sm opacity-60">Tổng</span>
          </div>
          <p className="text-sm opacity-80">Tổng đơn hàng</p>
          <p className="text-2xl font-bold mt-1">{totalOrders}</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-3xl border border-border p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Món Bán Chạy</h3>
              <p className="text-sm text-muted-foreground">
                Top món được đặt nhiều nhất
              </p>
            </div>
          </div>

          {loadingBestSellers ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : !bestSellers?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              Chưa có dữ liệu món bán chạy
            </div>
          ) : (
            <div className="space-y-3">
              {bestSellers.map((item, index) => (
                <div
                  key={item.name}
                  className="flex items-center gap-4 p-3 rounded-xl bg-background/50 hover:bg-background transition-colors"
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                      index === 0
                        ? "bg-yellow-100 text-yellow-700"
                        : index === 1
                          ? "bg-gray-100 text-gray-700"
                          : index === 2
                            ? "bg-orange-100 text-orange-700"
                            : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{item.name}</p>
                    <div className="mt-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          index === 0
                            ? "bg-yellow-500"
                            : index === 1
                              ? "bg-gray-500"
                              : index === 2
                                ? "bg-orange-500"
                                : "bg-primary",
                        )}
                        style={{
                          width: `${(item.totalQuantity / (bestSellers[0]?.totalQuantity || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{item.totalQuantity}</p>
                    <p className="text-xs text-muted-foreground">đã bán</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card rounded-3xl border border-border p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Tổng Quan</h3>
              <p className="text-sm text-muted-foreground">Thống kê nhanh</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 rounded-xl bg-green-50 border border-green-200">
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="font-medium">Tổng doanh thu</span>
              </div>
              <span className="text-xl font-bold text-green-600">
                {formatCurrency(totalRevenue)}
              </span>
            </div>

            <div className="flex justify-between items-center p-4 rounded-xl bg-blue-50 border border-blue-200">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-blue-600" />
                <span className="font-medium">Đơn đã thanh toán</span>
              </div>
              <span className="text-xl font-bold text-blue-600">
                {paidOrders} / {totalOrders}
              </span>
            </div>

            <div className="flex justify-between items-center p-4 rounded-xl bg-orange-50 border border-orange-200">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-orange-600" />
                <span className="font-medium">Đơn đang xử lý</span>
              </div>
              <span className="text-xl font-bold text-orange-600">
                {report?.pendingOrders || 0}
              </span>
            </div>

            <div className="flex justify-between items-center p-4 rounded-xl bg-purple-50 border border-purple-200">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-purple-600" />
                <span className="font-medium">Đơn chưa thanh toán</span>
              </div>
              <span className="text-xl font-bold text-purple-600">
                {totalOrders - paidOrders}
              </span>
            </div>

            {totalOrders > 0 && (
              <div className="pt-4 border-t border-border">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    Tỷ lệ thanh toán
                  </span>
                  <span className="font-bold text-accent">
                    {((paidOrders / totalOrders) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="mt-2 h-3 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${(paidOrders / totalOrders) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
