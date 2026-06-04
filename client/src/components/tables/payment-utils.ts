import type { Order } from "@/hooks/use-orders";

export function getDefaultMethods() {
  return [
    { id: "cash",     label: "Tiền mặt",     icon: "💵" },
    { id: "transfer", label: "Chuyển khoản", icon: "🏦" },
    { id: "vnpay",    label: "VNPay",         icon: "💳" },
    { id: "momo",     label: "MoMo",          icon: "📱" },
  ];
}

export function getMethodConfig(methodId: string, paymentSettings?: any[]) {
  const defaults = getDefaultMethods().find(m => m.id === methodId);
  const custom = paymentSettings?.find((p: any) => p.method === methodId);
  return {
    label: custom?.label || defaults?.label || methodId,
    icon: custom?.icon || defaults?.icon || "💳",
    qrImageUrl: custom?.qrImageUrl || null,
    accountName: custom?.accountName || null,
    accountNumber: custom?.accountNumber || null,
    bankName: custom?.bankName || null,
    additionalInfo: custom?.additionalInfo || null,
    isEnabled: custom?.isEnabled ?? true,
  };
}
