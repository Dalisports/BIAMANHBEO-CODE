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
    <div className="grid grid-cols-3 gap-3 p-3">
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
              "relative bg-card rounded-2xl border-2 p-3 text-left transition-all duration-300 cursor-pointer overflow-hidden group",
              isSelected 
                ? "border-primary shadow-xl shadow-primary/20 ring-4 ring-primary/10" 
                : "border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
            )}
          >
            {/* Status indicator strip */}
            <div className={cn(
              "absolute top-0 left-0 right-0 h-1",
              sc.bg
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
                  className="w-full text-center text-xs rounded-xl border-2 border-primary px-2 py-1.5 bg-background outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Tên bàn..."
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onCommitRename(tableNum)}
                  className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  Lưu
                </motion.button>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {/* Smaller icon container */}
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center shadow-md transition-transform group-hover:scale-110",
                      sc.bg,
                      sc.shadow
                    )}>
                      {status === "cooking" && <ChefHat className={cn("w-4 h-4", sc.text)} />}
                      {status === "ready" && <UtensilsCrossed className={cn("w-4 h-4", sc.text)} />}
                      {status === "empty" && <Clock className={cn("w-4 h-4", sc.text)} />}
                    </div>
                    <div>
                      {/* Smaller table name */}
                      <p className="font-bold text-foreground text-sm leading-tight">{tableName}</p>
                      <p className="text-[10px] text-muted-foreground">#{tableNum}</p>
                    </div>
                  </div>
                  
                  {/* Edit button */}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => onStartRename(tableNum, e)}
                    className="p-1 rounded-md hover:bg-secondary opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Pencil className="w-3 h-3 text-muted-foreground" />
                  </motion.button>
                </div>

                {/* Content */}
                {activeOrder ? (
                  <div className="space-y-1">
                    {/* Smaller amount */}
                    <div className="flex items-baseline gap-1">
                      <span className={cn("text-lg font-black", sc.text)}>
                        {formatCurrency(activeOrder.totalAmount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Smaller status badge */}
                      <span className={cn(
                        "text-[9px] font-bold uppercase tracking-wide px-1 py-0.5 rounded-full",
                        sc.bg,
                        sc.text
                      )}>
                        {sc.label}
                      </span>
                      {activeOrder.items && (
                        <span className="text-[10px] text-muted-foreground">
                          {activeOrder.items.reduce((sum: number, item: any) => sum + item.quantity, 0)} món
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className={cn(
                      "text-[9px] font-bold uppercase tracking-wide px-1 py-0.5 rounded-full",
                      sc.bg,
                      sc.text
                    )}>
                      {sc.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Sẵn sàng đặt món</span>
                  </div>
                )}

                {/* Arrow indicator */}
                <div className="absolute bottom-3 right-3">
                  <ChevronRight className={cn(
                    "w-4 h-4 transition-all duration-300",
                    isSelected ? "text-primary translate-x-1" : "text-muted-foreground group-hover:text-primary"
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
