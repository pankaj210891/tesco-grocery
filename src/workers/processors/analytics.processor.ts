/**
 * Analytics queue processor.
 *
 * Currently logs structured events via pino so they appear in the application
 * log stream.  This processor is the extension point for future integrations
 * (Segment, Mixpanel, custom MongoDB analytics collection, etc.) — add the
 * integration here without touching the producer side.
 */

import type { Job } from "bullmq";
import type { AnalyticsEventJobData } from "@/lib/queue/types";
import logger from "@/lib/logger";

export async function processAnalyticsJob(job: Job<AnalyticsEventJobData>): Promise<void> {
  const { event, userId, properties, timestamp } = job.data;

  // Structured log — parsed by any log aggregator (Datadog, CloudWatch, etc.)
  logger.info(
    { jobId: job.id, event, userId, properties, timestamp },
    "[analytics] Event recorded",
  );

  // ── Extension point ──────────────────────────────────────────────────────
  // Uncomment and implement when an analytics provider is added:
  //
  // await segmentClient.track({ userId, event, properties, timestamp });
  // await mixpanel.track(event, { distinct_id: userId, ...properties });
  //
  // Or store in MongoDB:
  // await AnalyticsEventModel.create({ event, userId, properties, timestamp });
}
