// src/shared/response.ts
import { Response } from 'express';

/**
 * Sends a standardized success response.
 *
 * @param res - Express response object
 * @param data - Response payload
 * @param status - HTTP status code (default: 200)
 */
export function successResponse<T>(res: Response, data: T, status = 200): void {
    res.status(status).json({
        success: true,
        data,
    });
}

/**
 * Sends a standardized error response.
 *
 * @param res - Express response object
 * @param message - Error message
 * @param status - HTTP status code (default: 400)
 */
export function errorResponse(res: Response, message: string, status = 400): void {
    res.status(status).json({
        success: false,
        error: message,
    });
}
