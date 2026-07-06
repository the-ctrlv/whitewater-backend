import nodemailer from "nodemailer";
import { env } from "../config/env";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export async function sendResetPasswordEmail(to: string, token: string) {
  const resetLink = `${env.FRONTEND_URL}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: env.SMTP_USER,
    to,
    subject: "Password reset",
    html: `<p>Click the link below to reset your password:</p><a href="${resetLink}">${resetLink}</a><p>This link expires in 1 hour.</p>`,
  });
}
