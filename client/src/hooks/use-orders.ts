import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type OrderItem = {
  menuItemId?: number;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
};

export type Order = {
  id: number;
  tableNumber: string;
  customerName: string | null;
  phone: string | null;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  items: OrderItem[];
  notes: string | null;
  createdAt: Date | null;
  completedAt: Date | null;
  paidAt: Date | null;
};

export type KitchenOrder = {
  id: number;
  orderId: number;
  tableNumber: string;
  items: OrderItem[];
  status: string;
  priority: string;
  sentAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  notes: string | null;
};

export function useOrders() {
  return useQuery({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      const res = await fetch("/api/orders", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json() as Promise<Order[]>;
    },
  });
}

export function useOrder(id: number) {
  return useQuery({
    queryKey: ["/api/orders", id],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${id}`, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch order");
      return res.json() as Promise<Order>;
    },
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { tableNumber: string; items: OrderItem[]; totalAmount: number; customerName?: string; phone?: string; notes?: string }) => {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          status: "Pending",
          paymentStatus: "Unpaid",
        }),
        credentials: "include",
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create order");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<Order>) => {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to update order");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/orders/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to delete order");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
  });
}

export function useSendToKitchen() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (orderId: number) => {
      const res = await fetch(`/api/orders/${orderId}/send-to-kitchen`, {
        method: "POST",
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to send to kitchen");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen"] });
    },
  });
}

export function usePayOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ orderId, method }: { orderId: number; method: string }) => {
      const res = await fetch(`/api/orders/${orderId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method }),
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to pay order");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
  });
}

export function useKitchenOrders() {
  return useQuery({
    queryKey: ["/api/kitchen"],
    queryFn: async () => {
      const res = await fetch("/api/kitchen", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch kitchen orders");
      return res.json() as Promise<KitchenOrder[]>;
    },
  });
}

export function useStartKitchenOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/kitchen/${id}/start`, {
        method: "POST",
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to start kitchen order");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
  });
}

export function useCompleteKitchenOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/kitchen/${id}/complete`, {
        method: "POST",
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to complete kitchen order");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
  });
}

export function useDailyReport() {
  return useQuery({
    queryKey: ["/api/reports/daily"],
    queryFn: async () => {
      const res = await fetch("/api/reports/daily", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch daily report");
      return res.json();
    },
  });
}

export function useBestSellers() {
  return useQuery({
    queryKey: ["/api/reports/best-sellers"],
    queryFn: async () => {
      const res = await fetch("/api/reports/best-sellers", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch best sellers");
      return res.json() as Promise<{ name: string; totalQuantity: number }[]>;
    },
  });
}

export type PaymentSetting = {
  id: number;
  method: string;
  label: string | null;
  icon: string | null;
  qrImageUrl: string | null;
  accountName: string | null;
  accountNumber: string | null;
  bankName: string | null;
  additionalInfo: string | null;
  isEnabled: boolean | null;
};

export function usePaymentSettings() {
  return useQuery({
    queryKey: ["/api/payment-settings"],
    queryFn: async () => {
      const res = await fetch("/api/payment-settings", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch payment settings");
      return res.json() as Promise<PaymentSetting[]>;
    },
  });
}

export function useUpdatePaymentSetting() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ method, ...data }: { method: string } & Partial<PaymentSetting>) => {
      const res = await fetch(`/api/payment-settings/${method}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to update payment setting");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-settings"] });
    },
  });
}
