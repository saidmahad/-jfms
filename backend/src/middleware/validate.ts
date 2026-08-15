import type { Request, Response, NextFunction } from 'express';
import type { ZodType, ZodError } from 'zod';
import { validationError } from '../utils/errors.ts';

export function validate(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors: Record<string, string[]> = {};
      const zodError = result.error as ZodError;
      for (const issue of zodError.issues) {
        const field = issue.path.join('.') || '_';
        (errors[field] ??= []).push(issue.message);
      }
      throw validationError('Validation failed', errors);
    }
    req.body = result.data;
    next();
  };
}
