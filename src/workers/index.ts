/**
 * Worker process entry point.
 *
 * Start with:  npm run workers          (development, tsx watch)
 *              npm run workers:start    (production, tsx)
 *
 * This process must run alongside the Next.js server.  It consumes jobs from
 * Redis, processes them with the five queue processors, handles retries, and
 * moves exhausted jobs to the dead-letter queue.
 *
 * Graceful shutdown (SIGTERM / SIGINT):
 *  1. Stop accepting new jobs (worker.close() drains in-progress jobs).
 *  2. Close Queue instances (flush any pending adds).
 *  3. Disconnect ioredis (flush buffers, then quit).
 *  4. Disconnect MongoDB.
 *
 * Note: this file uses dotenv to load .env.local because it runs outside the
 * Next.js runtime which handles env loading automatically.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config(); // fallback to .env

import { Worker, type Job } from "bullmq";
import { connectDB } from "@/lib/db/mongoose";
import { getQueueConnection } from "@/lib/queue/connection";
import { getDeadLetterQueue, QUEUE_NAMES } from "@/lib/queue/queues";
import type { DeadLetterJobData } from "@/lib/queue/types";
import { processEmailJob }                from "@/workers/processors/email.processor";
import { processStockJob }                from "@/workers/processors/stock.processor";
import { processPayoutJob }               from "@/workers/processors/payout.processor";
import { processVendorNotificationJob }   from "@/workers/processors/vendor.processor";
import { processAnalyticsJob }            from "@/workers/processors/analytics.processor";
import logger from "@/lib/logger";

// ── Connection guard ──────────────────────────────────────────────────────────

const _rawConn = getQueueConnection();
if (!_rawConn) {
  logger.error("[workers] REDIS_URL is not set — workers cannot start. Set REDIS_URL in .env.local");
  process.exit(1);
}
// Reassign as non-nullable after the guard so TypeScript narrows correctly.
// process.exit() returns never but tsc doesn't always narrow across module scope.
const connection = _rawConn;

// ── Connect to MongoDB ────────────────────────────────────────────────────────

await connectDB();
logger.info("[workers] MongoDB connected");

// ── Worker concurrency ────────────────────────────────────────────────────────

const CONCURRENCY = {
  email:    5, // nodemailer is I/O-bound; 5 parallel sends are safe
  vendor:   3,
  stock:    3, // MongoDB writes; moderate concurrency
  payout:   2, // financial — conservative
  analytics: 5,
} as const;

// ── Dead-letter helper ────────────────────────────────────────────────────────

async function moveToDeadLetter(
  queueName: string,
  job: Job,
  err: Error,
): Promise<void> {
  try {
    const dlq = getDeadLetterQueue();
    if (!dlq) return;

    const dlqData: DeadLetterJobData = {
      originalQueue:   queueName,
      originalJobName: job.name,
      originalJobId:   job.id ?? "unknown",
      data:            job.data,
      error:           err.message,
      failedAt:        new Date().toISOString(),
      attemptsMade:    job.attemptsMade,
    };

    await dlq.add("dead-letter", dlqData, {
      removeOnComplete: { count: 10_000 },
      removeOnFail:     false,
    });

    logger.error(
      { queueName, jobId: job.id, jobName: job.name, error: err.message, attemptsMade: job.attemptsMade },
      "[workers] Job moved to dead-letter queue after exhausting retries",
    );
  } catch (dlqErr) {
    logger.error({ dlqErr }, "[workers] Failed to move job to dead-letter queue");
  }
}

// ── Worker factory ────────────────────────────────────────────────────────────

function makeWorker<T>(
  queueName: string,
  concurrency: number,
  processor: (job: Job<T>) => Promise<void>,
): Worker<T> {
  const worker = new Worker<T>(queueName, processor, { connection, concurrency });

  worker.on("completed", (job) => {
    logger.debug({ jobId: job.id, jobName: job.name, queue: queueName }, "[workers] Job completed");
  });

  worker.on("failed", async (job, err) => {
    if (!job) return;

    const maxAttempts = job.opts.attempts ?? 1;
    logger.error(
      { jobId: job.id, jobName: job.name, queue: queueName, error: err.message, attempt: job.attemptsMade, maxAttempts },
      "[workers] Job failed",
    );

    if (job.attemptsMade >= maxAttempts) {
      await moveToDeadLetter(queueName, job, err);
    }
  });

  worker.on("error", (err) => {
    logger.error({ err, queue: queueName }, "[workers] Worker error");
  });

  worker.on("stalled", (jobId) => {
    logger.warn({ jobId, queue: queueName }, "[workers] Job stalled — will be retried");
  });

  return worker;
}

// ── Instantiate workers ───────────────────────────────────────────────────────

const emailWorker   = makeWorker(QUEUE_NAMES.EMAIL,                CONCURRENCY.email,     processEmailJob);
const vendorWorker  = makeWorker(QUEUE_NAMES.VENDOR_NOTIFICATIONS, CONCURRENCY.vendor,    processVendorNotificationJob);
const stockWorker   = makeWorker(QUEUE_NAMES.STOCK_UPDATES,        CONCURRENCY.stock,     processStockJob);
const payoutWorker  = makeWorker(QUEUE_NAMES.PAYOUT,               CONCURRENCY.payout,    processPayoutJob);
const analyticsWorker = makeWorker(QUEUE_NAMES.ANALYTICS,          CONCURRENCY.analytics, processAnalyticsJob);

const allWorkers = [emailWorker, vendorWorker, stockWorker, payoutWorker, analyticsWorker];

logger.info(
  { queues: Object.values(QUEUE_NAMES).filter((n) => n !== QUEUE_NAMES.DEAD_LETTER) },
  "[workers] All workers started",
);

// ── Graceful shutdown ─────────────────────────────────────────────────────────

let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, "[workers] Graceful shutdown initiated");

  try {
    // 1. Stop workers from picking up new jobs; wait for in-progress to finish.
    await Promise.all(allWorkers.map((w) => w.close()));
    logger.info("[workers] All workers drained and closed");

    // 2. Disconnect ioredis.
    await connection.quit();
    logger.info("[workers] Redis disconnected");

  } catch (err) {
    logger.error({ err }, "[workers] Error during shutdown");
  } finally {
    process.exit(0);
  }
}

process.on("SIGTERM", () => { void gracefulShutdown("SIGTERM"); });
process.on("SIGINT",  () => { void gracefulShutdown("SIGINT");  });

// Unhandled rejections in worker callbacks must not crash the process silently.
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "[workers] Unhandled promise rejection");
});
