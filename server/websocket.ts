import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { z } from "zod";
import type { WSEventType, WSRoom, WSEvent } from "@shared/websocket";
import { getRoomsForEvent, generateEventId } from "@shared/websocket";

// Re-export types for backward compatibility
export type { WSEventType, WSRoom, WSEvent };

interface WSClient {
  ws: WebSocket;
  isAlive: boolean;
  rooms: Set<WSRoom>;
  lastPing: number;
  messageCount: number;
  lastMessageTime: number;
  id: string;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const SubscribeMessageSchema = z.object({
  action: z.literal("subscribe"),
  rooms: z.array(z.enum(["orders", "kitchen", "products", "tables", "attendance", "payments", "all"])),
});

const UnsubscribeMessageSchema = z.object({
  action: z.literal("unsubscribe"),
  rooms: z.array(z.enum(["orders", "kitchen", "products", "tables", "attendance", "payments", "all"])),
});

const PingMessageSchema = z.object({
  action: z.literal("ping"),
  timestamp: z.number(),
});

const ClientMessageSchema = z.union([
  SubscribeMessageSchema,
  UnsubscribeMessageSchema,
  PingMessageSchema,
]);

// ============================================================================
// CONSTANTS
// ============================================================================

const HEARTBEAT_INTERVAL = 30000; // 30s
const HEARTBEAT_TIMEOUT = 60000; // 60s
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 100; // messages per minute
const RECONNECT_GRACE_PERIOD = 5000; // 5s grace period for reconnection

// ============================================================================
// STATE
// ============================================================================

let wss: WebSocketServer | null = null;
const clients = new Map<WebSocket, WSClient>();
const rooms = new Map<WSRoom, Set<WebSocket>>();
let heartbeatInterval: NodeJS.Timeout | null = null;

// ============================================================================
// UTILITIES
// ============================================================================

const generateId = generateEventId;

const getRoomForEvent = getRoomsForEvent;

function checkRateLimit(client: WSClient): boolean {
  const now = Date.now();
  if (now - client.lastMessageTime > RATE_LIMIT_WINDOW) {
    client.messageCount = 0;
    client.lastMessageTime = now;
  }
  client.messageCount++;
  return client.messageCount <= RATE_LIMIT_MAX;
}

// ============================================================================
// CLIENT MANAGEMENT
// ============================================================================

function addClientToRoom(ws: WebSocket, room: WSRoom): void {
  if (!rooms.has(room)) {
    rooms.set(room, new Set());
  }
  rooms.get(room)!.add(ws);
  
  const client = clients.get(ws);
  if (client) {
    client.rooms.add(room);
  }
}

function removeClientFromRoom(ws: WebSocket, room: WSRoom): void {
  rooms.get(room)?.delete(ws);
  const client = clients.get(ws);
  if (client) {
    client.rooms.delete(room);
  }
}

function removeClient(ws: WebSocket): void {
  const client = clients.get(ws);
  if (client) {
    // Remove from all rooms
    client.rooms.forEach(room => {
      rooms.get(room)?.delete(ws);
    });
    clients.delete(ws);
  }
}

// ============================================================================
// MESSAGE HANDLERS
// ============================================================================

function handleSubscribe(ws: WebSocket, roomsToSubscribe: WSRoom[]): void {
  const client = clients.get(ws);
  if (!client) return;

  roomsToSubscribe.forEach(room => {
    addClientToRoom(ws, room);
  });

  sendToClient(ws, {
    type: "SUBSCRIBED",
    data: { rooms: roomsToSubscribe },
    timestamp: Date.now(),
    id: generateId(),
  });
}

function handleUnsubscribe(ws: WebSocket, roomsToUnsubscribe: WSRoom[]): void {
  const client = clients.get(ws);
  if (!client) return;

  roomsToUnsubscribe.forEach(room => {
    removeClientFromRoom(ws, room);
  });

  sendToClient(ws, {
    type: "UNSUBSCRIBED",
    data: { rooms: roomsToUnsubscribe },
    timestamp: Date.now(),
    id: generateId(),
  });
}

function handlePing(ws: WebSocket, timestamp: number): void {
  const client = clients.get(ws);
  if (client) {
    // Mark client as alive - application-level ping counts as activity
    client.isAlive = true;
    client.lastPing = Date.now();
  }

  sendToClient(ws, {
    type: "PONG",
    data: { clientTimestamp: timestamp, serverTimestamp: Date.now() },
    timestamp: Date.now(),
    id: generateId(),
  });
}

// Handle protocol-level pong from client (browser auto-responds to server ping)
function handlePong(ws: WebSocket): void {
  const client = clients.get(ws);
  if (client) {
    client.isAlive = true;
    client.lastPing = Date.now();
  }
}

// Send application-level ping (client expects PONG response)
function sendApplicationPing(ws: WebSocket): void {
  sendToClient(ws, {
    type: "PONG",
    data: { serverTimestamp: Date.now() },
    timestamp: Date.now(),
    id: generateId(),
  });
}

// ============================================================================
// PUBLIC API
// ============================================================================

export function initWebSocket(httpServer: Server): void {
  if (wss) {
    console.log("WebSocket server already initialized");
    return;
  }

  // Create WebSocket server attached to HTTP server
  wss = new WebSocketServer({
    server: httpServer,
    path: "/ws",
    // Disable compression for better proxy compatibility (Fly.io, etc.)
    perMessageDeflate: false,
    maxPayload: 1024 * 1024, // 1MB max payload
    // Add client tracking
    clientTracking: true,
  });

  // Handle upgrade errors
  wss.on("error", (err) => {
    console.error("[WebSocket] Server error:", err);
  });

  // Log when server starts listening
  wss.on("listening", () => {
    console.log("[WebSocket] Server is now listening for connections");
  });
  
  // Handle upgrade events for debugging
  httpServer.on('upgrade', (request, socket, head) => {
    console.log(`[HTTP] Upgrade request for: ${request.url}`);
  });

  wss.on("connection", (ws: WebSocket, req: any) => {
    const clientId = generateId();
    const client: WSClient = {
      ws,
      isAlive: true,
      rooms: new Set(),
      lastPing: Date.now(),
      messageCount: 0,
      lastMessageTime: Date.now(),
      id: clientId,
    };
    
    clients.set(ws, client);
    
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log(`[WebSocket] Client connected: ${clientId} from ${clientIp}`);
    console.log(`[WebSocket] Total clients: ${clients.size}`);

    // Auto-subscribe to "all" room
    addClientToRoom(ws, "all");

    // Send welcome message after a small delay to ensure connection is stable
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        sendToClient(ws, {
          type: "CONNECTED",
          data: { clientId, timestamp: Date.now() },
          timestamp: Date.now(),
          id: generateId(),
        });
      }
    }, 100);

    ws.on("message", (rawData) => {
      const client = clients.get(ws);
      if (!client) return;

      // Rate limiting
      if (!checkRateLimit(client)) {
        sendToClient(ws, {
          type: "ERROR",
          data: { message: "Rate limit exceeded" },
          timestamp: Date.now(),
          id: generateId(),
        });
        return;
      }

      try {
        const data = JSON.parse(rawData.toString());
        const result = ClientMessageSchema.safeParse(data);

        if (!result.success) {
          sendToClient(ws, {
            type: "ERROR",
            data: { message: "Invalid message format", errors: result.error.errors },
            timestamp: Date.now(),
            id: generateId(),
          });
          return;
        }

        const message = result.data;

        switch (message.action) {
          case "subscribe":
            handleSubscribe(ws, message.rooms);
            break;
          case "unsubscribe":
            handleUnsubscribe(ws, message.rooms);
            break;
          case "ping":
            handlePing(ws, message.timestamp);
            break;
        }
      } catch (err) {
        console.error("WebSocket message error:", err);
        sendToClient(ws, {
          type: "ERROR",
          data: { message: "Failed to process message" },
          timestamp: Date.now(),
          id: generateId(),
        });
      }
    });

    ws.on("pong", () => {
      handlePong(ws);
    });

    ws.on("close", (code: number, reason: Buffer) => {
      const client = clients.get(ws);
      console.log(`[WebSocket] Client disconnected: ${client?.id || 'unknown'} (code: ${code}, reason: ${reason.toString()})`);
      removeClient(ws);
    });

    ws.on("error", (err) => {
      const client = clients.get(ws);
      console.error(`[WebSocket] Error for client ${client?.id || clientId}:`, err);
      removeClient(ws);
    });
  });

  // Heartbeat with cleanup - use application-level ping
  heartbeatInterval = setInterval(() => {
    const now = Date.now();
    const clientCount = clients.size;
    
    if (clientCount > 0) {
      console.log(`[WebSocket] Heartbeat check: ${clientCount} clients, ${Array.from(clients.values()).filter(c => !c.isAlive).length} pending pong`);
    }
    
    clients.forEach((client, ws) => {
      // Check if client hasn't responded to ping
      if (!client.isAlive) {
        if (now - client.lastPing > HEARTBEAT_TIMEOUT) {
          console.log(`[WebSocket] Terminating inactive client: ${client.id} (last ping: ${now - client.lastPing}ms ago)`);
          ws.terminate();
          removeClient(ws);
        }
        return;
      }

      client.isAlive = false;
      try {
        // Send application-level ping that client expects
        sendApplicationPing(ws);
      } catch (err) {
        console.error(`[WebSocket] Failed to ping client ${client.id}:`, err);
        ws.terminate();
        removeClient(ws);
      }
    });
  }, HEARTBEAT_INTERVAL);

  wss.on("close", () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  });

  wss.on("error", (err) => {
    console.error("[WebSocket] Server error:", err);
  });

  console.log("[WebSocket] Server initialized on /ws (compression disabled for proxy compatibility)");
}

export function sendToClient(ws: WebSocket, event: WSEvent): boolean {
  if (ws.readyState !== WebSocket.OPEN) {
    return false;
  }

  try {
    ws.send(JSON.stringify(event));
    return true;
  } catch (err) {
    console.error("Failed to send message to client:", err);
    return false;
  }
}

export function broadcast(event: WSEvent, targetRooms?: WSRoom[]): void {
  if (!wss) return;

  const message = JSON.stringify(event);
  const targetRoomList = targetRooms || getRoomForEvent(event.type);

  // Collect all target clients (using Set to avoid duplicates)
  const targetClients = new Set<WebSocket>();
  
  targetRoomList.forEach(room => {
    rooms.get(room)?.forEach(ws => {
      targetClients.add(ws);
    });
  });

  // Send to all collected clients
  targetClients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(message);
      } catch (err) {
        console.error("Failed to broadcast message:", err);
        removeClient(ws);
      }
    }
  });
}

// Helper function for easy event broadcasting (auto-generates timestamp and id)
export function broadcastEvent<T>(type: WSEventType, data: T, targetRooms?: WSRoom[]): void {
  const event: WSEvent<T> = {
    type,
    data,
    timestamp: Date.now(),
    id: generateEventId(),
  };
  broadcast(event, targetRooms);
}

export function broadcastToRoom(room: WSRoom, event: WSEvent): void {
  broadcast(event, [room]);
}

export function getStats(): { clients: number; rooms: Record<string, number> } {
  const roomStats: Record<string, number> = {};
  rooms.forEach((clients, room) => {
    roomStats[room] = clients.size;
  });

  return {
    clients: clients.size,
    rooms: roomStats,
  };
}

export function closeWebSocket(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  
  clients.forEach((client, ws) => {
    ws.close(1000, "Server shutting down");
  });
  clients.clear();
  rooms.clear();
  
  wss?.close();
  wss = null;
}
