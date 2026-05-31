import type { BillLine, BillTotals } from '@/features/billing/billing-api';

export interface WhatsAppBillParams {
  restaurantName: string;
  gstNumber?: string | null;
  orderNumber: string;
  orderType: string;
  tableName?: string | null;
  customerName?: string | null;
  createdAt: string;
  invoiceNumber?: string | null;
  lines: BillLine[];
  totals: BillTotals;
  interState: boolean;
}

/** Normalise an Indian mobile number to E.164 without '+' (e.g. 919876543210) */
export function normalisePhone(raw: string): string {
  // Strip everything except digits
  const digits = raw.replace(/\D/g, '');
  // Already has country code (91XXXXXXXXXX = 12 digits)
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  // 10-digit Indian number
  if (digits.length === 10) return `91${digits}`;
  // Number starting with 0 (011XXXXXXXX)
  if (digits.startsWith('0') && digits.length === 11) return `91${digits.slice(1)}`;
  // Return as-is (international numbers already with country code)
  return digits;
}

/** Build the WhatsApp message text for an e-bill */
export function buildBillMessage(p: WhatsAppBillParams): string {
  const date = new Date(p.createdAt).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
  const sep = '─────────────────────';
  const fmt = (n: string | number) => `₹${Number(n).toFixed(2)}`;
  const rpad = (label: string, val: string, width = 28) =>
    label + ' '.repeat(Math.max(1, width - label.length - val.length)) + val;

  const lines: string[] = [];

  // Header
  lines.push(`🧾 *${p.restaurantName}*`);
  if (p.gstNumber) lines.push(`GSTIN: ${p.gstNumber}`);
  lines.push(sep);

  // Order info
  const typeLabel = p.orderType.replace('_', ' ');
  lines.push(`*Order #${p.orderNumber}*  |  ${typeLabel}`);
  if (p.tableName) lines.push(`📍 Table ${p.tableName}`);
  if (p.customerName) lines.push(`👤 ${p.customerName}`);
  lines.push(`📅 ${date}`);
  if (p.invoiceNumber) lines.push(`🔖 Invoice: *${p.invoiceNumber}*`);
  lines.push(sep);

  // Items
  lines.push(`*Items:*`);
  for (const l of p.lines) {
    const amount = fmt(l.lineTotal);
    lines.push(`  • ${l.name} × ${l.quantity}  ${amount}`);
  }
  lines.push(sep);

  // Totals
  lines.push(rpad('Subtotal', fmt(p.totals.subTotal)));
  if (Number(p.totals.discount) > 0) {
    lines.push(rpad('Discount', `-${fmt(p.totals.discount)}`));
  }
  if (Number(p.totals.serviceCharge) > 0) {
    lines.push(rpad('Service charge', fmt(p.totals.serviceCharge)));
  }
  if (p.interState) {
    lines.push(rpad('IGST', fmt(p.totals.igst)));
  } else {
    lines.push(rpad('CGST', fmt(p.totals.cgst)));
    lines.push(rpad('SGST', fmt(p.totals.sgst)));
  }
  lines.push(rpad('*Grand Total*', `*${fmt(p.totals.grandTotal)}*`));
  if (Number(p.totals.paid) > 0) {
    lines.push(rpad('Paid', fmt(p.totals.paid)));
  }
  if (Number(p.totals.balance) > 0) {
    lines.push(rpad('Balance due', fmt(p.totals.balance)));
  }
  lines.push(sep);

  lines.push('_Thank you for your visit! 🙏_');

  return lines.join('\n');
}

/** Open WhatsApp Web with the pre-filled bill message */
export function sendWhatsAppBill(phone: string, params: WhatsAppBillParams): void {
  const normalised = normalisePhone(phone);
  const message = buildBillMessage(params);
  const url = `https://wa.me/${normalised}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
