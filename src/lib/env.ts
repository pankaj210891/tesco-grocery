import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Database — required
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

  // Auth — required; refresh secret falls back to JWT_SECRET when not set
  JWT_SECRET:         z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters").optional(),

  // App URLs — optional
  NEXT_PUBLIC_APP_URL:  z.string().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().optional(),

  // Razorpay — optional (payment features disabled when absent)
  RAZORPAY_KEY_ID:             z.string().optional(),
  RAZORPAY_KEY_SECRET:         z.string().optional(),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET:     z.string().optional(),

  // Email — optional (email features degraded when absent)
  SMTP_HOST:       z.string().optional(),
  SMTP_PORT:       z.string().optional(),
  SMTP_USER:       z.string().optional(),
  SMTP_PASS:       z.string().optional(),
  MAIL_FROM_EMAIL: z.string().optional(),
  MAIL_FROM_NAME:  z.string().optional(),

  // Upstash Redis — optional (rate limiting + revocation disabled when absent)
  UPSTASH_REDIS_REST_URL:   z.string().url("UPSTASH_REDIS_REST_URL must be a valid URL").optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // BullMQ / ioredis — optional (queue jobs fall back to direct async when absent)
  // Accepts redis:// (local) or rediss:// (TLS, e.g. Upstash TCP endpoint)
  REDIS_URL: z.string().url("REDIS_URL must be a valid URL").optional(),
});

export type Env = z.infer<typeof schema>;

function validateEnv(): Env {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const messages = result.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${messages}\n`);
  }
  return result.data;
}

export const env: Env = validateEnv();
