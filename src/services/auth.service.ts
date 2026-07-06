import jwt from "jsonwebtoken";
import prisma from "../prismaClient";
import bcrypt from "bcrypt";
import { Discipline } from "../../generated/prisma/client";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";
import crypto from "crypto";
import { sendResetPasswordEmail } from "../utils/mailer";

export async function registerUser(data: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  nickname?: string;
  age?: number;
  gender?: "MALE" | "FEMALE";
  discipline?: Discipline[];
}): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (user) {
    throw new AppError("User already exists", 409);
  }
  const hashedPassword = await bcrypt.hash(data.password, 10);
  await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      nickname: data.nickname,
      age: data.age,
      gender: data.gender,
      discipline: data.discipline,
    },
  });
}

function generateAccessToken(userId: string): string {
  return jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: "15m" });
}

function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId }, env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError("Invalid email or password", 401);
  }

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: hashToken(refreshToken) },
  });

  return { user, accessToken, refreshToken };
}

export async function refreshAccessToken(refreshToken: string) {
  let decoded: { userId: string };
  try {
    decoded = jwt.verify(refreshToken, env.REFRESH_TOKEN_SECRET) as {
      userId: string;
    };
  } catch {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  if (!user || user.refreshToken !== hashToken(refreshToken)) {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  const accessToken = generateAccessToken(user.id);
  const newRefreshToken = generateRefreshToken(user.id);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: hashToken(newRefreshToken) },
  });

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logoutUser(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null },
  });
}

export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return;
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");
  const expiry = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.user.update({
    where: { email },
    data: {
      resetToken: hashedToken,
      resetTokenExpiry: expiry,
    },
  });

  await sendResetPasswordEmail(email, rawToken);
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await prisma.user.findFirst({
    where: {
      resetToken: hashedToken,
      resetTokenExpiry: { gt: new Date() },
    },
  });

  if (!user) {
    throw new AppError("Invalid or expired token", 400);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });
}
