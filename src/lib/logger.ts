import pino from "pino";

// Paths whose values are replaced with "[REDACTED]" in all log output.
// Uses pino's dot-notation and wildcard support.
const REDACTED_PATHS = [
  "password",
  "token",
  "refreshToken",
  "secret",
  "otp",
  "phoneOtp",
  "passwordResetToken",
  "req.headers.authorization",
  "req.headers.cookie",
  "*.password",
  "*.token",
  "*.secret",
];

const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  redact: { paths: REDACTED_PATHS, censor: "[REDACTED]" },
  // In production, emit structured JSON so log aggregators (Datadog, CloudWatch)
  // can parse fields directly. In dev, keep the same format for consistency.
  timestamp: pino.stdTimeFunctions.isoTime,
  base: { service: process.env.NEXT_PUBLIC_APP_NAME ?? "tesco-grocery" },
});

export default logger;
