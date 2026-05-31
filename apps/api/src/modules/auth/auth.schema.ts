import { z } from 'zod';
import { UserRole } from '@prisma/client';

export const signupSchema = z.object({
  restaurantName: z.string().min(2).max(120),
  ownerName: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(7).max(20).optional(),
  password: z.string().min(8).max(128),
  gstNumber: z.string().min(4).max(20).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(80).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createStaffSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(120),
  phone: z.string().max(20).optional(),
  password: z.string().min(8).max(128),
  role: z.nativeEnum(UserRole),
});

export const updateStaffSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  phone: z.string().max(20).optional(),
  role: z.nativeEnum(UserRole).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).max(128).optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
