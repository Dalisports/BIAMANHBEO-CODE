import OpenAI from "openai";
import type { Models } from "./types";

export const MODELS = [
  { id: "step-3.5-flash", name: "Step-3.5 Flash", provider: "NVIDIA", description: "16K tokens" },
  { id: "minimax-m2", name: "MiniMax M2", provider: "NVIDIA", description: "8K tokens" },
  { id: "gemma-2-2b-it", name: "Gemma-2-2B", provider: "NVIDIA", description: "4K tokens" },
  { id: "ollama-gemma3-1b", name: "Ollama Gemma3:1b", provider: "Ollama (Local)", description: "Local model" },
];

let _models: Models | null = null;

export function createAIClients(): Models {
  if (_models) return _models;

  const nvidiaClient = new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY || "",
    baseURL: "https://integrate.api.nvidia.com/v1",
  });

  const ollamaClient = new OpenAI({
    apiKey: "ollama",
    baseURL: process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1",
  });

  _models = {
    "step-3.5-flash": { client: nvidiaClient, model: "stepfun-ai/step-3.5-flash" },
    "minimax-m2": { client: nvidiaClient, model: "minimaxai/minimax-m2.7" },
    "gemma-2-2b-it": { client: nvidiaClient, model: "google/gemma-2-2b-it" },
    "ollama-gemma3-1b": { client: ollamaClient, model: "gemma3:1b" },
  };

  return _models;
}