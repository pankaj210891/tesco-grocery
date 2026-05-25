import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { connectDB } from "@/lib/db/mongoose";
import UserModel from "@/lib/db/models/user.model";
import type { User, UserRole } from "@/types";

// ─── Secrets ─────────────────────────────────────────────────────────────────

const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is not set.");
  return secret;
})();

// Falls back to JWT_SECRET when JWT_REFRESH_SECRET is not configured.
// For production, always set a distinct JWT_REFRESH_SECRET.
const JWT_REFRESH_SECRET = (() => {
  return process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET ?? "";
})();

// ─── Token lifetimes ─────────────────────────────────────────────────────────

export const ACCESS_TOKEN_EXPIRY_SEC  = 15 * 60;        // 15 minutes
export const REFRESH_TOKEN_EXPIRY_SEC = 7 * 24 * 60 * 60; // 7 days

// ─── Payload ─────────────────────────────────────────────────────────────────

export interface AuthPayload {
  userId: string;
  email:  string;
  name:   string;
  role:   UserRole;
  jti:    string; // JWT ID — used for revocation
}

// ─── Token helpers ────────────────────────────────────────────────────────────

export function signToken(payload: Omit<AuthPayload, "jti">): string {
  return jwt.sign(
    { ...payload, jti: randomUUID() },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY_SEC }
  );
}

export function signRefreshToken(payload: Omit<AuthPayload, "jti">): string {
  return jwt.sign(
    { ...payload, jti: randomUUID() },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY_SEC }
  );
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, JWT_SECRET) as AuthPayload;
}

export function verifyRefreshToken(token: string): AuthPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as AuthPayload;
}

// ─── Auth flows ───────────────────────────────────────────────────────────────

export interface AuthResult {
  user:         User;
  token:        string; // short-lived access token
  refreshToken: string; // long-lived refresh token
}

export async function registerUser(
  name:     string,
  email:    string,
  password: string
): Promise<AuthResult> {
  await connectDB();

  const existing = await UserModel.findOne({ email });
  if (existing) throw new Error("An account with this email already exists.");

  const hashed = await bcrypt.hash(password, 12);
  const doc    = await UserModel.create({ name, email, password: hashed });

  const role = (doc.role ?? "customer") as UserRole;
  const user: User = {
    _id:       doc._id.toString(),
    name:      doc.name,
    email:     doc.email,
    role,
    status:    (doc.status ?? "active") as "active" | "suspended",
    createdAt: doc.createdAt.toISOString(),
  };

  const tokenPayload = { userId: user._id, email: user.email, name: user.name, role };
  return { user, token: signToken(tokenPayload), refreshToken: signRefreshToken(tokenPayload) };
}

export async function loginUser(
  email:    string,
  password: string
): Promise<AuthResult> {
  await connectDB();

  const doc = await UserModel.findOne({ email }).select("+password");
  if (!doc) throw new Error("Invalid email or password.");

  const valid = await bcrypt.compare(password, doc.password);
  if (!valid) throw new Error("Invalid email or password.");

  if (doc.status === "suspended") throw new Error("Your account has been suspended.");

  const role = (doc.role ?? "customer") as UserRole;
  const user: User = {
    _id:       doc._id.toString(),
    name:      doc.name,
    email:     doc.email,
    role,
    status:    (doc.status ?? "active") as "active" | "suspended",
    createdAt: doc.createdAt.toISOString(),
  };

  const tokenPayload = { userId: user._id, email: user.email, name: user.name, role };
  return { user, token: signToken(tokenPayload), refreshToken: signRefreshToken(tokenPayload) };
}
