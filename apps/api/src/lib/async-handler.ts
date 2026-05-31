import type { NextFunction, Request, Response, RequestHandler } from 'express';

type AsyncRequestHandler<P = unknown, Res = unknown, Req = unknown, Q = unknown> = (
  req: Request<P, Res, Req, Q>,
  res: Response<Res>,
  next: NextFunction,
) => Promise<unknown>;

export const asyncHandler =
  <P, Res, Req, Q>(fn: AsyncRequestHandler<P, Res, Req, Q>): RequestHandler<P, Res, Req, Q> =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
