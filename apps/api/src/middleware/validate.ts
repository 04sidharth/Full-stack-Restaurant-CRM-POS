import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { HttpError } from '../lib/http-error.js';

type Source = 'body' | 'query' | 'params';

export const validate =
  (schema: ZodSchema, source: Source = 'body') =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(HttpError.unprocessable('Validation failed', result.error.flatten()));
    }
    // Replace with parsed (coerced/transformed) value
    (req as unknown as Record<Source, unknown>)[source] = result.data;
    next();
  };
