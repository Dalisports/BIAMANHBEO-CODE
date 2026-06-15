import { motion } from "framer-motion";
import { cn, formatCurrency } from "@/lib/utils";
import { TABLE_STATUS, type TableStatus } from "./table-types";
import { ChevronRight, Check, ChefHat, Clock, UtensilsCrossed, Pencil } from "lucide-react";

interface TableGridProps {
  maxTables: number;
  tableNames: Record<number, string>;
  getActiveOrder: (tableNum: number) => any;
  selectedTable: number | null;
  renamingTable: number | null;
  renameValue: string;
  setRenameValue: (val: string) => void;
  onSelectTable: (tableNum: number) => void;
  onStartRename: (num: number, e: React.MouseEvent) => void;
  onCommitRename: (num: number) => void;
}

const formatStatsPrice = (price: number | string) => {
  const numPrice = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(numPrice)) return price;
  if (numPrice === 0) return "0k";
  if (numPrice >= 1000) {
    return `${numPrice / 1000}k`;
  }
  return `${numPrice}`;
};

export function TableGrid({
  maxTables,
  tableNames,
  getActiveOrder,
  selectedTable,
  renamingTable,
  renameValue,
  setRenameValue,
  onSelectTable,
  onStartRename,
  onCommitRename,
}: TableGridProps) {
  const allTables = Array.from({ length: maxTables }, (_, i) => i + 1);

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 auto-rows-fr gap-2 p-2 w-full h-full">
      {allTables.map((tableNum, index) => {
        const activeOrder = getActiveOrder(tableNum);
        const status: TableStatus = activeOrder
          ? getActiveStatus(activeOrder)
          : "empty";
        const isSelected = selectedTable === tableNum;
        const isRenaming = renamingTable === tableNum;
        const tableName = tableNames[tableNum] || `${tableNum}`;

        // Get items that have been ordered but not yet cooked/done
        const pendingItems = activeOrder?.items?.filter((item: any) => {
          return item.cookingStatus !== "done";
        }) || [];

        return (
          <motion.div
            key={tableNum}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            data-testid={`table-card-${tableNum}`}
            role="button"
            tabIndex={0}
            onClick={() => !isRenaming && onSelectTable(tableNum)}
            onKeyDown={e => {
              if (e.key === "Enter" && !isRenaming) onSelectTable(tableNum);
            }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "relative bg-white rounded-[16px] sm:rounded-[20px] border p-2.5 sm:p-3 text-left transition-all duration-300 cursor-pointer overflow-hidden group shadow-sm flex flex-col min-h-[115px] justify-between",
              isSelected
                ? status === "empty" 
                  ? "border-orange-400 ring-4 ring-orange-500/10 shadow-lg"
                  : status === "cooking"
                    ? "border-orange-500 ring-4 ring-orange-500/10 shadow-lg"
                    : "border-emerald-500 ring-4 ring-emerald-500/10 shadow-lg"
                : status === "empty"
                  ? "border-gray-100 hover:border-orange-300 hover:shadow-md"
                  : status === "cooking"
                    ? "border-orange-200 hover:border-orange-400 hover:shadow-md"
                    : "border-emerald-200 hover:border-emerald-400 hover:shadow-md"
            )}
          >
            {/* Status dot indicator */}
            <span className={cn(
              "absolute top-3 right-3 w-1.5 h-1.5 rounded-full",
              status === "empty" ? "bg-gray-300" : status === "cooking" ? "bg-orange-500 animate-pulse" : "bg-emerald-500 animate-pulse"
            )} />

            {isRenaming ? (
              <div className="flex flex-col items-center gap-2 py-2" onClick={e => e.stopPropagation()}>
                <input
                  autoFocus
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") onCommitRename(tableNum);
                    if (e.key === "Escape") onStartRename(-1, e as any);
                  }}
                  className="w-full text-center text-xs rounded-xl border border-orange-300 px-2 py-2 bg-white outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 font-bold text-gray-800"
                  placeholder="Tên bàn..."
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onCommitRename(tableNum)}
                  className="w-full py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-extrabold flex items-center justify-center gap-1 shadow-sm"
                >
                  <Check className="w-3 h-3" />
                  Lưu tên
                </motion.button>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center gap-2">
                  {/* Icon container */}
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center shadow-sm transition-transform group-hover:scale-105 flex-shrink-0",
                    status === "empty" ? "bg-gray-100 text-gray-400" : status === "cooking" ? "bg-orange-50 text-orange-500" : "bg-emerald-50 text-emerald-500"
                  )}>
                    {status === "cooking" && <ChefHat className="w-3.5 h-3.5 text-orange-600" />}
                    {status === "ready" && <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-600" />}
                    {status === "empty" && <Clock className="w-3.5 h-3.5 text-gray-400" />}
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-gray-800 leading-none">
                      {tableName}
                    </h3>
                  </div>
                </div>

                {/* Pending items in the middle */}
                <div className="my-2 flex-1 flex flex-col justify-center min-h-[32px]">
                  {pendingItems.length > 0 ? (
                    <div className="space-y-0.5">
                      {pendingItems.slice(0, 2).map((item: any, idx: number) => (
                        <p key={idx} className="text-[9px] text-gray-500 font-bold truncate leading-tight">
                          • {item.name} {item.quantity > 1 ? `x${item.quantity}` : ""}
                        </p>
                      ))}
                      {pendingItems.length > 2 && (
                        <p className="text-[8px] text-gray-400 font-extrabold leading-none italic pl-2">
                          + {pendingItems.length - 2} món...
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>

                {/* Bottom Row */}
                <div className="flex items-center justify-between w-full mt-auto pt-1.5 border-t border-gray-50">
                  <div className="flex items-center gap-1.5">
                    {activeOrder ? (
                      <>
                        <span className="text-[11px] sm:text-xs font-black text-[#e2990f] tracking-tight">
                          {formatStatsPrice(activeOrder.totalAmount)}
                        </span>
                        {activeOrder.items && (
                          <span className="text-[8px] font-bold text-gray-400 bg-gray-50 border border-gray-100 px-1 py-0.5 rounded-md">
                            {activeOrder.items.reduce((sum: number, item: any) => sum + item.quantity, 0)} món
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border border-gray-100/50 px-1 py-0.5 rounded-md">
                        Sẵn sàng
                      </span>
                    )}
                  </div>

                  <ChevronRight className={cn(
                    "w-3.5 h-3.5 transition-all duration-300 flex-shrink-0 text-gray-300 group-hover:text-orange-500",
                    isSelected && "text-orange-500 translate-x-0.5"
                  )} />
                </div>
              </>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

function getActiveStatus(order: any): "cooking" | "ready" {
  if (order.status === "Ready") return "ready";
  return "cooking";
}
