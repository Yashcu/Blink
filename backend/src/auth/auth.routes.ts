import { Express, NextFunction, Request, Response } from 'express';
import { AuthService } from './auth.service';
import { checkLoginRateLimit } from './login-rate-limit';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { registerSchema, loginSchema } from './auth.validation';
import { validateBody, rateLimitRegister } from '../middleware/validation.middleware';
import { successResponse } from '../shared/response';
import { getCookieOptions } from '../config/auth';
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

                const { token } = await service.register(email, password);

                res.cookie('auth', token, getCookieOptions())
                    .status(201)
                    .json({ success: true, message: 'Account created successfully' });
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
                const ip = req.headers['x-forwarded-for']?.toString() || req.ip || '127.0.0.1';

                const allowed = await checkLoginRateLimit(ip);
                if (!allowed) {
                    return res.status(429).json({
                        success: false,
                        error: 'Too many login attempts. Try again later.',
                    });
                }

                const { email, password } = req.body as z.infer<typeof loginSchema>;

                const { token } = await service.login(email, password);

                res.cookie('auth', token, getCookieOptions()).status(200).json({ success: true });
            } catch (err) {
                next(err);
            }
        },
    );

    app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
        successResponse(res, { userId: req.user!.userId });
    });

    app.post(
        '/api/auth/logout',
        requireAuth,
        async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
            try {
                const sessionId = req.user!.sessionId;
                await service.logout(sessionId);

                res.clearCookie('auth', getCookieOptions())
                    .status(200)
                    .json({ success: true, message: 'Logged out successfully' });
            } catch (err) {
                next(err);
            }
        },
    );
}
