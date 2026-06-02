export const TABLE_STATUS = {
  empty: {
    bg: "bg-gray-50",
    text: "text-gray-400",
    shadow: "shadow-sm shadow-gray-100",
    border: "border-gray-200",
    label: "TRỐNG",
  },
  cooking: {
    bg: "bg-orange-50",
    text: "text-orange-600",
    shadow: "shadow-sm shadow-orange-100/50",
    border: "border-orange-500",
    label: "CHỜ",
  },
  ready: {
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    shadow: "shadow-sm shadow-emerald-100/50",
    border: "border-emerald-500",
    label: "S.S",
  },
} as const;

export type TableStatus = keyof typeof TABLE_STATUS;
