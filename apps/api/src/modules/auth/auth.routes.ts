import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { asyncHandler } from '../../lib/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { authService } from './auth.service.js';
import { createStaffSchema, loginSchema, signupSchema, updateStaffSchema } from './auth.schema.js';

export const authRouter = Router();

authRouter.post(
  '/signup',
  validate(signupSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.signup(req.body);
    res.status(201).json(result);
  }),
);

authRouter.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    res.json(result);
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await authService.me(req.auth!.userId);
    res.json(result);
  }),
);

authRouter.post(
  '/staff',
  requireAuth,
  requireRole(UserRole.OWNER, UserRole.MANAGER),
  validate(createStaffSchema),
  asyncHandler(async (req, res) => {
    const staff = await authService.createStaff(req.auth!.restaurantId, req.body);
    res.status(201).json(staff);
  }),
);

authRouter.get(
  '/staff',
  requireAuth,
  requireRole(UserRole.OWNER, UserRole.MANAGER),
  asyncHandler(async (req, res) => {
    const staff = await authService.listStaff(req.auth!.restaurantId);
    res.json(staff);
  }),
);

authRouter.patch(
  '/staff/:id',
  requireAuth,
  requireRole(UserRole.OWNER, UserRole.MANAGER),
  validate(updateStaffSchema),
  asyncHandler(async (req, res) => {
    const params = req.params as Record<string, string | undefined>;
    const staff = await authService.updateStaff(
      req.auth!.restaurantId,
      req.auth!.userId,
      params.id!,
      req.body,
    );
    res.json(staff);
  }),
);
