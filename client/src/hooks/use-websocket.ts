import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

export type WSEventType = 
  | "ORDER_CREATED"
  | "ORDER_UPDATED"
  | "ORDER_DELETED"
  | "KITCHEN_ORDER_CREATED"
  | "KITCHEN_ORDER_UPDATED"
  | "KITCHEN_ORDER_DELETED";

export interface WSEvent {
  type: WSEventType;
  data: any;
}

export function useWebSocket(onNewOrder?: () => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log("WebSocket connected");
      reconnectAttempts.current = 0;
    };

    wsRef.current.onmessage = (event) => {
      try {
        const wsEvent: WSEvent = JSON.parse(event.data);
        
        switch (wsEvent.type) {
          case "ORDER_CREATED":
            queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
            onNewOrder?.();
            break;
          case "ORDER_UPDATED":
          case "ORDER_DELETED":
            queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
            break;
          case "KITCHEN_ORDER_CREATED":
            queryClient.invalidateQueries({ queryKey: ["/api/kitchen"] });
            onNewOrder?.();
            break;
          case "KITCHEN_ORDER_UPDATED":
          case "KITCHEN_ORDER_DELETED":
            queryClient.invalidateQueries({ queryKey: ["/api/kitchen"] });
            break;
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    wsRef.current.onclose = () => {
      console.log("WebSocket disconnected, reconnecting...");
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      reconnectAttempts.current++;
      reconnectTimeoutRef.current = setTimeout(connect, delay);
    };

    wsRef.current.onerror = (err) => {
      console.error("WebSocket error:", err);
    };
  }, [queryClient, onNewOrder]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return wsRef.current;
}
