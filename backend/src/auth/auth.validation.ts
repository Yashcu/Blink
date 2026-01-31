// src/auth/auth.validation.ts
import { z } from 'zod';
import { AUTH_CONSTRAINTS } from '../shared/constraints';

export const registerSchema = z.object({
    email: z
        .string()
        .trim()
        .toLowerCase()
        .email('Invalid email format')
        .max(AUTH_CONSTRAINTS.EMAIL_MAX_LENGTH, 'Email too long'),
    password: z
        .string()
        .min(AUTH_CONSTRAINTS.PASSWORD_MIN_LENGTH)
        .max(AUTH_CONSTRAINTS.PASSWORD_MAX_LENGTH)
        .regex(/[a-z]/, 'Password must contain a lowercase letter')
        .regex(/[A-Z]/, 'Password must contain an uppercase letter')
        .regex(/[0-9]/, 'Password must contain a number')
        .regex(/[^a-zA-Z0-9]/, 'Password must contain a special character'),
});

export const loginSchema = z.object({
    email: z
        .string()
        .trim()
        .toLowerCase()
        .email('Invalid email format')
        .max(AUTH_CONSTRAINTS.EMAIL_MAX_LENGTH, 'Email too long'),
    password: z
        .string()
        .min(AUTH_CONSTRAINTS.PASSWORD_MIN_LENGTH)
        .max(AUTH_CONSTRAINTS.PASSWORD_MAX_LENGTH)
        .regex(/[a-z]/, 'Password must contain a lowercase letter')
        .regex(/[A-Z]/, 'Password must contain an uppercase letter')
        .regex(/[0-9]/, 'Password must contain a number')
        .regex(/[^a-zA-Z0-9]/, 'Password must contain a special character'),
});

export function validate<T>(schema: z.ZodType<T>, data: unknown): T {
    return schema.parse(data);
}
