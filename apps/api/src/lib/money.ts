import { Prisma } from '@prisma/client';

export type DecimalLike = Prisma.Decimal | number | string;

const D = Prisma.Decimal;

export const toDecimal = (v: DecimalLike): Prisma.Decimal => new D(v.toString());

export const round2 = (v: DecimalLike): Prisma.Decimal =>
  toDecimal(v).toDecimalPlaces(2, D.ROUND_HALF_UP);

/**
 * Compute GST split (CGST + SGST for intra-state, IGST for inter-state).
 * Petpooja semantics: tax is per-line based on the item's tax rate.
 */
export interface TaxBreakdown {
  cgst: Prisma.Decimal;
  sgst: Prisma.Decimal;
  igst: Prisma.Decimal;
  total: Prisma.Decimal;
}

export const computeLineTax = (
  taxableAmount: DecimalLike,
  taxRatePct: DecimalLike,
  interState: boolean,
): TaxBreakdown => {
  const base = toDecimal(taxableAmount);
  const rate = toDecimal(taxRatePct).div(100);
  const total = round2(base.mul(rate));
  if (interState) {
    return { cgst: new D(0), sgst: new D(0), igst: total, total };
  }
  const half = round2(total.div(2));
  return { cgst: half, sgst: round2(total.sub(half)), igst: new D(0), total };
};

export const sumDecimal = (values: DecimalLike[]): Prisma.Decimal =>
  values.reduce<Prisma.Decimal>((acc, v) => acc.add(toDecimal(v)), new D(0));
