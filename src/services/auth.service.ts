import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db/mongoose";
import UserModel from "@/lib/db/models/user.model";
import type { User } from "@/types";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";
const JWT_EXPIRES_IN = "7d";

export interface AuthPayload {
  userId: string;
  email:  string;
  name:   string;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, JWT_SECRET) as AuthPayload;
}

export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<{ user: User; token: string }> {
  await connectDB();

  const existing = await UserModel.findOne({ email });
  if (existing) throw new Error("An account with this email already exists.");

  const hashed = await bcrypt.hash(password, 12);
  const doc    = await UserModel.create({ name, email, password: hashed });

  const user: User = {
    _id:       doc._id.toString(),
    name:      doc.name,
    email:     doc.email,
    createdAt: doc.createdAt.toISOString(),
  };

  const token = signToken({ userId: user._id, email: user.email, name: user.name });
  return { user, token };
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ user: User; token: string }> {
  await connectDB();

  const doc = await UserModel.findOne({ email }).select("+password");
  if (!doc) throw new Error("Invalid email or password.");

  const valid = await bcrypt.compare(password, doc.password);
  if (!valid) throw new Error("Invalid email or password.");

  const user: User = {
    _id:       doc._id.toString(),
    name:      doc.name,
    email:     doc.email,
    createdAt: doc.createdAt.toISOString(),
  };

  const token = signToken({ userId: user._id, email: user.email, name: user.name });
  return { user, token };
}
