import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Receipt } from "@/components/Receipt";

interface ReceiptModalProps {
  showReceipt: any | null;
  onClose: () => void;
}

export function ReceiptModal({ showReceipt, onClose }: ReceiptModalProps) {
  return (
    <AnimatePresence>
      {showReceipt && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
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
                onClick={onClose}
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
  );
}
