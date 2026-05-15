import { transporter, FROM_ADDRESS } from "@/lib/email/mailer";
import { sendOrderStatus } from "@/services/email.service";

const TEST_RECIPIENTS = ["pankaj.mundra@prakashinfotech.com", "pankajmundra@outlook.com"];

export async function GET() {
  const config = {
    host:    process.env.SMTP_HOST,
    port:    process.env.SMTP_PORT,
    user:    process.env.SMTP_USER,
    passLen: process.env.SMTP_PASS?.length,
    from:    FROM_ADDRESS,
  };

  const results: Record<string, unknown> = {};

  // 1. Verify SMTP connection
  try {
    await transporter.verify();
    results.verify = "ok";
  } catch (err) {
    results.verify = err instanceof Error ? err.message : err;
    return Response.json({ success: false, step: "verify", config, results }, { status: 500 });
  }

  // 2. Raw transporter test
  try {
    await transporter.sendMail({
      from:    FROM_ADDRESS,
      to:      TEST_RECIPIENTS,
      subject: "Test email — Prakash Supermarket",
      html:    "<p>SMTP is working correctly.</p>",
    });
    results.rawSend = "ok";
  } catch (err) {
    results.rawSend = err instanceof Error ? err.message : err;
  }

  // 3. sendOrderStatus template test
  try {
    for (const to of TEST_RECIPIENTS) {
      await sendOrderStatus(to, {
        orderNumber:  "ORD-TEST-001",
        customerName: "Test Customer",
        newStatus:    "shipped",
        total:        499,
      });
    }
    results.sendOrderStatus = "ok";
  } catch (err) {
    results.sendOrderStatus = err instanceof Error ? err.message : err;
  }

  return Response.json({ success: true, config, results });
}
