import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const FROM_ADDRESS = `"${process.env.MAIL_FROM_NAME ?? "Prakash Supermarket"}" <${process.env.MAIL_FROM_EMAIL ?? "noreply@prakashsupermarket.com"}>`;
