import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@prisma/client';
import { HttpError } from '../lib/http-error.js';
import { verifyToken } from '../lib/jwt.js';

export interface AuthContext {
  userId: string;
  restaurantId: string;
  role: UserRole;
}

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthContext;
  }
}

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.header('authorization');
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    return next(HttpError.unauthorized('Missing bearer token'));
  }
  const token = header.slice('bearer '.length).trim();
  try {
    const payload = verifyToken(token);
    req.auth = { userId: payload.sub, restaurantId: payload.rid, role: payload.role };
    next();
  } catch {
    next(HttpError.unauthorized('Invalid or expired token'));
  }
};

export const requireRole =
  (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(HttpError.unauthorized());
    if (!roles.includes(req.auth.role)) {
      return next(HttpError.forbidden(`Requires one of: ${roles.join(', ')}`));
    }
    next();
  };
