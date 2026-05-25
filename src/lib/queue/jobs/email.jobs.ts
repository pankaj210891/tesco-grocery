/**
 * Email job producers.
 *
 * Each function enqueues an email job through BullMQ when Redis is available.
 * When Redis is not configured (REDIS_URL absent) the call falls back to the
 * existing direct nodemailer send — preserving the pre-BullMQ behaviour so
 * development environments without Redis work unmodified.
 *
 * Retry policy: 3 attempts with exponential back-off (1 s → 2 s → 4 s).
 * Jobs that exhaust all retries are moved to the dead-letter queue by the worker.
 */

import { getEmailQueue } from "@/lib/queue/queues";
import type { EmailJobData, EmailJobName } from "@/lib/queue/types";
import type {
  OrderConfirmationData,
  OrderStatusData,
  OrderCancellationData,
  RefundConfirmedData,
  WelcomeData,
  PasswordResetData,
  VendorInviteData,
  VendorApprovedData,
  VendorNewOrderData,
  VendorOrderStatusData,
  VendorPayoutData,
} from "@/lib/email/templates";
import logger from "@/lib/logger";

const EMAIL_JOB_OPTIONS = {
  attempts: 3,
  backoff:  { type: "exponential" as const, delay: 1_000 },
} as const;

// ── Internal helper ───────────────────────────────────────────────────────────

async function enqueue(
  templateType: EmailJobName,
  to: string,
  payload: EmailJobData["payload"],
): Promise<void> {
  const queue = getEmailQueue();

  if (!queue) {
    // Fallback: direct send (existing behaviour, no queue).
    const svc = await import("@/services/email.service");
    void (async () => {
      try {
        switch (templateType) {
          case "send-order-confirmation":   await svc.sendOrderConfirmation(to,   payload as OrderConfirmationData);   break;
          case "send-order-status":         await svc.sendOrderStatus(to,         payload as OrderStatusData);         break;
          case "send-welcome":              await svc.sendWelcome(to,             payload as WelcomeData);             break;
          case "send-password-reset":       await svc.sendPasswordReset(to,       payload as PasswordResetData);       break;
          case "send-order-cancellation":   await svc.sendOrderCancellation(to,   payload as OrderCancellationData);   break;
          case "send-refund-confirmed":     await svc.sendRefundConfirmed(to,     payload as RefundConfirmedData);     break;
          case "send-vendor-invite":        await svc.sendVendorInvite(to,        payload as VendorInviteData);        break;
          case "send-vendor-approved":      await svc.sendVendorApproved(to,      payload as VendorApprovedData);      break;
          case "send-vendor-new-order":     await svc.sendVendorNewOrder(to,      payload as VendorNewOrderData);      break;
          case "send-vendor-order-status":  await svc.sendVendorOrderStatus(to,   payload as VendorOrderStatusData);   break;
          case "send-vendor-payout":        await svc.sendVendorPayout(to,        payload as VendorPayoutData);        break;
        }
      } catch (err) {
        logger.error({ err, templateType, to }, "[email.jobs] Fallback direct send failed");
      }
    })();
    return;
  }

  try {
    await queue.add(templateType, { to, templateType, payload }, EMAIL_JOB_OPTIONS);
  } catch (err) {
    logger.error({ err, templateType, to }, "[email.jobs] Failed to enqueue — falling back to direct send");
    // Enqueue failed (Redis down mid-request): fall back to direct send.
    const svc = await import("@/services/email.service");
    void (async () => {
      try {
        switch (templateType) {
          case "send-order-confirmation":   await svc.sendOrderConfirmation(to,   payload as OrderConfirmationData);   break;
          case "send-order-status":         await svc.sendOrderStatus(to,         payload as OrderStatusData);         break;
          case "send-welcome":              await svc.sendWelcome(to,             payload as WelcomeData);             break;
          case "send-password-reset":       await svc.sendPasswordReset(to,       payload as PasswordResetData);       break;
          case "send-order-cancellation":   await svc.sendOrderCancellation(to,   payload as OrderCancellationData);   break;
          case "send-refund-confirmed":     await svc.sendRefundConfirmed(to,     payload as RefundConfirmedData);     break;
          case "send-vendor-invite":        await svc.sendVendorInvite(to,        payload as VendorInviteData);        break;
          case "send-vendor-approved":      await svc.sendVendorApproved(to,      payload as VendorApprovedData);      break;
          case "send-vendor-new-order":     await svc.sendVendorNewOrder(to,      payload as VendorNewOrderData);      break;
          case "send-vendor-order-status":  await svc.sendVendorOrderStatus(to,   payload as VendorOrderStatusData);   break;
          case "send-vendor-payout":        await svc.sendVendorPayout(to,        payload as VendorPayoutData);        break;
        }
      } catch (fallbackErr) {
        logger.error({ fallbackErr, templateType, to }, "[email.jobs] Fallback also failed");
      }
    })();
  }
}

// ── Public enqueue functions (one per email type) ─────────────────────────────

export const enqueueOrderConfirmation  = (to: string, data: OrderConfirmationData):  Promise<void> => enqueue("send-order-confirmation",  to, data);
export const enqueueOrderStatus        = (to: string, data: OrderStatusData):        Promise<void> => enqueue("send-order-status",         to, data);
export const enqueueWelcome            = (to: string, data: WelcomeData):            Promise<void> => enqueue("send-welcome",              to, data);
export const enqueuePasswordReset      = (to: string, data: PasswordResetData):      Promise<void> => enqueue("send-password-reset",       to, data);
export const enqueueOrderCancellation  = (to: string, data: OrderCancellationData):  Promise<void> => enqueue("send-order-cancellation",   to, data);
export const enqueueRefundConfirmed    = (to: string, data: RefundConfirmedData):    Promise<void> => enqueue("send-refund-confirmed",     to, data);
export const enqueueVendorInvite       = (to: string, data: VendorInviteData):       Promise<void> => enqueue("send-vendor-invite",        to, data);
export const enqueueVendorApproved     = (to: string, data: VendorApprovedData):     Promise<void> => enqueue("send-vendor-approved",      to, data);
export const enqueueVendorNewOrder     = (to: string, data: VendorNewOrderData):     Promise<void> => enqueue("send-vendor-new-order",     to, data);
export const enqueueVendorOrderStatus  = (to: string, data: VendorOrderStatusData):  Promise<void> => enqueue("send-vendor-order-status",  to, data);
export const enqueueVendorPayout       = (to: string, data: VendorPayoutData):       Promise<void> => enqueue("send-vendor-payout",        to, data);
