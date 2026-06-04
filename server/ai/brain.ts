import { db } from "../db";
import { instructions, type InsertInstruction, type Instruction } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";

export interface IBrain {
  getAllInstructions(): Promise<Instruction[]>;
  getEnabledInstructions(): Promise<Instruction[]>;
  createInstruction(input: InsertInstruction): Promise<Instruction>;
  updateInstruction(id: number, input: Partial<InsertInstruction>): Promise<Instruction>;
  deleteInstruction(id: number): Promise<void>;
  findInstructionByTrigger(message: string): Promise<Instruction | undefined>;
}

export class Brain implements IBrain {
  async getAllInstructions() {
    return db.select().from(instructions).orderBy(desc(instructions.createdAt));
  }

  async getEnabledInstructions() {
    return db.select().from(instructions).where(eq(instructions.enabled, true)).orderBy(desc(instructions.createdAt));
  }

  async createInstruction(input: InsertInstruction) {
    const [created] = await db.insert(instructions).values(input).returning();
    return created;
  }

  async updateInstruction(id: number, input: Partial<InsertInstruction>) {
    const [updated] = await db.update(instructions)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(instructions.id, id))
      .returning();
    return updated;
  }

  async deleteInstruction(id: number) {
    await db.delete(instructions).where(eq(instructions.id, id));
  }

  async findInstructionByTrigger(message: string) {
    const all = await this.getEnabledInstructions();
    const lowerMsg = message.toLowerCase();
    return all.find((inst) => lowerMsg.includes(inst.trigger.toLowerCase()));
  }
}

export const brain = new Brain();