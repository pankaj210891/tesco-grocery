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
        <td style="text-align:right">₹${(i.price * i.quantity).toFixed(2)}</td>
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
         <tfoot><tr class="total-row"><td colspan="2">Total</td><td style="text-align:right">₹${d.total.toFixed(2)}</td></tr></tfoot>
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
     <p><strong>Order Total:</strong> ₹${d.total.toFixed(2)}</p>
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
