import { useState, useEffect } from "react";
import { useOrders, useCreateOrder, useUpdateOrder, usePayOrder, usePaymentSettings, useSendToKitchen, type Order, type OrderItem } from "@/hooks/use-orders";
import { useMenuItems } from "@/hooks/use-menu";
import { useTableNames } from "@/hooks/use-table-names";
import { Loader2 } from "lucide-react";

import { TableGrid } from "@/components/tables/TableGrid";
import { TableDetailModal } from "@/components/tables/TableDetailModal";
import { PaymentModal } from "@/components/tables/PaymentModal";
import { MoveTableModal } from "@/components/tables/MoveTableModal";
import { ConfirmDeleteModal } from "@/components/tables/ConfirmDeleteModal";

const MAX_TABLES = 15;

export default function Tables() {
  const { data: orders, isLoading: ordersLoading } = useOrders();
  const { data: menuItems, isLoading: menuLoading } = useMenuItems();
  const { data: paymentSettings } = usePaymentSettings();
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();
  const sendToKitchen = useSendToKitchen();
  const payOrder = usePayOrder();

  const { tableNames, saveTableNames } = useTableNames();

  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"order" | "history">("order");
  const [searchMenu, setSearchMenu] = useState("");
  const [showPayModal, setShowPayModal] = useState<number | null>(null);
  const [payMethod, setPayMethod] = useState("cash");
  const [showMoveModal, setShowMoveModal] = useState<number | null>(null);
  const [renamingTable, setRenamingTable] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<"table" | "item" | null>(null);
  const [deleteItemIndex, setDeleteItemIndex] = useState<number | null>(null);

  const getActiveOrder = (tableNum: number): Order | undefined =>
    orders?.find(o => o.tableNumber === tableNum.toString() && o.status !== "Complete");

  const selectedOrder = selectedTable ? getActiveOrder(selectedTable) : undefined;
  const currentStatus = selectedOrder?.status === "Ready" ? "ready" : "cooking";

  useEffect(() => {
    setActiveTab("order");
  }, [selectedTable]);

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
    console.log("handleRemoveItem called, index:", index);
    setDeleteItemIndex(index);
    setShowDeleteConfirm("item");
  };

  const confirmDeleteItem = () => {
    console.log("confirmDeleteItem called", { selectedOrderId: selectedOrder?.id, deleteItemIndex });
    if (!selectedOrder || deleteItemIndex === null) return;
    const items = [...selectedOrder.items];
    items.splice(deleteItemIndex, 1);
    if (items.length === 0) { 
      confirmDeleteTable(); 
      return; 
    }
    const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
    updateOrder.mutate({ id: selectedOrder.id, items, totalAmount: total });
    setShowDeleteConfirm(null);
    setDeleteItemIndex(null);
  };

  const handleClearTable = async () => {
    if (!selectedOrder) return;
    console.log("handleClearTable called");
    setShowDeleteConfirm("table");
  };

  const confirmDeleteTable = async () => {
    console.log("confirmDeleteTable called", { selectedOrderId: selectedOrder?.id });
    if (!selectedOrder) return;
    await fetch(`/api/orders/${selectedOrder.id}`, { method: "DELETE", credentials: "include" });
    setSelectedTable(null);
    setShowDeleteConfirm(null);
  };

  const handlePay = (orderId: number) => {
    payOrder.mutate({ orderId, method: payMethod }, {
      onSuccess: () => {
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableNumber: targetTable.toString() }),
      credentials: "include",
    }).then(() => {
      setShowMoveModal(null);
      setSelectedTable(null);
    });
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
          selectedTable={selectedTable}
          tableNames={tableNames}
          activeOrder={selectedOrder}
          currentStatus={currentStatus}
          activeTab={activeTab}
          menuItems={menuItems || []}
          searchMenu={searchMenu}
          setSearchMenu={setSearchMenu}
          onClose={() => setSelectedTable(null)}
          onTabChange={setActiveTab}
          onAddItem={handleAddItem}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onClearTable={handleClearTable}
          onShowPayModal={() => selectedOrder && setShowPayModal(selectedOrder.id)}
          onShowMoveModal={() => selectedOrder && setShowMoveModal(selectedOrder.id)}
        showDeleteConfirm={showDeleteConfirm}
        deleteItemIndex={deleteItemIndex}
        onDeleteCancel={() => {
          setShowDeleteConfirm(null);
          setDeleteItemIndex(null);
        }}
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
    </div>
  );
}
