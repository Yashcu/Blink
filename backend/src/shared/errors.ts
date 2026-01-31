export class AppError extends Error {
    constructor(
        public readonly code: string,
        public readonly status: number,
        message?: string,
        public readonly details?: any,
    ) {
        super(message);
    }
}

export class ValidationError extends AppError {
    constructor(message: string, details?: any) {
        super('VALIDATION_ERROR', 400, message, details);
    }
}

export class ConflictError extends AppError {
    constructor(message: string) {
        super('CONFLICT', 409, message);
    }
}

export class AuthError extends AppError {
    constructor(message: string = 'Unauthorized') {
        super('UNAUTHORIZED', 401, message);
    }
}
