import type { Express } from "express";
import { z } from "zod";
import type { IStorage } from "./agentStorage";
import type { IChatStorage } from "../replit_integrations/chat/storage";
import type { IBrain } from "./brain";
import { createAIClients } from "./client";
import { AgentHandler } from "./handler";

export function registerAIRoutes(app: Express, storage: IStorage, chatStorage: IChatStorage, brain: IBrain) {
  const models = createAIClients();
  const agent = new AgentHandler(models, storage, chatStorage, brain);

  app.get("/api/agent/brain/instructions", async (_req, res) => {
    const all = await brain.getAllInstructions();
    res.json(all);
  });

  app.post("/api/agent/brain/instructions", async (req, res) => {
    try {
      const input = z.object({
        trigger: z.string().min(1),
        instruction: z.string().min(1),
        example: z.string().optional(),
      }).parse(req.body);
      const created = await brain.createInstruction(input);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.patch("/api/agent/brain/instructions/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = z.object({
        trigger: z.string().optional(),
        instruction: z.string().optional(),
        example: z.string().optional(),
        enabled: z.boolean().optional(),
      }).parse(req.body);
      const updated = await brain.updateInstruction(id, input);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.delete("/api/agent/brain/instructions/:id", async (req, res) => {
    await brain.deleteInstruction(Number(req.params.id));
    res.json({ success: true });
  });

  app.post("/api/agent/chat", async (req, res) => {
    try {
      const input = z.object({
        message: z.string(),
        model: z.string().optional(),
        history: z.array(z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        })).optional(),
      }).parse(req.body);

      console.log("[SÓI AI] Processing message:", input.message);
      const result = await agent.process(input);
      console.log("[SÓI AI] Response:", result.reply, "| Action:", result.action);
      res.json(result);
    } catch (err) {
      console.error("[SÓI AI] Error:", err);
      res.status(500).json({ message: "Internal error" });
    }
  });
}