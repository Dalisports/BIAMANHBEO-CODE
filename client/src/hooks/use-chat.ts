import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { getAuthHeaders } from "./use-auth";

type HistoryMessage = { role: "user" | "assistant"; content: string };

export function useProcessChat() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ message, history }: { message: string; history?: HistoryMessage[] }) => {
      const res = await fetch(api.chat.process.path, {
        method: api.chat.process.method,
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ message, history }),
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to process chat");
      return api.chat.process.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      if (data.action) {
        if (data.action.includes("PRODUCT") || data.action.includes("MENU_ITEM") || data.action.includes("CATEGORY")) {
          queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
          queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
        }
        if (data.action.includes("ORDER")) {
          queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
        }
      }
    }
  });
}
