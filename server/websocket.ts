import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";

type WSClient = {
  ws: WebSocket;
  isAlive: boolean;
};

let wss: WebSocketServer;
const clients = new Map<WebSocket, WSClient>();

export function initWebSocket(httpServer: Server) {
  wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    clients.set(ws, { ws, isAlive: true });

    ws.on("pong", () => {
      const client = clients.get(ws);
      if (client) client.isAlive = true;
    });

    ws.on("close", () => {
      clients.delete(ws);
    });

    ws.on("error", (err) => {
      console.error("WebSocket error:", err);
      clients.delete(ws);
    });
  });

  const interval = setInterval(() => {
    wss?.clients.forEach((ws) => {
      const client = clients.get(ws);
      if (client && !client.isAlive) {
        ws.terminate();
        clients.delete(ws);
        return;
      }
      client!.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(interval);
  });

  console.log("WebSocket server initialized on /ws");
}

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

export function broadcast(event: WSEvent) {
  if (!wss) return;
  
  const message = JSON.stringify(event);
  clients.forEach(({ ws }) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}
