import { formatPrice } from "@/lib/utils/format";

const BRAND_COLOR = "#14532d";
const LOGO_TEXT   = "Prakash Supermarket";

function base(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f4f5; font-family: 'Segoe UI', Arial, sans-serif; }
    .wrapper { max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    .header { background: ${BRAND_COLOR}; padding: 24px 32px; }
    .header h1 { margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: .5px; }
    .body { padding: 32px; color: #374151; font-size: 15px; line-height: 1.6; }
    .body h2 { margin: 0 0 16px; font-size: 18px; color: #111827; }
    .body p { margin: 0 0 12px; }
    .table-wrap { overflow-x: auto; }
    table.items { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
    table.items th { background: #f9fafb; color: #6b7280; text-align: left; padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
    table.items td { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; color: #374151; }
    .total-row td { font-weight: 700; color: #111827; border-top: 2px solid #e5e7eb; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 13px; font-weight: 600; background: #dcfce7; color: ${BRAND_COLOR}; }
    .otp-box { display: inline-block; margin: 16px 0; padding: 12px 32px; background: #f0fdf4; border: 2px dashed ${BRAND_COLOR}; border-radius: 8px; font-size: 28px; font-weight: 700; letter-spacing: 8px; color: ${BRAND_COLOR}; }
    .footer { padding: 16px 32px; background: #f9fafb; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
    .btn { display: inline-block; margin-top: 8px; padding: 11px 28px; background: ${BRAND_COLOR}; color: #fff !important; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><h1>${LOGO_TEXT}</h1></div>
    <div class="body">${body}</div>
    <div class="footer">© ${new Date().getFullYear()} ${LOGO_TEXT}. All rights reserved.</div>
  </div>
</body>
</html>`;
}

/* ─── Types ────────────────────────────────────────────────── */

export interface OrderItem {
  name:     string;
  quantity: number;
  price:    number;
}

export interface OrderConfirmationData {
  orderNumber: string;
  customerName: string;
  items:        OrderItem[];
  total:        number;
  paymentMethod: string;
  deliveryAddress: string;
}

export interface OrderStatusData {
  orderNumber:  string;
  customerName: string;
  newStatus:    string;
  total:        number;
}

export interface WelcomeData {
  customerName: string;
}

export interface PasswordResetData {
  customerName: string;
  otp:          string;
  expiresInMin: number;
}

/* ─── Templates ────────────────────────────────────────────── */

export function orderConfirmationTemplate(d: OrderConfirmationData): { subject: string; html: string } {
  const rows = d.items.map(
    (i) =>
      `<tr>
        <td>${i.name}</td>
        <td style="text-align:center">${i.quantity}</td>
        <td style="text-align:right">${formatPrice(i.price * i.quantity)}</td>
      </tr>`,
  ).join("");

  const html = base(
    "Order Confirmed",
    `<h2>Order Confirmed! 🎉</h2>
     <p>Hi ${d.customerName},</p>
     <p>Thank you for your order. We've received it and will start processing it shortly.</p>
     <p><strong>Order Number:</strong> <span class="badge">${d.orderNumber}</span></p>
     <p><strong>Payment:</strong> ${d.paymentMethod}</p>
     <p><strong>Delivery to:</strong> ${d.deliveryAddress}</p>
     <div class="table-wrap">
       <table class="items">
         <thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Amount</th></tr></thead>
         <tbody>${rows}</tbody>
         <tfoot><tr class="total-row"><td colspan="2">Total</td><td style="text-align:right">${formatPrice(d.total)}</td></tr></tfoot>
       </table>
     </div>
     <p>We'll notify you when your order is out for delivery.</p>`,
  );

  return { subject: `Order Confirmed – ${d.orderNumber}`, html };
}

export function orderStatusTemplate(d: OrderStatusData): { subject: string; html: string } {
  const STATUS_LABELS: Record<string, string> = {
    pending:    "Pending",
    processing: "Processing",
    shipped:    "Shipped",
    delivered:  "Delivered",
    cancelled:  "Cancelled",
  };
  const label = STATUS_LABELS[d.newStatus] ?? d.newStatus;

  const html = base(
    "Order Status Update",
    `<h2>Order Status Updated</h2>
     <p>Hi ${d.customerName},</p>
     <p>Your order <strong>${d.orderNumber}</strong> has been updated to:</p>
     <p style="margin:16px 0"><span class="badge" style="font-size:15px">${label}</span></p>
     <p><strong>Order Total:</strong> ${formatPrice(d.total)}</p>
     <p>You can track your order anytime from your account dashboard.</p>`,
  );

  return { subject: `Order ${d.orderNumber} is now ${label}`, html };
}

export function welcomeTemplate(d: WelcomeData): { subject: string; html: string } {
  const html = base(
    "Welcome to Prakash Supermarket",
    `<h2>Welcome, ${d.customerName}! 👋</h2>
     <p>We're thrilled to have you on board at <strong>${LOGO_TEXT}</strong> — your one-stop destination for fresh groceries, household essentials, and much more.</p>
     <p>Here's what you can do right away:</p>
     <ul style="padding-left:20px;margin:12px 0">
       <li>Browse hundreds of products across 21 categories</li>
       <li>Add items to your cart and checkout in seconds</li>
       <li>Track your orders from your account dashboard</li>
       <li>Save your delivery addresses for faster checkout</li>
     </ul>
     <p style="margin-top:20px">Happy shopping!</p>`,
  );

  return { subject: `Welcome to ${LOGO_TEXT}!`, html };
}

export interface OrderCancellationData {
  orderNumber:  string;
  customerName: string;
  total:        number;
  reason?:      string;
  comment?:     string;
  isRefundable: boolean;
}

export interface RefundConfirmedData {
  orderNumber:  string;
  customerName: string;
  total:        number;
}

export function orderCancellationTemplate(d: OrderCancellationData): { subject: string; html: string } {
  const reasonBlock = (d.reason || d.comment)
    ? `<div style="margin:16px 0;padding:14px 16px;background:#fef2f2;border-left:4px solid #ef4444;border-radius:6px;font-size:14px;color:#374151">
        ${d.reason  ? `<p style="margin:0 0 4px"><strong>Reason:</strong> ${d.reason}</p>` : ""}
        ${d.comment ? `<p style="margin:0"><strong>Note:</strong> ${d.comment}</p>`         : ""}
       </div>`
    : "";

  const refundBlock = d.isRefundable
    ? `<p>Since you paid online, a <strong>full refund of ${formatPrice(d.total)}</strong> has been initiated to your original payment method. It will reflect within <strong>5–7 business days</strong>.</p>`
    : `<p>This was a Cash on Delivery order, so no payment was collected — nothing further is required on your end.</p>`;

  const html = base(
    "Order Cancelled",
    `<h2>Your Order Has Been Cancelled</h2>
     <p>Hi ${d.customerName},</p>
     <p>Your order <strong>${d.orderNumber}</strong> has been successfully cancelled.</p>
     ${reasonBlock}
     ${refundBlock}
     <p>We're sorry to see you go. If you have any questions, please reach out to our support team.</p>`,
  );
  return { subject: `Order ${d.orderNumber} Cancelled`, html };
}

export function refundConfirmedTemplate(d: RefundConfirmedData): { subject: string; html: string } {
  const html = base(
    "Refund Confirmed",
    `<h2>Refund Processed Successfully</h2>
     <p>Hi ${d.customerName},</p>
     <p>Great news! Your refund of <strong>${formatPrice(d.total)}</strong> for order <strong>${d.orderNumber}</strong> has been successfully processed.</p>
     <p>The amount should appear in your account within 1–3 business days depending on your bank.</p>
     <p>Thank you for shopping with us — we hope to serve you again soon.</p>`,
  );
  return { subject: `Refund Confirmed for Order ${d.orderNumber}`, html };
}

export interface VendorInviteData {
  contactName:  string;
  businessName: string;
  inviteUrl:    string;
  expiresInHrs: number;
}

export function vendorInviteTemplate(d: VendorInviteData): { subject: string; html: string } {
  const html = base(
    "You're Invited to Sell on Prakash Supermarket",
    `<h2>Welcome to Our Seller Network! 🎉</h2>
     <p>Hi ${d.contactName},</p>
     <p>You've been invited to join <strong>${LOGO_TEXT}</strong> as a verified seller. Start listing your products and reach thousands of customers today.</p>
     <div style="margin:24px 0;padding:20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px">
       <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#166534;text-transform:uppercase;letter-spacing:.5px">Business Name</p>
       <p style="margin:0;font-size:18px;font-weight:700;color:#14532d">${d.businessName}</p>
     </div>
     <p>Click the button below to set up your seller account. This invite link is valid for <strong>${d.expiresInHrs} hours</strong>.</p>
     <p style="text-align:center;margin:28px 0">
       <a href="${d.inviteUrl}" class="btn" style="background:#14532d;color:#fff;padding:14px 36px;border-radius:6px;font-size:15px;font-weight:700;text-decoration:none;display:inline-block">
         Complete Your Seller Onboarding
       </a>
     </p>
     <p style="font-size:13px;color:#6b7280">If the button doesn't work, copy and paste this link into your browser:</p>
     <p style="font-size:12px;color:#9ca3af;word-break:break-all">${d.inviteUrl}</p>
     <p style="font-size:13px;color:#6b7280;margin-top:20px">If you did not expect this invitation, you can safely ignore this email.</p>`,
  );

  return { subject: `You're invited to sell on ${LOGO_TEXT}`, html };
}

export interface VendorApprovedData {
  vendorName:   string;
  businessName: string;
  dashboardUrl: string;
}

export function vendorApprovedTemplate(d: VendorApprovedData): { subject: string; html: string } {
  const html = base(
    "Your Seller Account is Approved",
    `<h2>Congratulations! Your store is live 🚀</h2>
     <p>Hi ${d.vendorName},</p>
     <p>Great news! Your seller account for <strong>${d.businessName}</strong> has been reviewed and approved by our team.</p>
     <p>You can now log in to your seller dashboard and start listing your products.</p>
     <p style="text-align:center;margin:28px 0">
       <a href="${d.dashboardUrl}" class="btn" style="background:#14532d;color:#fff;padding:14px 36px;border-radius:6px;font-size:15px;font-weight:700;text-decoration:none;display:inline-block">
         Go to Seller Dashboard
       </a>
     </p>
     <p style="font-size:13px;color:#6b7280">Welcome to the Prakash Supermarket seller community. Our team is here to help you grow your business.</p>`,
  );

  return { subject: `Your seller account for ${d.businessName} is approved!`, html };
}

export interface PhoneVerificationData {
  customerName: string;
  phone:        string;
  otp:          string;
  expiresInMin: number;
}

export function phoneVerificationTemplate(d: PhoneVerificationData): { subject: string; html: string } {
  const masked = d.phone.slice(0, -4).replace(/\d/g, "•") + d.phone.slice(-4);
  const html = base(
    "Phone Verification OTP",
    `<h2>Verify Your Phone Number</h2>
     <p>Hi ${d.customerName},</p>
     <p>Use the OTP below to verify your phone number <strong>${masked}</strong>:</p>
     <div style="text-align:center"><div class="otp-box">${d.otp}</div></div>
     <p style="text-align:center;color:#6b7280;font-size:13px">This OTP expires in <strong>${d.expiresInMin} minutes</strong>.</p>
     <p>If you did not request this, please ignore this email — your account remains secure.</p>`,
  );
  return { subject: "Phone Verification OTP – Prakash Supermarket", html };
}

export function passwordResetTemplate(d: PasswordResetData): { subject: string; html: string } {
  const html = base(
    "Password Reset OTP",
    `<h2>Reset Your Password</h2>
     <p>Hi ${d.customerName},</p>
     <p>We received a request to reset your password. Use the OTP below to proceed:</p>
     <div style="text-align:center"><div class="otp-box">${d.otp}</div></div>
     <p style="text-align:center;color:#6b7280;font-size:13px">This OTP expires in <strong>${d.expiresInMin} minutes</strong>.</p>
     <p>If you did not request a password reset, you can safely ignore this email — your account remains secure.</p>`,
  );

  return { subject: "Your Password Reset OTP", html };
}

// ─── Vendor Notification Templates ───────────────────────────────────────────

export interface VendorNewOrderData {
  vendorName:        string;
  vendorOrderId:     string;
  parentOrderNumber: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  subtotal:          number;
  dashboardUrl:      string;
}

export function vendorNewOrderTemplate(d: VendorNewOrderData): { subject: string; html: string } {
  const rows = d.items.map(
    (i) => `<tr>
      <td>${i.name}</td>
      <td style="text-align:center">${i.quantity}</td>
      <td style="text-align:right">${formatPrice(i.price * i.quantity)}</td>
    </tr>`,
  ).join("");

  const html = base(
    "New Order Received",
    `<h2>New Order Received! 🛒</h2>
     <p>Hi ${d.vendorName},</p>
     <p>You have a new order waiting for your confirmation. Please accept or reject it within 24 hours.</p>
     <p><strong>Order:</strong> <span class="badge">${d.parentOrderNumber}</span></p>
     <div class="table-wrap">
       <table class="items">
         <thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Amount</th></tr></thead>
         <tbody>${rows}</tbody>
         <tfoot><tr class="total-row"><td colspan="2">Your Earning</td><td style="text-align:right">${formatPrice(d.subtotal)}</td></tr></tfoot>
       </table>
     </div>
     <p style="text-align:center;margin:24px 0">
       <a href="${d.dashboardUrl}" class="btn">View Order in Dashboard</a>
     </p>
     <p style="font-size:13px;color:#6b7280">Please process this order promptly to maintain your seller rating.</p>`,
  );

  return { subject: `New Order ${d.parentOrderNumber} — Action Required`, html };
}

export interface VendorOrderStatusData {
  vendorName:        string;
  parentOrderNumber: string;
  newStatus:         string;
  note?:             string;
}

export function vendorOrderStatusTemplate(d: VendorOrderStatusData): { subject: string; html: string } {
  const html = base(
    "Order Status Update",
    `<h2>Order Status Updated</h2>
     <p>Hi ${d.vendorName},</p>
     <p>The status of order <strong>${d.parentOrderNumber}</strong> has been updated to:</p>
     <p style="margin:16px 0"><span class="badge" style="font-size:15px">${d.newStatus}</span></p>
     ${d.note ? `<p><strong>Note:</strong> ${d.note}</p>` : ""}
     <p>Log in to your dashboard to view the full order details.</p>`,
  );

  return { subject: `Order ${d.parentOrderNumber} — Status: ${d.newStatus}`, html };
}

export interface VendorPayoutData {
  vendorName:    string;
  amount:        number;
  payoutRef:     string;
  orderNumbers:  string[];
}

export function vendorPayoutTemplate(d: VendorPayoutData): { subject: string; html: string } {
  const html = base(
    "Payout Processed",
    `<h2>Payout Processed 💰</h2>
     <p>Hi ${d.vendorName},</p>
     <p>Great news! A payout of <strong>${formatPrice(d.amount)}</strong> has been released to your registered bank account.</p>
     <p><strong>Payout Reference:</strong> ${d.payoutRef}</p>
     <p><strong>Orders covered:</strong> ${d.orderNumbers.join(", ")}</p>
     <p>The amount should reflect in your account within 1–3 business days depending on your bank.</p>
     <p style="font-size:13px;color:#6b7280">If you have any questions about this payout, please contact our seller support team.</p>`,
  );

  return { subject: `Payout of ${formatPrice(d.amount)} Processed`, html };
}
