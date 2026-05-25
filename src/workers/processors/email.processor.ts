/**
 * Email queue processor.
 * Reads the `templateType` discriminator from the job data and dispatches
 * to the appropriate email service function.
 */

import type { Job } from "bullmq";
import type { EmailJobData } from "@/lib/queue/types";
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

export async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const { to, templateType, payload } = job.data;

  logger.info({ jobId: job.id, templateType, to }, "[email.processor] Processing email job");

  const svc = await import("@/services/email.service");

  switch (templateType) {
    case "send-order-confirmation":
      await svc.sendOrderConfirmation(to, payload as OrderConfirmationData);
      break;
    case "send-order-status":
      await svc.sendOrderStatus(to, payload as OrderStatusData);
      break;
    case "send-welcome":
      await svc.sendWelcome(to, payload as WelcomeData);
      break;
    case "send-password-reset":
      await svc.sendPasswordReset(to, payload as PasswordResetData);
      break;
    case "send-order-cancellation":
      await svc.sendOrderCancellation(to, payload as OrderCancellationData);
      break;
    case "send-refund-confirmed":
      await svc.sendRefundConfirmed(to, payload as RefundConfirmedData);
      break;
    case "send-vendor-invite":
      await svc.sendVendorInvite(to, payload as VendorInviteData);
      break;
    case "send-vendor-approved":
      await svc.sendVendorApproved(to, payload as VendorApprovedData);
      break;
    case "send-vendor-new-order":
      await svc.sendVendorNewOrder(to, payload as VendorNewOrderData);
      break;
    case "send-vendor-order-status":
      await svc.sendVendorOrderStatus(to, payload as VendorOrderStatusData);
      break;
    case "send-vendor-payout":
      await svc.sendVendorPayout(to, payload as VendorPayoutData);
      break;
    default: {
      const exhaustive: never = templateType;
      logger.error({ templateType: exhaustive }, "[email.processor] Unknown templateType — job discarded");
    }
  }

  logger.info({ jobId: job.id, templateType, to }, "[email.processor] Email job completed");
}
