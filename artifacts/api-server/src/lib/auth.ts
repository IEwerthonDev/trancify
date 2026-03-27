import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env["JWT_SECRET"];
const IS_PRODUCTION = process.env["NODE_ENV"] === "production";

if (!JWT_SECRET) {
  if (IS_PRODUCTION) {
    throw new Error("JWT_SECRET environment variable is required in production.");
  }
  console.warn(
    "\x1b[33m[SECURITY WARNING]\x1b[0m JWT_SECRET is not set. " +
    "Using an insecure fallback. Set JWT_SECRET before deploying to production."
  );
}

const EFFECTIVE_JWT_SECRET = JWT_SECRET ?? "trancify-dev-insecure-secret-do-not-use-in-production";
const JWT_EXPIRES_IN = "7d";

export const MIN_PASSWORD_LENGTH = 8;

export interface JwtPayload {
  userId: string;
  email: string;
  role: "tenant" | "super_admin";
  tenantId?: string;
  tenantSlug?: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, EFFECTIVE_JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, EFFECTIVE_JWT_SECRET) as JwtPayload;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "Unauthorized", message: "No token provided" });
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized", message: "Invalid or expired token" });
  }
}

export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user?.role !== "super_admin") {
      res.status(403).json({ error: "Forbidden", message: "Super admin access required" });
      return;
    }
    next();
  });
}

export function requireTenant(req: AuthRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user?.role !== "tenant") {
      res.status(403).json({ error: "Forbidden", message: "Tenant access required" });
      return;
    }
    next();
  });
}
