import { z } from 'zod';
import { URL_CONSTRAINTS } from '../shared/constraints';

export const createUrlSchema = z.object({
    longUrl: z.string().url('Invalid URL format'),
    customAlias: z
        .string()
        .min(URL_CONSTRAINTS.ALIAS_MIN_LENGTH)
        .max(URL_CONSTRAINTS.ALIAS_MAX_LENGTH)
        .regex(/^[a-zA-Z0-9_-]+$/, 'Alias can only contain letters, numbers, - and _')
        .optional(),
});

export const updateUrlSchema = z.object({
    longUrl: z.string().url('Invalid URL format').optional(),
    expiresAt: z.string().datetime({ message: 'Invalid date format' }).nullable().optional(),
});
