import { Request, Response, NextFunction } from 'express';

export const timeoutMiddleware = (seconds: number) => {
    return (_req: Request, res: Response, next: NextFunction) => {
        res.setTimeout(seconds * 1000, () => {
            if (!res.headersSent) {
                res.status(503).json({ error: 'Request timeout' });
            }
        });
        next();
    };
};