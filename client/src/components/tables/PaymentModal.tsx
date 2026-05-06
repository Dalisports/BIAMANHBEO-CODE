import { motion, AnimatePresence } from "framer-motion";
import { X, CreditCard } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getDefaultMethods, getMethodConfig } from "./payment-utils";
import type { Order } from "@/hooks/use-orders";

interface PaymentModalProps {
  showPayModal: boolean;
  selectedTable: number | null;
  tableNames: Record<number, string>;
  orderTotal: number;
  paymentSettings?: any[];
  payMethod: string;
  setPayMethod: (method: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function PaymentModal({
  showPayModal,
  selectedTable,
  tableNames,
  orderTotal,
  paymentSettings,
  payMethod,
  setPayMethod,
  onClose,
  onConfirm,
  isPending,
}: PaymentModalProps) {
  const tableName = selectedTable ? tableNames[selectedTable] || `Bàn ${selectedTable}` : "";

  return (
    <AnimatePresence>
      {showPayModal && (
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
            className="bg-card w-full max-w-sm rounded-3xl p-6 shadow-2xl border-2 border-green-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-green-500">THANH TOÁN</h3>
              <button
                data-testid="close-pay-modal"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-4 bg-green-50 rounded-xl border-2 border-green-200">
              <p className="text-sm text-muted-foreground">{tableName}</p>
              <p className="text-2xl font-black text-green-600">
                {formatCurrency(orderTotal)}
              </p>
            </div>

            <h4 className="text-sm font-bold mb-3">Chọn phương thức:</h4>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {getDefaultMethods()
                .filter(m => getMethodConfig(m.id).isEnabled)
                .map(method => {
                  const config = getMethodConfig(method.id);
                  return (
                    <button
                      key={method.id}
                      data-testid={`pay-method-${method.id}`}
                      onClick={() => setPayMethod(method.id)}
                      className={`
                        p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-colors
                        ${payMethod === method.id
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-border hover:border-green-300"
                      }`}
                    >
                      <span className="text-xl">{config.icon}</span>
                      <span className="text-sm font-bold">{config.label}</span>
                    </button>
                  );
                })}
            </div>

            {payMethod !== "cash" && (() => {
              const config = getMethodConfig(payMethod, paymentSettings);
              return (
                <div className="mb-4 p-4 bg-secondary/50 rounded-xl">
                  {config.qrImageUrl ? (
                    <div className="text-center">
                      <p className="text-sm font-semibold mb-3 text-muted-foreground">Quét mã QR</p>
                      <img src={config.qrImageUrl} alt="QR Code" className="max-h-32 mx-auto rounded-lg" />
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground text-sm">
                      <p>Chưa cài đặt mã QR cho phương thức này.</p>
                    </div>
                  )}
                  {config.accountName && (
                    <div className="mt-3 text-sm space-y-1 text-center">
                      <p className="font-semibold">{config.accountName}</p>
                      {config.accountNumber && (
                        <p>Số TK: <span className="font-mono font-bold">{config.accountNumber}</span></p>
                      )}
                      {config.bankName && <p className="text-muted-foreground">{config.bankName}</p>}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="flex gap-3">
              <button
                data-testid="cancel-pay"
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl font-bold bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
              >
                Hủy
              </button>
              <button
                data-testid="confirm-pay"
                onClick={onConfirm}
                disabled={isPending}
                className="flex-1 px-4 py-3 rounded-xl font-bold bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {isPending ? "Đang xử lý..." : "Xác nhận thanh toán"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
