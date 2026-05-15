import mongoose from "mongoose";

declare global {
  var __mongoCache:
    | { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
    | undefined;
}

const cache = global.__mongoCache ?? { conn: null, promise: null };
global.__mongoCache = cache;

export function isDBConfigured(): boolean {
  const uri = process.env.MONGODB_URI;
  return !!uri && !uri.includes("<username>");
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes("<username>")) {
    throw new Error(
      "MONGODB_URI is not configured. Add it to .env.local and restart the dev server."
    );
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, { bufferCommands: false });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}
