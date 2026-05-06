import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAuthHeaders } from "./use-auth";

export type MenuItem = {
  id: number;
  name: string;
  price: number;
  categoryId: number | null;
  description: string | null;
  image: string | null;
  isAvailable: boolean;
  isActive: boolean;
  isSticky: boolean;
  isPriority: boolean;
  isHidden: boolean;
  createdAt: Date | null;
};

export function useMenuItems() {
  return useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const res = await fetch("/api/products", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch menu items");
      return res.json() as Promise<MenuItem[]>;
    },
  });
}

export function useCreateMenuItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { name: string; price: number; description?: string; image?: string | null }) => {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create menu item");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
  });
}

export function useUpdateMenuItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; name?: string; price?: number; description?: string; image?: string | null; isSticky?: boolean; isAvailable?: boolean; isPriority?: boolean; isHidden?: boolean }) => {
      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw Object.assign(new Error(errorData.message || "Failed to update menu item"), { status: res.status });
      }
      
      return res.json();
    },
    onError: (error: any) => {
      if (error?.status === 401) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        window.location.href = "/login";
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
  });
}

export function useDeleteMenuItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE", headers: getAuthHeaders(),
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to delete menu item");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
  });
}
