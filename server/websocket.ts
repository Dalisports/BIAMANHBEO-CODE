import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import pg from "pg";
import url from "url";
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

const PongMessageSchema = z.object({
  action: z.literal("pong"),
  timestamp: z.number(),
});

const ClientMessageSchema = z.union([
  SubscribeMessageSchema,
  UnsubscribeMessageSchema,
  PingMessageSchema,
  PongMessageSchema,
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
let pgPool: pg.Pool | null = null;

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

  console.log('[WebSocket] Initializing server with verbose diagnostics...');

  // Create WebSocket server without attaching to httpServer directly first
  wss = new WebSocketServer({ 
    noServer: true,
    perMessageDeflate: false,
    maxPayload: 1024 * 1024,
    clientTracking: true,
  });

  // Attach manual upgrade listener to httpServer for debugging
  httpServer.on('upgrade', (request, socket, head) => {
    const { pathname } = url.parse(request.url || '');
    
    console.log(`[HTTP Upgrade] Request Path: ${pathname}`);
    console.log(`[HTTP Upgrade] Headers: ${JSON.stringify(request.headers)}`);

    if (pathname === '/ws' || pathname === '/ws/') {
      console.log(`[WebSocket] Path matched /ws, attempting handleUpgrade...`);
      wss!.handleUpgrade(request, socket, head, (ws) => {
        console.log('[WebSocket] Upgrade successful, emitting connection event');
        wss!.emit('connection', ws, request);
      });
    } else {
      // Don't log for Vite HMR (starts with /vite-hmr or similar)
      if (!pathname?.includes('vite')) {
        console.log(`[HTTP Upgrade] Ignoring non-ws path: ${pathname}`);
      }
    }
  });

  // Handle upgrade errors
  wss.on("error", (err) => {
    console.error("[WebSocket] Server error:", err);
  });

  wss.on("listening", () => {
    console.log("[WebSocket] Server is now listening for connections");
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
    console.log(`[WebSocket] User-Agent: ${req.headers['user-agent']}`);
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
          case "pong":
            handlePong(ws);
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

    // Protocol-level pong handler (browser handles this automatically)
    ws.on("pong", () => {
      const client = clients.get(ws);
      if (client) {
        client.isAlive = true;
        client.lastPing = Date.now();
      }
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

  // Setup Postgres LISTEN for multi-node synchronization
  const dbUrl = new URL(process.env.DATABASE_URL || "");
  const isLocalDb = dbUrl.hostname === "127.0.0.1" || dbUrl.hostname === "localhost";
  const pgConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: isLocalDb ? false : { rejectUnauthorized: false }
  };

  pgPool = new pg.Pool(pgConfig);
  
  const pgClient = new pg.Client(pgConfig);
  pgClient.connect().then(() => {
    console.log("[WebSocket] Connected to Postgres for event synchronization (LISTEN ws_events)");
    pgClient.query("LISTEN ws_events");
    
    pgClient.on("notification", (msg) => {
      if (msg.channel === "ws_events" && msg.payload) {
        try {
          const { event, targetRooms } = JSON.parse(msg.payload);
          console.log(`[WebSocket] Cross-node event received: ${event.type}`);
          // Broadcast to LOCAL clients only (other nodes will do the same)
          broadcastLocally(event, targetRooms);
        } catch (err) {
          console.error("[WebSocket] Failed to parse cross-node notification:", err);
        }
      }
    });

    pgClient.on("error", (err) => {
      console.error("[WebSocket] Postgres client error during sync:", err);
      // Attempt to reconnect after a delay
      setTimeout(() => initWebSocket(httpServer), 5000);
    });
  }).catch(err => {
    console.error("[WebSocket] Failed to connect to Postgres for sync:", err);
  });

  // Heartbeat with cleanup - use protocol-level ping
  heartbeatInterval = setInterval(() => {
    const now = Date.now();
    clients.forEach((client, ws) => {
      if (!client.isAlive) {
        if (now - client.lastPing > HEARTBEAT_TIMEOUT) {
          console.log(`[WebSocket] Terminating inactive client: ${client.id} (no pong for ${now - client.lastPing}ms)`);
          ws.terminate();
          removeClient(ws);
        }
        return;
      }

      client.isAlive = false;
      try {
        ws.ping(); // Protocol-level ping
        // Also send application-level ping for older browsers/proxies
        sendToClient(ws, {
          type: "PING",
          data: { serverTimestamp: Date.now() },
          timestamp: Date.now(),
          id: generateId(),
        } as any);
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

// Local broadcast within this specific server instance
function broadcastLocally(event: WSEvent, targetRooms?: WSRoom[]): void {
  if (!wss) return;

  const message = JSON.stringify(event);
  const baseRooms = targetRooms || getRoomForEvent(event.type);
  const targetRoomList = [...new Set([...baseRooms, "all"])] as WSRoom[];
  const targetClients = new Set<WebSocket>();
  
  targetRoomList.forEach(room => {
    rooms.get(room)?.forEach(ws => {
      targetClients.add(ws);
    });
  });

  if (targetClients.size > 0) {
    console.log(`[WebSocket] Local broadcast: "${event.type}" to ${targetClients.size} clients`);
  }

  targetClients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(message);
      } catch (err) {
        console.error("[WebSocket] Send failed:", err);
        removeClient(ws);
      }
    }
  });
}

// Global broadcast across all server instances using Postgres NOTIFY
export function broadcast(event: WSEvent, targetRooms?: WSRoom[]): void {
  // 1. Send to local clients immediately
  broadcastLocally(event, targetRooms);

  // 2. Notify other nodes via Postgres if pool is available
  if (pgPool) {
    const payload = JSON.stringify({ event, targetRooms });
    pgPool.query("SELECT pg_notify('ws_events', $1)", [payload])
      .catch(err => console.error("[WebSocket] Global notify failed:", err));
  } else {
    console.warn("[WebSocket] Skipping global notify: pgPool not initialized");
  }
}

// Helper function for easy event broadcasting (auto-generates timestamp and id)
export function broadcastEvent<T>(type: WSEventType, data: T, targetRooms?: WSRoom[]): void {
  console.log(`[WebSocket] Triggering broadcastEvent: ${type}`);
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
