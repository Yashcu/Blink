// src/auth/auth.validation.ts
import { z } from 'zod';
import { AUTH_CONSTRAINTS } from '../shared/constraints';

const passwordRegexes = [
    { regex: /[a-z]/, message: 'Password must contain a lowercase letter' },
    { regex: /[A-Z]/, message: 'Password must contain an uppercase letter' },
    { regex: /[0-9]/, message: 'Password must contain a number' },
    { regex: /[^a-zA-Z0-9]/, message: 'Password must contain a special character' },
] as const;

function passwordSchema() {
    return z
        .string()
        .min(AUTH_CONSTRAINTS.PASSWORD_MIN_LENGTH)
        .max(AUTH_CONSTRAINTS.PASSWORD_MAX_LENGTH)
        .refine((val) => passwordRegexes.every((r) => r.regex.test(val)), {
            message: passwordRegexes.find((r) => !r.regex.test(''))?.message ?? 'Password does not meet requirements',
        });
}

export const registerSchema = z.object({
    email: z
        .string()
        .trim()
        .toLowerCase()
        .email('Invalid email format')
        .max(AUTH_CONSTRAINTS.EMAIL_MAX_LENGTH, 'Email too long'),
    password: passwordSchema(),
});

export const loginSchema = z.object({
    email: z
        .string()
        .trim()
        .toLowerCase()
        .email('Invalid email format')
        .max(AUTH_CONSTRAINTS.EMAIL_MAX_LENGTH, 'Email too long'),
    password: passwordSchema(),
});
