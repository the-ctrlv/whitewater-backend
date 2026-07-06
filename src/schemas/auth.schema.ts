import { z } from "zod";

export const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  firstName: z
    .string()
    .min(2, "First name must be at least 2 characters long")
    .max(20, "First name must be less than 20 characters long"),
  lastName: z
    .string()
    .min(2, "Last name must be at least 2 characters long")
    .max(20, "Last name must be less than 20 characters long"),
  nickname: z
    .string()
    .min(2, "Nickname must be at least 2 characters long")
    .max(20, "Nickname must be less than 20 characters long"),
  age: z.number().min(0, "Age must be a positive number"),
  gender: z.enum(["MALE", "FEMALE"]),
  discipline: z.array(z.enum(["SURFING", "KITE_SURFING", "YACHTING"])),
});

export const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});
