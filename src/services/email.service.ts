import { transporter, FROM_ADDRESS } from "@/lib/email/mailer";
import {
  orderConfirmationTemplate,
  orderStatusTemplate,
  orderCancellationTemplate,
  refundConfirmedTemplate,
  welcomeTemplate,
  passwordResetTemplate,
  vendorInviteTemplate,
  vendorApprovedTemplate,
  vendorNewOrderTemplate,
  vendorOrderStatusTemplate,
  vendorPayoutTemplate,
  type OrderConfirmationData,
  type OrderStatusData,
  type OrderCancellationData,
  type RefundConfirmedData,
  type WelcomeData,
  type PasswordResetData,
  type VendorInviteData,
  type VendorApprovedData,
  type VendorNewOrderData,
  type VendorOrderStatusData,
  type VendorPayoutData,
} from "@/lib/email/templates";

async function send(to: string, subject: string, html: string): Promise<void> {
  try {
    await transporter.sendMail({ from: FROM_ADDRESS, to, subject, html });
  } catch (err) {
    console.error("[email] Failed to send email to", to, err);
  }
}

export async function sendOrderConfirmation(to: string, data: OrderConfirmationData): Promise<void> {
  const { subject, html } = orderConfirmationTemplate(data);
  await send(to, subject, html);
}

export async function sendOrderStatus(to: string, data: OrderStatusData): Promise<void> {
  const { subject, html } = orderStatusTemplate(data);
  await send(to, subject, html);
}

export async function sendWelcome(to: string, data: WelcomeData): Promise<void> {
  const { subject, html } = welcomeTemplate(data);
  await send(to, subject, html);
}

export async function sendPasswordReset(to: string, data: PasswordResetData): Promise<void> {
  const { subject, html } = passwordResetTemplate(data);
  await send(to, subject, html);
}

export async function sendOrderCancellation(to: string, data: OrderCancellationData): Promise<void> {
  const { subject, html } = orderCancellationTemplate(data);
  await send(to, subject, html);
}

export async function sendRefundConfirmed(to: string, data: RefundConfirmedData): Promise<void> {
  const { subject, html } = refundConfirmedTemplate(data);
  await send(to, subject, html);
}

export async function sendVendorInvite(to: string, data: VendorInviteData): Promise<void> {
  const { subject, html } = vendorInviteTemplate(data);
  await send(to, subject, html);
}

export async function sendVendorApproved(to: string, data: VendorApprovedData): Promise<void> {
  const { subject, html } = vendorApprovedTemplate(data);
  await send(to, subject, html);
}

export async function sendVendorNewOrder(to: string, data: VendorNewOrderData): Promise<void> {
  const { subject, html } = vendorNewOrderTemplate(data);
  await send(to, subject, html);
}

export async function sendVendorOrderStatus(to: string, data: VendorOrderStatusData): Promise<void> {
  const { subject, html } = vendorOrderStatusTemplate(data);
  await send(to, subject, html);
}

export async function sendVendorPayout(to: string, data: VendorPayoutData): Promise<void> {
  const { subject, html } = vendorPayoutTemplate(data);
  await send(to, subject, html);
}
