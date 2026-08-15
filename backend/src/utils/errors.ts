export interface FieldErrors {
  [field: string]: string[];
}

export class ApiError extends Error {
  status: number;
  errors?: FieldErrors;

  constructor(status: number, message: string, errors?: FieldErrors) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

export const badRequest = (message: string, errors?: FieldErrors) => new ApiError(400, message, errors);
export const unauthorized = (message = 'Unauthenticated') => new ApiError(401, message);
export const forbidden = (message = 'You do not have permission to perform this action') => new ApiError(403, message);
export const notFound = (message = 'Resource not found') => new ApiError(404, message);
export const conflict = (message: string) => new ApiError(409, message);
export const validationError = (message = 'Validation failed', errors?: FieldErrors) => new ApiError(422, message, errors);
