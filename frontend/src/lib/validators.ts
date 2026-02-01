// frontend/src/lib/validators.ts
import { z } from "zod";

const passwordSchema = z.string()
    .min(8, "Minimum 8 characters")
    .max(72, "Password too long")
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number")
    .regex(/[^a-zA-Z0-9]/, "Must contain a special character");

export const registerSchema = z.object({
    email: z.string().trim().toLowerCase().email("Invalid email").max(254),
    password: passwordSchema,
});

export const loginSchema = z.object({
    email: z.string().email("Invalid email"),
    password: z.string().min(1, "Password is required"), // Keep login simple, let backend handle actual verification
});

export const urlSchema = z.object({
    longUrl: z.string().url("Please enter a valid URL"),
    customAlias: z.string()
        .min(3, "Alias must be at least 3 chars")
        .max(50, "Alias too long")
        .regex(/^[a-zA-Z0-9_-]*$/, "Only letters, numbers, - and _")
        .optional()
        .or(z.literal("")),
});