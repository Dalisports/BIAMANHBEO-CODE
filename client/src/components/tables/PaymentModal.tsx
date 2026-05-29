import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
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
  onOpenSettings: () => void;
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
  onOpenSettings,
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
            className="bg-card w-full max-w-md rounded-3xl p-6 shadow-2xl border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold">Chọn phương thức thanh toán</h3>
              <button
                data-testid="close-pay-modal"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-4 bg-primary/5 rounded-xl border border-border">
              <p className="text-sm text-muted-foreground">{tableName}</p>
              <p className="text-2xl font-black text-primary">
                {formatCurrency(orderTotal)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {getDefaultMethods()
                .filter(m => getMethodConfig(m.id, paymentSettings).isEnabled)
                .map(method => {
                  const config = getMethodConfig(method.id, paymentSettings);
                  return (
                    <button
                      key={method.id}
                      data-testid={`pay-method-${method.id}`}
                      onClick={() => setPayMethod(method.id)}
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all text-left relative",
                        payMethod === method.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <span className="text-2xl">{config.icon}</span>
                      <span className="block font-semibold mt-1">{config.label}</span>
                      {config.qrImageUrl && payMethod === method.id && (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full" />
                      )}
                    </button>
                  );
                })}
            </div>

            {payMethod !== "cash" && (() => {
              const config = getMethodConfig(payMethod, paymentSettings);
              return (
                <div className="mb-6 p-4 bg-secondary/50 rounded-xl">
                  {config.qrImageUrl ? (
                    <div className="text-center">
                      <p className="text-sm font-semibold mb-3 text-muted-foreground">Quét mã QR</p>
                      <img
                        src={config.qrImageUrl}
                        alt="QR Code"
                        className="max-h-48 mx-auto rounded-lg"
                      />
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground text-sm">
                      <p>Chưa cài đặt mã QR cho phương thức này.</p>
                      <button
                        onClick={() => { onClose(); onOpenSettings(); }}
                        className="mt-2 text-primary underline text-xs"
                      >
                        Cài đặt ngay
                      </button>
                    </div>
                  )}
                  {config.accountName && (
                    <div className="mt-3 text-sm space-y-1 text-center">
                      <p className="font-semibold">{config.accountName}</p>
                      {config.accountNumber && (
                        <p>Số TK: <span className="font-mono font-bold">{config.accountNumber}</span></p>
                      )}
                      {config.bankName && <p className="text-muted-foreground">{config.bankName}</p>}
                      {config.additionalInfo && <p className="text-muted-foreground">{config.additionalInfo}</p>}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="flex gap-3">
              <button
                data-testid="cancel-pay"
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl font-semibold bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
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