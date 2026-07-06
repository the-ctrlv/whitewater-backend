import { z } from "zod";
import { Router } from "express";
import {
  forgotPassword,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  resetPassword,
} from "../services/auth.service";
import {
  forgotPasswordSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  resetPasswordSchema,
} from "../schemas/auth.schema";
import { authMiddleware, AuthRequest } from "../middleware/auth.middleware";
import prisma from "../prismaClient";
import { authLimiter } from "../middleware/rateLimit.middleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post(
  "/register",
  authLimiter,
  asyncHandler(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: z.flattenError(parsed.error) });
    }

    await registerUser(parsed.data);
    res.status(201).json({ message: "User registered successfully" });
  }),
);

router.post(
  "/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      return res.status(400).json({ message: z.flattenError(parsed.error) });
    }

    const { accessToken, refreshToken } = await loginUser(email, password);
    res.status(200).json({ accessToken, refreshToken });
  }),
);

router.post(
  "/refresh",
  authLimiter,
  asyncHandler(async (req, res) => {
    const parsed = refreshTokenSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: z.flattenError(parsed.error) });
    }

    const { accessToken, refreshToken } = await refreshAccessToken(
      parsed.data.refreshToken,
    );
    res.status(200).json({ accessToken, refreshToken });
  }),
);

router.post(
  "/logout",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res) => {
    await logoutUser(req.userId!);
    res.status(200).json({ message: "Logged out successfully" });
  }),
);

router.post(
  "/forgot-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    const parsed = forgotPasswordSchema.safeParse({ email });

    if (!parsed.success) {
      return res.status(400).json({ message: z.flattenError(parsed.error) });
    }

    await forgotPassword(email);
    res.status(200).json({
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  }),
);

router.post(
  "/reset-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    const parsed = resetPasswordSchema.safeParse({ token, password });
    if (!parsed.success) {
      return res.status(400).json({ message: z.flattenError(parsed.error) });
    }

    await resetPassword(token, password);
    res.status(200).json({ message: "Password reset successfully" });
  }),
);

router.get(
  "/me",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        nickname: true,
        age: true,
        gender: true,
        discipline: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  }),
);

export default router;
