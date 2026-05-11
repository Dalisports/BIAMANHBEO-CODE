// ============================================================================
// SHARED WEBSOCKET TYPES
// Used by both client and server to ensure type consistency
// ============================================================================

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
  | "ATTENDANCE_QR_CHANGED"
  | "TABLE_UPDATED"
  | "PAYMENT_RECEIVED"
  // System events
  | "CONNECTED"
  | "SUBSCRIBED"
  | "UNSUBSCRIBED"
  | "PONG"
  | "ERROR";

export type WSRoom =
  | "orders"
  | "kitchen"
  | "products"
  | "tables"
  | "attendance"
  | "payments"
  | "all";

export interface WSEvent<T = any> {
  type: WSEventType;
  data: T;
  timestamp: number;
  id: string;
}

// Client -> Server messages
export interface SubscribeMessage {
  action: "subscribe";
  rooms: WSRoom[];
}

export interface UnsubscribeMessage {
  action: "unsubscribe";
  rooms: WSRoom[];
}

export interface PingMessage {
  action: "ping";
  timestamp: number;
}

export type ClientMessage = SubscribeMessage | UnsubscribeMessage | PingMessage;

// Server -> Client events
export interface ConnectedEvent extends WSEvent<{ clientId: string }> {
  type: "CONNECTED";
}

export interface SubscribedEvent extends WSEvent<{ rooms: WSRoom[] }> {
  type: "SUBSCRIBED";
}

export interface UnsubscribedEvent extends WSEvent<{ rooms: WSRoom[] }> {
  type: "UNSUBSCRIBED";
}

export interface PongEvent extends WSEvent<{ clientTimestamp: number; serverTimestamp: number }> {
  type: "PONG";
}

export interface ErrorEvent extends WSEvent<{ message: string; errors?: any[] }> {
  type: "ERROR";
}

// Room mapping for events
export const EVENT_ROOM_MAP: Record<WSEventType, WSRoom[]> = {
  ORDER_CREATED: ["orders", "kitchen"],
  ORDER_UPDATED: ["orders", "kitchen"],
  ORDER_DELETED: ["orders", "kitchen"],
  KITCHEN_ORDER_CREATED: ["kitchen"],
  KITCHEN_ORDER_UPDATED: ["kitchen"],
  KITCHEN_ORDER_DELETED: ["kitchen"],
  PRODUCT_CREATED: ["products"],
  PRODUCT_UPDATED: ["products"],
  PRODUCT_DELETED: ["products"],
  ATTENDANCE_QR_CHANGED: ["attendance"],
  TABLE_UPDATED: ["tables"],
  PAYMENT_RECEIVED: ["payments", "orders"],
  // System events - no rooms
  CONNECTED: [],
  SUBSCRIBED: [],
  UNSUBSCRIBED: [],
  PONG: [],
  ERROR: [],
};

export function getRoomsForEvent(eventType: WSEventType): WSRoom[] {
  return EVENT_ROOM_MAP[eventType] || ["all"];
}

// Generate unique event ID
export function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Create event helper
export function createEvent<T>(type: WSEventType, data: T): WSEvent<T> {
  return {
    type,
    data,
    timestamp: Date.now(),
    id: generateEventId(),
  };
}
