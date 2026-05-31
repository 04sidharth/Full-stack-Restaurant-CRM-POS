import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { HttpError } from '../lib/http-error.js';
import { logger } from '../lib/logger.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  if (err instanceof ZodError) {
    return res.status(422).json({
      error: { code: 'UNPROCESSABLE', message: 'Validation failed', details: err.flatten() },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'A record with the same unique value already exists',
          details: { target: err.meta?.target },
        },
      });
    }
    if (err.code === 'P2025') {
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Record not found' } });
    }
  }

  logger.error({ err }, 'unhandled-error');
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Internal server error' } });
};

export const notFoundHandler = (_req: unknown, res: { status: (s: number) => { json: (b: unknown) => unknown } }) =>
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
