import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useOrders, useCreateOrder, useUpdateOrder, usePayOrder, usePaymentSettings, useUpdatePaymentSetting, useSendToKitchen, useKitchenOrders, useRemoveKitchenItem, type Order, type OrderItem } from "@/hooks/use-orders";
import { useMenuItems } from "@/hooks/use-menu";
import { useTableNames } from "@/hooks/use-table-names";
import { getAuthHeaders } from "@/hooks/use-auth";
import { Loader2, Settings, X, LayoutGrid, DollarSign, Clock, TrendingUp } from "lucide-react";
import { Receipt } from "@/components/Receipt";

import { cn, formatCurrency } from "@/lib/utils";
import { TableGrid } from "@/components/tables/TableGrid";
import { TableDetailModal } from "@/components/tables/TableDetailModal";
import { PaymentModal } from "@/components/tables/PaymentModal";
import { MoveTableModal } from "@/components/tables/MoveTableModal";
import { ConfirmDeleteModal } from "@/components/tables/ConfirmDeleteModal";

const MAX_TABLES = 15;

export default function Tables() {
  const queryClient = useQueryClient();
  const { data: orders, isLoading: ordersLoading } = useOrders();
  const { data: menuItems, isLoading: menuLoading } = useMenuItems();
  const { data: paymentSettings } = usePaymentSettings();
  const { data: kitchenOrders } = useKitchenOrders();
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();
  const sendToKitchen = useSendToKitchen();
  const payOrder = usePayOrder();
  const removeKitchenItem = useRemoveKitchenItem();

  const { tableNames, saveTableNames } = useTableNames();

  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [searchMenu, setSearchMenu] = useState("");
  const [showPayModal, setShowPayModal] = useState<number | null>(null);
  const [payMethod, setPayMethod] = useState("cash");
  const [showMoveModal, setShowMoveModal] = useState<number | null>(null);
  const [renamingTable, setRenamingTable] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<"table" | "item" | null>(null);
  const [deleteItemIndex, setDeleteItemIndex] = useState<number | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingSetting, setEditingSetting] = useState<string | null>(null);
  const [settingForm, setSettingForm] = useState({
    label: "",
    icon: "",
    qrImageUrl: "",
    accountName: "",
    accountNumber: "",
    bankName: "",
    additionalInfo: "",
  });
  const updatePaymentSetting = useUpdatePaymentSetting();
  const [showReceipt, setShowReceipt] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<"order" | "history">("order");

  const getActiveOrder = (tableNum: number): Order | undefined =>
    orders?.find(o => o.tableNumber === tableNum.toString() && o.status !== "Complete");

  const selectedOrder = selectedTable ? getActiveOrder(selectedTable) : undefined;
  const currentStatus = !selectedOrder ? "empty" : selectedOrder.status === "Ready" ? "ready" : "cooking";

  // Stats: tinh trong ngay hom nay
  const todayStr = new Date().toDateString();
  const todayOrders = (orders || []).filter(o => {
    if (!o.createdAt) return false;
    return new Date(o.createdAt).toDateString() === todayStr;
  });
  const paidOrders = todayOrders.filter(o => o.paymentStatus === "Paid");
  const unpaidOrders = todayOrders.filter(o => o.paymentStatus !== "Paid");
  const paidCount = paidOrders.length;
  const paidTotal = paidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const unpaidCount = unpaidOrders.length;
  const unpaidTotal = unpaidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const doneItemNames = useMemo(() => {
    if (!selectedOrder || !kitchenOrders) return new Set<string>();
    const done = new Set<string>();
    const kitchenOrder = kitchenOrders.find(ko => ko.orderId === selectedOrder.id);
    if (kitchenOrder) {
      kitchenOrder.items
        .filter(item => item.cookingStatus === "done")
        .forEach(item => done.add(item.name));
    }
    return done;
  }, [selectedOrder, kitchenOrders]);

  const handleAddItem = (menuItem: any, quantity: number = 1) => {
    if (!selectedTable) return;
    const newItem: OrderItem = { menuItemId: menuItem.id, name: menuItem.name, quantity, price: menuItem.price };

    if (selectedOrder) {
      const items = [...selectedOrder.items];
      const idx = items.findIndex(i => i.menuItemId === menuItem.id);
      if (idx >= 0) items[idx] = { ...items[idx], quantity: items[idx].quantity + quantity };
      else items.push(newItem);
      const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
      updateOrder.mutate({ id: selectedOrder.id, items, totalAmount: total }, {
        onSuccess: () => sendToKitchen.mutate(selectedOrder.id)
      });
    } else {
      createOrder.mutate({
        tableNumber: selectedTable.toString(),
        items: [newItem],
        totalAmount: menuItem.price * quantity
      }, {
        onSuccess: (data) => sendToKitchen.mutate(data.id)
      });
    }
  };

  const handleUpdateQuantity = (index: number, delta: number) => {
    if (!selectedOrder) return;
    const items = [...selectedOrder.items];
    const newQty = items[index].quantity + delta;
    if (newQty <= 0) { handleRemoveItem(index); return; }
    items[index] = { ...items[index], quantity: newQty };
    const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
    updateOrder.mutate({ id: selectedOrder.id, items, totalAmount: total });
  };

  const handleRemoveItem = (index: number) => {
    setDeleteItemIndex(index);
    setShowDeleteConfirm("item");
  };

  const confirmDeleteItem = () => {
    if (!selectedOrder || deleteItemIndex === null) return;
    
    const deletedItem = selectedOrder.items[deleteItemIndex];
    const items = [...selectedOrder.items];
    items.splice(deleteItemIndex, 1);
    
    if (items.length === 0) { 
      confirmDeleteTable(); 
      return; 
    }
    
    const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
    updateOrder.mutate({ id: selectedOrder.id, items, totalAmount: total });
    
    // Also remove from kitchen
    const kitchenOrder = kitchenOrders?.find(ko => ko.orderId === selectedOrder.id);
    if (kitchenOrder && deletedItem) {
      removeKitchenItem.mutate({ 
        kitchenOrderId: kitchenOrder.id, 
        itemName: deletedItem.name, 
        notes: deletedItem.notes 
      });
    }
    
    setShowDeleteConfirm(null);
    setDeleteItemIndex(null);
  };

  const handleClearTable = async () => {
    if (!selectedOrder) return;
    setShowDeleteConfirm("table");
  };

  const confirmDeleteTable = async () => {
    if (!selectedOrder) return;
    await fetch(`/api/orders/${selectedOrder.id}`, {
      method: "DELETE",
      credentials: "include",
      headers: getAuthHeaders(),
    });
    await queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/kitchen"] });
    setSelectedTable(null);
    setShowDeleteConfirm(null);
  };

  const handlePay = (orderId: number) => {
    payOrder.mutate({ orderId, method: payMethod }, {
      onSuccess: (freshOrder) => {
        // Use the fresh order returned from the server directly
        if (freshOrder && freshOrder.id === orderId) {
          setShowReceipt(freshOrder);
        } else {
          // Fallback to cached data if something goes wrong
          const paidOrder = orders?.find(o => o.id === orderId);
          if (paidOrder) setShowReceipt(paidOrder);
        }
        setShowPayModal(null);
        setSelectedTable(null);
      }
    });
  };

  const handleRenameStart = (num: number) => {
    setRenamingTable(num);
    setRenameValue(tableNames[num] || `Bàn ${num}`);
  };

  const handleRenameCommit = (num: number) => {
    const trimmed = renameValue.trim();
    const updated = { ...tableNames };
    if (trimmed && trimmed !== `Bàn ${num}`) updated[num] = trimmed;
    else delete updated[num];
    saveTableNames(updated);
    setRenamingTable(null);
  };

  const handleMoveTable = (targetTable: number) => {
    if (!selectedOrder) return;
    fetch(`/api/orders/${selectedOrder.id}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ tableNumber: targetTable.toString() }),
      credentials: "include",
    }).then(async () => {
      // Refresh orders data
      await queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setShowMoveModal(null);
      // Tự động chọn bàn mới sau khi đổi
      setSelectedTable(targetTable);
    }).catch(err => {
      console.error("Move table failed:", err);
    });
  };

  const getDefaultMethods = () => [
    { id: "cash", label: "Tiền mặt", icon: "💵" },
    { id: "transfer", label: "Chuyển khoản", icon: "🏦" },
    { id: "vnpay", label: "VNPay", icon: "💳" },
    { id: "momo", label: "MoMo", icon: "📱" },
  ];

  const getMethodConfig = (methodId: string) => {
    const defaults = getDefaultMethods().find(m => m.id === methodId);
    const custom = paymentSettings?.find(p => p.method === methodId);
    return {
      id: methodId,
      label: custom?.label || defaults?.label || methodId,
      icon: custom?.icon || defaults?.icon || "💳",
      qrImageUrl: custom?.qrImageUrl || null,
      accountName: custom?.accountName || null,
      accountNumber: custom?.accountNumber || null,
      bankName: custom?.bankName || null,
      additionalInfo: custom?.additionalInfo || null,
      isEnabled: custom?.isEnabled ?? true,
    };
  };

  const openSettings = (method: string) => {
    const config = getMethodConfig(method);
    setSettingForm({
      label: config.label,
      icon: config.icon,
      qrImageUrl: config.qrImageUrl || "",
      accountName: config.accountName || "",
      accountNumber: config.accountNumber || "",
      bankName: config.bankName || "",
      additionalInfo: config.additionalInfo || "",
    });
    setEditingSetting(method);
  };

  const saveSettings = () => {
    if (editingSetting) {
      updatePaymentSetting.mutate({
        method: editingSetting,
        ...settingForm,
      });
      setEditingSetting(null);
    }
  };

  if (ordersLoading || menuLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-2 px-3 py-3 flex-shrink-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-green-400 to-green-600 rounded-2xl p-3 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-1">
            <DollarSign className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-[10px] opacity-80 mb-1 whitespace-nowrap">Đã TT</p>
          <p className="text-base font-bold">{paidCount} bàn</p>
          <p className="text-xs font-bold opacity-90">{formatCurrency(paidTotal)}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl p-3 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-1">
            <Clock className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-[10px] opacity-80 mb-1 whitespace-nowrap">Chưa TT</p>
          <p className="text-base font-bold">{unpaidCount} bàn</p>
          <p className="text-xs font-bold opacity-90">{formatCurrency(unpaidTotal)}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-gray-500 to-gray-700 rounded-2xl p-3 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-1">
            <TrendingUp className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-[10px] opacity-80 mb-1 whitespace-nowrap">Tất Cả</p>
          <p className="text-base font-bold">{paidCount + unpaidCount} bàn</p>
          <p className="text-xs font-bold opacity-90">{formatCurrency(paidTotal + unpaidTotal)}</p>
        </motion.div>
      </div>
      {/* Table grid */}
      <div className="flex-1 overflow-y-auto">
        <TableGrid
          maxTables={MAX_TABLES}
          tableNames={tableNames}
          getActiveOrder={getActiveOrder}
          selectedTable={selectedTable}
          renamingTable={renamingTable}
          renameValue={renameValue}
          setRenameValue={setRenameValue}
          onSelectTable={setSelectedTable}
          onStartRename={(num, e) => { e.stopPropagation(); handleRenameStart(num); }}
          onCommitRename={handleRenameCommit}
        />
      </div>

      {/* Table Detail Modal */}
      {selectedTable && (
        <TableDetailModal
          orders={orders}
          selectedTable={selectedTable}
          tableNames={tableNames}
          activeOrder={selectedOrder}
          currentStatus={currentStatus}
          activeTab={activeTab}
          menuItems={menuItems || []}
          searchMenu={searchMenu}
          setSearchMenu={setSearchMenu}
          onClose={() => { setSelectedTable(null); setActiveTab("order"); }}
          onTabChange={setActiveTab}
          onAddItem={handleAddItem}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onClearTable={handleClearTable}
          onShowPayModal={() => selectedOrder && setShowPayModal(selectedOrder.id)}
          onShowMoveModal={() => selectedOrder && setShowMoveModal(selectedOrder.id)}
          doneItemNames={doneItemNames}
        />
      )}

       {/* Payment Modal */}
       <PaymentModal
         showPayModal={!!showPayModal}
         selectedTable={selectedTable}
         tableNames={tableNames}
         orderTotal={selectedOrder ? selectedOrder.totalAmount : 0}
         paymentSettings={paymentSettings}
         payMethod={payMethod}
         setPayMethod={setPayMethod}
         onClose={() => setShowPayModal(null)}
         onConfirm={() => showPayModal && handlePay(showPayModal)}
         isPending={payOrder.isPending}
         onOpenSettings={() => { setShowPayModal(null); setShowSettingsModal(true); }}
       />

       {/* Move Table Modal */}
       <MoveTableModal
         showMoveModal={!!showMoveModal}
         selectedTable={selectedTable}
         maxTables={MAX_TABLES}
         orders={orders || []}
         onClose={() => setShowMoveModal(null)}
         onConfirm={handleMoveTable}
       />

      {/* Delete Confirmation Modal - cùng cấp với các modal khác */}
      <ConfirmDeleteModal
        isOpen={!!showDeleteConfirm}
        title={showDeleteConfirm === "table" ? "Xóa đơn bàn" : "Xóa món"}
        description={
          showDeleteConfirm === "table"
            ? "Bạn có chắc muốn xóa toàn bộ đơn hàng của bàn này? Hành động này không thể hoàn tác."
            : "Bạn có chắc muốn xóa món này khỏi đơn hàng?"
        }
        onClose={() => {
          setShowDeleteConfirm(null);
          setDeleteItemIndex(null);
        }}
        onConfirm={() => {
          if (showDeleteConfirm === "table") confirmDeleteTable();
          else if (showDeleteConfirm === "item") confirmDeleteItem();
        }}
      />

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettingsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowSettingsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-border max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-blue-500">CÀI ĐẶT THANH TOÁN</h3>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {getDefaultMethods().map((method) => {
                  const config = getMethodConfig(method.id);
                  return (
                    <button
                      key={method.id}
                      onClick={() => openSettings(method.id)}
                      className={`p-4 rounded-xl border-2 transition-all text-left relative ${
                        editingSetting === method.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-border hover:border-blue-300"
                      }`}
                    >
                      <span className="text-2xl">{config.icon}</span>
                      <span className="block font-semibold mt-1">{config.label}</span>
                      {(config.qrImageUrl || config.accountNumber) && (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>

              {editingSetting && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">{getMethodConfig(editingSetting).icon}</span>
                    <h4 className="font-bold">Cài đặt: {getMethodConfig(editingSetting).label}</h4>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Tên hiển thị</label>
                    <input
                      type="text"
                      value={settingForm.label}
                      onChange={(e) => setSettingForm({ ...settingForm, label: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                      placeholder="VD: Chuyển khoản MB Bank"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Icon (emoji)</label>
                    <input
                      type="text"
                      value={settingForm.icon}
                      onChange={(e) => setSettingForm({ ...settingForm, icon: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                      placeholder="VD: 🏦"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">URL Ảnh QR</label>
                    <input
                      type="text"
                      value={settingForm.qrImageUrl}
                      onChange={(e) => setSettingForm({ ...settingForm, qrImageUrl: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                      placeholder="https://..."
                    />
                    {settingForm.qrImageUrl && (
                      <div className="mt-2">
                        <img src={settingForm.qrImageUrl} alt="Preview" className="h-24 rounded-lg border" onError={(e) => e.currentTarget.style.display = 'none'} />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Tên tài khoản</label>
                      <input
                        type="text"
                        value={settingForm.accountName}
                        onChange={(e) => setSettingForm({ ...settingForm, accountName: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                        placeholder="VD: NGUYEN VAN A"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Số tài khoản</label>
                      <input
                        type="text"
                        value={settingForm.accountNumber}
                        onChange={(e) => setSettingForm({ ...settingForm, accountNumber: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                        placeholder="VD: 1234567890"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Tên ngân hàng</label>
                    <input
                      type="text"
                      value={settingForm.bankName}
                      onChange={(e) => setSettingForm({ ...settingForm, bankName: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                      placeholder="VD: MB Bank"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Thông tin thêm</label>
                    <textarea
                      value={settingForm.additionalInfo}
                      onChange={(e) => setSettingForm({ ...settingForm, additionalInfo: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background resize-none h-20"
                      placeholder="VD: Nội dung chuyển khoản: Thanh toan ban..."
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setEditingSetting(null)}
                      className="flex-1 px-4 py-3 rounded-xl font-semibold bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={saveSettings}
                      disabled={updatePaymentSetting.isPending}
                      className="flex-1 px-4 py-3 rounded-xl font-bold bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                      {updatePaymentSetting.isPending ? "Đang lưu..." : "Lưu"}
                    </button>
                  </div>
                </div>
              )}

              {!editingSetting && (
                <p className="text-center text-muted-foreground text-sm">
                  Chọn phương thức thanh toán để cài đặt QR và thông tin tài khoản
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Receipt Modal */}
      <AnimatePresence>
        {showReceipt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowReceipt(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 shadow-2xl border-2 border-amber-200 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-black text-amber-500">HÓA ĐƠN</h3>
                <button
                  onClick={() => setShowReceipt(null)}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <Receipt order={showReceipt} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
