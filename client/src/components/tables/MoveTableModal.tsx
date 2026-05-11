import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { Order } from "@/hooks/use-orders";

interface MoveTableModalProps {
  showMoveModal: boolean;
  selectedTable: number | null;
  maxTables: number;
  orders: Order[];
  onClose: () => void;
  onConfirm: (targetTable: number) => void;
}

export function MoveTableModal({
  showMoveModal,
  selectedTable,
  maxTables,
  orders,
  onClose,
  onConfirm,
}: MoveTableModalProps) {
  const [moveTargetTable, setMoveTargetTable] = useState<number | null>(null);
  const allTables = Array.from({ length: maxTables }, (_, i) => i + 1);

  const getActiveOrder = (tableNum: number) => {
    return orders?.find(o => o.tableNumber === tableNum.toString() && o.status !== "Complete");
  };

  return (
    <AnimatePresence>
      {showMoveModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-card w-full max-w-sm rounded-3xl p-6 shadow-2xl border-2 border-blue-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-blue-500">ĐỔI BÀN</h3>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">Chọn bàn muốn chuyển đến:</p>

            <div className="grid grid-cols-4 gap-2 mb-6">
              {allTables.map(num => {
                const hasOrder = !!getActiveOrder(num);
                return (
                  <button
                    key={num}
                    onClick={() => setMoveTargetTable(num)}
                    disabled={hasOrder || num === selectedTable}
                    className={`
                      p-3 rounded-xl border-2 font-bold transition-colors
                      ${moveTargetTable === num
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : hasOrder || num === selectedTable
                        ? "border-red-300 bg-red-50 text-red-400 cursor-not-allowed"
                        : "border-border hover:border-blue-300"
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl font-bold bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => moveTargetTable && onConfirm(moveTargetTable)}
                disabled={!moveTargetTable}
                className="flex-1 px-4 py-3 rounded-xl font-bold bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                Xác nhận
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
