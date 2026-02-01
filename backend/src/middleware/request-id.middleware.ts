import { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const id = req.get('x-request-id') || nanoid(10);
    req.headers['x-request-id'] = id;
    res.setHeader('x-request-id', id);
    next();
};