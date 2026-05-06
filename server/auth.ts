import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const SALT = process.env.AUTH_SALT || "default-salt-change-in-production";
const TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || "default-token-secret-change-in-production";

function hashPassword(password: string): string {
  return crypto.pbkdf2Sync(password, SALT, 1000, 64, "sha512").toString("hex");
}

function generateToken(userId: number, username: string, role: string): string {
  const payload = `${userId}:${username}:${role}:${Date.now()}`;
  const encrypted = crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("hex");
  return `${payload}:${encrypted}`;
}

function verifyToken(token: string): { userId: number; username: string; role: string } | null {
  try {
    const parts = token.split(":");
    if (parts.length !== 5) return null;

    const [userId, username, role, timestamp, signature] = parts;
    const expectedEncrypted = crypto.createHmac("sha256", TOKEN_SECRET)
      .update(`${userId}:${username}:${role}:${timestamp}`)
      .digest("hex");

    if (signature !== expectedEncrypted) return null;
    if (Date.now() - parseInt(timestamp) > 7 * 24 * 60 * 60 * 1000) return null;

    return { userId: parseInt(userId), username, role };
  } catch {
    return null;
  }
}

export interface AuthUser {
  userId: number;
  username: string;
  role: "owner" | "employee";
}

export async function login(
  username: string, 
  password: string
): Promise<{ token: string; user: AuthUser } | null> {
  const [user] = await db.select().from(users).where(
    eq(users.username, username)
  );
  
  if (!user || !user.isActive) return null;
  if (user.password !== hashPassword(password)) return null;
  
  const token = generateToken(user.id, user.username, user.role);
  
  return {
    token,
    user: { userId: user.id, username: user.username, role: user.role as "owner" | "employee" }
  };
}

export async function register(
  username: string,
  password: string,
  role: "owner" | "employee" = "employee",
  fullName?: string
): Promise<{ token: string; user: AuthUser } | null> {
  console.log("[AUTH] Registering user:", username, "role:", role);
  try {
    const existing = await db.select().from(users).where(eq(users.username, username));
    if (existing.length > 0) {
      console.log("[AUTH] Username already exists");
      return null;
    }
  } catch (err) {
    console.log("[AUTH] Table might not exist, trying to continue:", err);
  }
  
  const hashedPassword = hashPassword(password);
  try {
    const [created] = await db.insert(users).values({
      username,
      password: hashedPassword,
      role,
      fullName: fullName || null,
      isActive: true,
    }).returning();
    console.log("[AUTH] Created user:", created.id, created.username);
    
    const token = generateToken(created.id, created.username, created.role);
    return {
      token,
      user: { userId: created.id, username: created.username, role: created.role as "owner" | "employee" }
    };
  } catch (err) {
    console.error("[AUTH] Insert error:", err);
    return null;
  }
}

export function verifyAuth(tokenString: string): AuthUser | null {
  const decoded = verifyToken(tokenString);
  if (!decoded) return null;
  return decoded as AuthUser;
}

export function requireAuth(
  tokenString: string
): AuthUser {
  const user = verifyAuth(tokenString);
  if (!user) throw new Error("Unauthorized");
  return user;
}

export function requireOwner(user: AuthUser): void {
  if (user.role !== "owner") {
    throw new Error("Forbidden: Owner only");
  }
}

export { verifyToken };