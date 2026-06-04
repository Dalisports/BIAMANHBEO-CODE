import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

export type WSEventType = 
  | "ORDER_CREATED"
  | "ORDER_UPDATED"
  | "ORDER_DELETED"
  | "KITCHEN_ORDER_CREATED"
  | "KITCHEN_ORDER_UPDATED"
  | "KITCHEN_ORDER_DELETED"
  | "PRODUCT_CREATED"
  | "PRODUCT_UPDATED"
  | "PRODUCT_DELETED"
  | "ATTENDANCE_QR_CHANGED";

export interface WSEvent {
  type: WSEventType;
  data: any;
}

export interface UseWebSocketOptions {
  onMessage?: (event: WSEvent) => void;
  onNewOrder?: () => void;
}

export function useWebSocket(optionsOrCallback?: UseWebSocketOptions | (() => void)) {
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  
  // Resolve options
  const options = typeof optionsOrCallback === "function" 
    ? { onNewOrder: optionsOrCallback } 
    : optionsOrCallback;

  const onMessageRef = useRef(options?.onMessage);
  const onNewOrderRef = useRef(options?.onNewOrder);

  // Keep refs in sync without triggering reconnect
  useEffect(() => {
    onMessageRef.current = options?.onMessage;
    onNewOrderRef.current = options?.onNewOrder;
  }, [options?.onMessage, options?.onNewOrder]);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;
    
    console.log(`[WebSocket] Connecting to: ${wsUrl}`);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = (event) => {
      console.log("[WebSocket] Connection established", event);
      reconnectAttempts.current = 0;
      // Subscribe to all relevant rooms for real-time updates
      ws.send(JSON.stringify({ action: "subscribe", rooms: ["orders", "kitchen", "products", "tables", "attendance", "payments", "all"] }));
    };

    ws.onmessage = (event) => {
      try {
        const wsEvent: WSEvent = JSON.parse(event.data);
        
        // Handle server-side ping (application level)
        if ((wsEvent.type as string) === "PING") {
          ws.send(JSON.stringify({ action: "pong", timestamp: Date.now() }));
          return;
        }

        console.log(`[WebSocket] Message received: ${wsEvent.type}`, wsEvent.data);
        
        // Call the general message handler if provided
        if (onMessageRef.current) {
          console.log("[WebSocket] Executing custom onMessage handler");
          onMessageRef.current(wsEvent);
        }

        switch (wsEvent.type) {
          case "ORDER_CREATED":
            console.log("[WebSocket] Invalidating orders query");
            queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
            onNewOrderRef.current?.();
            break;
          case "ORDER_UPDATED":
          case "ORDER_DELETED":
            console.log("[WebSocket] Invalidating orders query");
            queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
            break;
          case "KITCHEN_ORDER_CREATED":
            console.log("[WebSocket] Invalidating kitchen query");
            queryClient.invalidateQueries({ queryKey: ["/api/kitchen"] });
            onNewOrderRef.current?.();
            break;
          case "KITCHEN_ORDER_UPDATED":
          case "KITCHEN_ORDER_DELETED":
            console.log("[WebSocket] Invalidating kitchen query");
            queryClient.invalidateQueries({ queryKey: ["/api/kitchen"] });
            break;
          case "ATTENDANCE_QR_CHANGED":
            console.log("[WebSocket] Invalidating attendance QR query");
            queryClient.invalidateQueries({ queryKey: ["/api/attendance/qr"] });
            break;
        }
      } catch (err) {
        console.error("[WebSocket] Message parse error:", err, event.data);
      }
    };

    ws.onclose = (event) => {
      // Don't reconnect if the component is unmounted
      if (wsRef.current !== ws) return;

      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 15000);
      console.warn(`[WebSocket] Closed (code: ${event.code}, reason: ${event.reason || 'none'}). Reconnecting in ${delay}ms...`);
      
      reconnectAttempts.current++;
      reconnectTimeoutRef.current = setTimeout(connect, delay);
    };

    ws.onerror = (err) => {
      // Detailed error logging
      const readyState = wsRef.current?.readyState;
      console.error("[WebSocket] Transport error:", {
        readyState,
        url: wsUrl,
        error: err
      });
    };
  }, [queryClient]);

  useEffect(() => {
    connect();

    // Client-side heartbeat to keep proxy connection alive
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: "ping", timestamp: Date.now() }));
      }
    }, 20000); // Send every 20s

    return () => {
      console.log("[WebSocket] Cleaning up connection...");
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        // Change the ref before closing to prevent onclose from triggering reconnect
        const ws = wsRef.current;
        wsRef.current = null;
        ws.close();
      }
    };
  }, [connect]);

  return wsRef.current;
}
