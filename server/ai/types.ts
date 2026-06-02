import type OpenAI from "openai";

export interface AIModelConfig {
  client: OpenAI;
  model: string;
}

export type Models = Record<string, AIModelConfig>;

export interface ChatRequest {
  message: string;
  model?: string;
  history?: { role: "user" | "assistant"; content: string }[];
}

export interface ChatResponse {
  reply: string;
  action?: string;
  data?: unknown;
}

export interface AgentContext {
  products: unknown[];
  pendingOrders: unknown[];
  allOrders: unknown[];
  memories: { summary: string }[];
  customInstructions: { trigger: string; instruction: string; example: string | null }[];
  todayStats: {
    totalOrders: number;
    completedOrders: number;
    revenue: number;
  };
}