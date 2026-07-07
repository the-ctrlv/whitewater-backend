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

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName, nickname, age, gender, discipline]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               nickname: { type: string }
 *               age: { type: number }
 *               gender: { type: string, enum: [MALE, FEMALE] }
 *               discipline:
 *                 type: array
 *                 items: { type: string, enum: [SURFING, KITE_SURFING, YACHTING] }
 *     responses:
 *       201: { description: User registered successfully }
 *       400: { description: Validation error }
 *       409: { description: User already exists }
 */
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

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Log in and receive an access + refresh token pair
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *                 refreshToken: { type: string }
 *       400: { description: Validation error }
 *       401: { description: Invalid email or password }
 */
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

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Exchange a refresh token for a new access + refresh token pair (rotates the refresh token)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: New token pair issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *                 refreshToken: { type: string }
 *       400: { description: Validation error }
 *       401: { description: Invalid or expired refresh token }
 */
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

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Log out (revokes the stored refresh token for this user)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Logged out successfully }
 *       401: { description: Missing or invalid access token }
 */
router.post(
  "/logout",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res) => {
    await logoutUser(req.userId!);
    res.status(200).json({ message: "Logged out successfully" });
  }),
);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     summary: Request a password reset email
 *     description: Always returns 200 with the same message, regardless of whether the email exists, to avoid leaking which emails are registered.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200: { description: If an account with that email exists, a reset link has been sent }
 *       400: { description: Validation error }
 */
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

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     summary: Reset password using the token emailed by /auth/forgot-password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: string }
 *               password: { type: string, minLength: 8 }
 *     responses:
 *       200: { description: Password reset successfully }
 *       400: { description: Validation error, or invalid/expired token }
 */
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

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Get the current authenticated user's profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string }
 *                 email: { type: string }
 *                 firstName: { type: string, nullable: true }
 *                 lastName: { type: string, nullable: true }
 *                 nickname: { type: string, nullable: true }
 *                 age: { type: number, nullable: true }
 *                 gender: { type: string, enum: [MALE, FEMALE], nullable: true }
 *                 discipline:
 *                   type: array
 *                   items: { type: string, enum: [SURFING, KITE_SURFING, YACHTING] }
 *       401: { description: Missing or invalid access token }
 *       404: { description: User not found }
 */
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
