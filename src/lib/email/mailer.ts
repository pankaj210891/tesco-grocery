import nodemailer from "nodemailer";

const port = Number(process.env.SMTP_PORT ?? 587);

export const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST ?? "smtp.gmail.com",
  port,
  secure: port === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const FROM_ADDRESS = `"${process.env.MAIL_FROM_NAME ?? "Prakash Supermarket"}" <${process.env.MAIL_FROM_EMAIL ?? "noreply@prakashsupermarket.com"}>`;
