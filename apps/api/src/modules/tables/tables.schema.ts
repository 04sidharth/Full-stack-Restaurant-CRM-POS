import { z } from 'zod';
import { TableStatus } from '@prisma/client';

const cuid = z.string().min(1);

export const createSectionSchema = z.object({
  name: z.string().min(1).max(40),
  sortOrder: z.number().int().min(0).max(999).default(0),
});

export const updateSectionSchema = createSectionSchema.partial();

export const createTableSchema = z.object({
  sectionId: cuid,
  name: z.string().min(1).max(20),
  capacity: z.number().int().min(1).max(40).default(4),
});

export const updateTableSchema = z.object({
  sectionId: cuid.optional(),
  name: z.string().min(1).max(20).optional(),
  capacity: z.number().int().min(1).max(40).optional(),
  status: z.nativeEnum(TableStatus).optional(),
});

export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;
export type CreateTableInput = z.infer<typeof createTableSchema>;
export type UpdateTableInput = z.infer<typeof updateTableSchema>;
