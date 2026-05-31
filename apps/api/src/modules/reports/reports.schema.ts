import { z } from 'zod';

export const rangeQuery = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type RangeQuery = z.infer<typeof rangeQuery>;
