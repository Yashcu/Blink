import { Express, NextFunction, Request, Response } from 'express';
import { AuthService } from './auth.service';
import { checkLoginRateLimit, resetLoginRateLimit } from './login-rate-limit';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { registerSchema, loginSchema } from './auth.validation';
import { validateBody, rateLimitRegister } from '../middleware/validation.middleware';
import { getCookieOptions } from '../config/auth';
import { AuthError } from '../shared/errors';
import z from 'zod';

const service = new AuthService();

export function registerAuthRoutes(app: Express) {
    app.post(
        '/api/auth/register',
        rateLimitRegister(),
        validateBody(registerSchema),
        async (req: Request, res: Response, next: NextFunction) => {
            try {
                const { email, password } = req.body as z.infer<typeof registerSchema>;

                const { token, userId } = await service.register(email, password);

                res.cookie('auth', token, getCookieOptions())
                    .status(201)
                    .json({
                        success: true,
                        message: 'Account created successfully',
                        token,
                        user: { id: userId, email },
                    });
            } catch (err) {
                next(err);
            }
        },
    );

    app.post(
        '/api/auth/login',
        validateBody(loginSchema),
        async (req: Request, res: Response, next: NextFunction) => {
            try {
                const { email, password } = req.body as z.infer<typeof loginSchema>;
                const rawIp = req.headers['x-forwarded-for'];
                const ip = typeof rawIp === 'string'
                    ? rawIp.split(',')[0].trim()
                    : Array.isArray(rawIp)
                        ? rawIp[0]
                        : (req.ip || '127.0.0.1');

                await checkLoginRateLimit(ip, email);

                const { token, user } = await service.login(email, password);

                await resetLoginRateLimit(ip, email);

                res.cookie('auth', token, getCookieOptions())
                    .status(200)
                    .json({
                        success: true,
                        token,
                        user: { id: user.id, email: user.email },
                    });
            } catch (err) {
                next(err);
            }
        },
    );

    app.get(
        '/api/auth/me',
        requireAuth,
        async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
            try {
                const user = await service.getUserById(req.user!.userId);
                if (!user) {
                    return next(new AuthError('User not found'));
                }
                res.json({
                    success: true,
                    user: {
                        id: user.id,
                        email: user.email,
                    },
                    data: {
                        userId: user.id,
                        email: user.email,
                    },
                });
            } catch (err) {
                next(err);
            }
        },
    );

    app.post(
        '/api/auth/logout',
        requireAuth,
        async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
            try {
                const sessionId = req.user!.sessionId;
                await service.logout(sessionId);

                res.clearCookie('auth', getCookieOptions())
                    .status(200)
                    .json({ success: true });
            } catch (err) {
                next(err);
            }
        },
    );
}
