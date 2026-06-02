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
    <div className="grid grid-cols-3 auto-rows-fr gap-2 p-2 w-full h-full">
      {allTables.map((tableNum, index) => {
        const activeOrder = getActiveOrder(tableNum);
        const status: TableStatus = activeOrder
          ? getActiveStatus(activeOrder)
          : "empty";
        const sc = TABLE_STATUS[status];
        const isSelected = selectedTable === tableNum;
        const isRenaming = renamingTable === tableNum;
        const tableName = tableNames[tableNum] || `Bàn ${tableNum}`;

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
              "relative bg-white rounded-[20px] border p-4 text-left transition-all duration-300 cursor-pointer overflow-hidden group shadow-sm",
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
              "absolute top-4 right-4 w-2 h-2 rounded-full",
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
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    {/* Icon container */}
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-105",
                      status === "empty" ? "bg-gray-100 text-gray-400" : status === "cooking" ? "bg-orange-50 text-orange-500" : "bg-emerald-50 text-emerald-500"
                    )}>
                      {status === "cooking" && <ChefHat className="w-4 h-4 text-orange-600" />}
                      {status === "ready" && <UtensilsCrossed className="w-4 h-4 text-emerald-600" />}
                      {status === "empty" && <Clock className="w-4 h-4 text-gray-400" />}
                    </div>
                    <div>
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none">Bàn</p>
                      <h3 className="text-sm font-extrabold text-gray-800 mt-1 leading-none">
                        {tableNames[tableNum] || `${tableNum}`}
                      </h3>
                    </div>
                  </div>

                  {/* Edit button - hidden on mobile */}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => onStartRename(tableNum, e)}
                    className="hidden md:block p-1.5 rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity mr-4"
                  >
                    <Pencil className="w-3.5 h-3.5 text-gray-400 hover:text-orange-500" />
                  </motion.button>
                </div>

                {/* Content */}
                {activeOrder ? (
                  <div className="mt-3 space-y-1">
                    <div className="flex items-baseline justify-between">
                      <span className={cn("text-base font-black tracking-tight", status === "cooking" ? "text-orange-600" : "text-emerald-600")}>
                        {formatCurrency(activeOrder.totalAmount)}
                      </span>
                      {activeOrder.items && (
                        <span className="text-[10px] font-bold text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-lg">
                          {activeOrder.items.reduce((sum: number, item: any) => sum + item.quantity, 0)} món
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border border-gray-100/50 px-2 py-1 rounded-lg">
                      Sẵn sàng
                    </span>
                  </div>
                )}

                {/* Arrow indicator */}
                <div className="absolute bottom-3 right-3">
                  <ChevronRight className={cn(
                    "w-3.5 h-3.5 transition-all duration-300",
                    isSelected ? "text-orange-500 translate-x-0.5" : "text-gray-300 group-hover:text-orange-500"
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
