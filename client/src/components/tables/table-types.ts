export const TABLE_STATUS = {
  empty:   { label: "Trống",           bg: "bg-black/50",       border: "border-black/50",    text: "text-black/50",    strip: "bg-black/50"    },
  cooking: { label: "Đang phục vụ",    bg: "bg-amber-100",    border: "border-amber-400",   text: "text-amber-600",   strip: "bg-amber-500"   },
  ready:   { label: "Chưa thanh toán",  bg: "bg-green-100",     border: "border-green-400",   text: "text-green-600",   strip: "bg-green-500"   },
} as const;

export type TableStatus = keyof typeof TABLE_STATUS;
