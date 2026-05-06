import { motion } from "framer-motion";
import { cn, formatCurrency } from "@/lib/utils";
import { TABLE_STATUS, type TableStatus } from "./table-types";
import { Pencil, ChevronRight } from "lucide-react";

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
    <div className="grid grid-cols-3 gap-3 overflow-y-auto">
      {allTables.map(tableNum => {
        const activeOrder = getActiveOrder(tableNum);
        const status: TableStatus = activeOrder
          ? getActiveStatus(activeOrder)
          : "empty";
        const sc = TABLE_STATUS[status];
        const isSelected = selectedTable === tableNum;
        const isRenaming = renamingTable === tableNum;

        return (
          <motion.div
            key={tableNum}
            data-testid={`table-card-${tableNum}`}
            role="button"
            tabIndex={0}
            onClick={() => !isRenaming && onSelectTable(tableNum)}
            onKeyDown={e => {
              if (e.key === "Enter" && !isRenaming) onSelectTable(tableNum);
            }}
            className={cn(
              "bg-card rounded-2xl border border-border p-4 text-left hover:border-amber-400 hover:shadow-md transition-all group",
              isSelected && "ring-2 ring-amber-500 ring-offset-2"
            )}
          >
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
                  className="w-full text-center text-sm rounded-lg border-2 border-amber-400 px-2 py-1 bg-white outline-none"
                />
                <button
                  onClick={() => onCommitRename(tableNum)}
                  className="px-3 py-1 rounded-lg bg-amber-500 text-black text-xs font-bold"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", sc.bg)}>
                    <span className={cn("text-base font-bold", sc.text)}>{tableNum}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => onStartRename(tableNum, e)}
                      className="p-1 rounded hover:bg-secondary"
                    >
                      <Pencil className="w-3 h-3 text-muted-foreground" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                  </div>
                </div>

                {activeOrder ? (
                  <>
                    <p className={cn("text-lg font-black", sc.text)}>
                      {formatCurrency(activeOrder.totalAmount)}
                    </p>
                    <p className={cn("text-xs font-bold", sc.text)}>
                      {status === "ready" ? "Chưa thanh toán" : status === "cooking" ? "Đang phục vụ" : ""}
                    </p>
                  </>
                ) : (
                  <span className="text-xs font-bold text-black/50">Trống</span>
                )}
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
