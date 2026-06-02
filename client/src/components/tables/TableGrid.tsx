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
              "relative bg-card rounded-xl border p-2 text-left transition-all duration-300 cursor-pointer overflow-hidden group",
              isSelected
                ? "border-primary shadow-xl shadow-primary/20 ring-2 ring-primary/10"
                : "border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
            )}
          >
            {/* Status indicator strip */}
            <div className={cn(
              "absolute top-0 left-0 right-0 h-0.5",
              sc.bg
            )} />

            {isRenaming ? (
              <div className="flex flex-col items-center gap-1.5 py-1" onClick={e => e.stopPropagation()}>
                <input
                  autoFocus
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") onCommitRename(tableNum);
                    if (e.key === "Escape") onStartRename(-1, e as any);
                  }}
                  className="w-full text-center text-xs rounded-lg border border-primary px-1.5 py-1 bg-background outline-none focus:ring-1 focus:ring-primary/20"
                  placeholder="Tên bàn..."
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onCommitRename(tableNum)}
                  className="px-2 py-1 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold flex items-center gap-1"
                >
                  <Check className="w-2.5 h-2.5" />
                  Lưu
                </motion.button>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    {/* Smaller icon container */}
                    <div className={cn(
                      "w-7 h-7 rounded-md flex items-center justify-center shadow-sm transition-transform group-hover:scale-105",
                      sc.bg,
                      sc.shadow
                    )}>
                      {status === "cooking" && <ChefHat className={cn("w-3 h-3", sc.text)} />}
                      {status === "ready" && <UtensilsCrossed className={cn("w-3 h-3", sc.text)} />}
                      {status === "empty" && <Clock className={cn("w-3 h-3", sc.text)} />}
                    </div>
                    <div>
                      {/* Smaller table name */}

                      <p className={cn("text-sm font-black", sc.text)}>#{tableNum}</p>
                    </div>
                  </div>

                  {/* Edit button - hidden on mobile */}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => onStartRename(tableNum, e)}
                    className="hidden md:block p-1 rounded-md hover:bg-secondary opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Pencil className="w-3 h-3 text-muted-foreground" />
                  </motion.button>
                </div>

                {/* Content */}
                {activeOrder && (
                  <div className="space-y-0.5">
                    {/* Smaller amount */}
                    <div className="flex items-baseline gap-1">
                      <span className={cn("text-base font-black", sc.text)}>
                        {formatCurrency(activeOrder.totalAmount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {activeOrder.items && (
                        <span className="text-[9px] text-muted-foreground">
                          {activeOrder.items.reduce((sum: number, item: any) => sum + item.quantity, 0)} món
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Arrow indicator */}
                <div className="absolute bottom-2 right-2">
                  <ChevronRight className={cn(
                    "w-3 h-3 transition-all duration-300",
                    isSelected ? "text-primary translate-x-0.5" : "text-muted-foreground group-hover:text-primary"
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
