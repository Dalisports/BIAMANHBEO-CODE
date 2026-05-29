export const TABLE_STATUS = {
  empty: {
    bg: "bg-black/50",
    text: "text-black/50",
    shadow: "shadow-lg shadow-black/30",
    border: "border-black/50",
    label: "TRỐNG",
  },
  cooking: {
    bg: "bg-[#f59e0b]",
    text: "text-[#78350f]",
    shadow: "shadow-lg shadow-amber-200",
    border: "border-[#f59e0b]",
    label: "CHỜ",
  },
  ready: {
    bg: "bg-green-100",
    text: "text-green-700",
    shadow: "shadow-lg shadow-green-200",
    border: "border-green-400",
    label: "S.S",
  },
} as const;

export type TableStatus = keyof typeof TABLE_STATUS;
