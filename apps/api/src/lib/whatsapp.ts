import twilio from 'twilio';
import { env } from '../config/env.js';
import { HttpError } from './http-error.js';

/** Normalise any Indian/international number to E.164 format (+91XXXXXXXXXX) */
export function normalisePhone(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) return `+${d}`;
  if (d.length === 10) return `+91${d}`;
  if (d.startsWith('0') && d.length === 11) return `+91${d.slice(1)}`;
  return d.startsWith('+') ? d : `+${d}`;
}

export interface BillMessageParams {
  restaurantName: string;
  gstNumber?: string | null;
  orderNumber: string;
  orderType: string;
  tableName?: string | null;
  customerName?: string | null;
  createdAt: Date;
  invoiceNumber?: string | null;
  lines: { name: string; quantity: number; lineTotal: string }[];
  totals: {
    subTotal: string;
    discount: string;
    serviceCharge: string;
    cgst: string;
    sgst: string;
    igst: string;
    grandTotal: string;
    paid: string;
    balance: string;
  };
  interState: boolean;
}

export function buildBillMessage(p: BillMessageParams): string {
  const fmt = (n: string | number) => `₹${Number(n).toFixed(2)}`;
  const date = p.createdAt.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
  const line = '─────────────────────';

  const rows: string[] = [];
  rows.push(`🧾 *${p.restaurantName}*`);
  if (p.gstNumber) rows.push(`GSTIN: ${p.gstNumber}`);
  rows.push(line);

  const typeLabel = p.orderType.replace(/_/g, ' ');
  rows.push(`*Order #${p.orderNumber}* | ${typeLabel}`);
  if (p.tableName)    rows.push(`📍 Table ${p.tableName}`);
  if (p.customerName) rows.push(`👤 ${p.customerName}`);
  rows.push(`📅 ${date}`);
  if (p.invoiceNumber) rows.push(`🔖 Invoice: *${p.invoiceNumber}*`);
  rows.push(line);

  rows.push('*Items:*');
  for (const l of p.lines) {
    rows.push(`  • ${l.name} × ${l.quantity}   ${fmt(l.lineTotal)}`);
  }
  rows.push(line);

  const pad = (label: string, val: string) => {
    const space = Math.max(1, 26 - label.length - val.length);
    return label + ' '.repeat(space) + val;
  };

  rows.push(pad('Subtotal', fmt(p.totals.subTotal)));
  if (Number(p.totals.discount) > 0)
    rows.push(pad('Discount', `-${fmt(p.totals.discount)}`));
  if (Number(p.totals.serviceCharge) > 0)
    rows.push(pad('Service charge', fmt(p.totals.serviceCharge)));
  if (p.interState) {
    rows.push(pad('IGST', fmt(p.totals.igst)));
  } else {
    rows.push(pad('CGST', fmt(p.totals.cgst)));
    rows.push(pad('SGST', fmt(p.totals.sgst)));
  }
  rows.push(pad('*Grand Total*', `*${fmt(p.totals.grandTotal)}*`));
  if (Number(p.totals.paid) > 0)
    rows.push(pad('Paid', fmt(p.totals.paid)));
  if (Number(p.totals.balance) > 0)
    rows.push(pad('Balance due', fmt(p.totals.balance)));
  rows.push(line);
  rows.push('_Thank you for your visit! 🙏_');

  return rows.join('\n');
}

/** Send a WhatsApp message via Twilio. Throws HttpError if not configured. */
export async function sendWhatsAppMessage(toPhone: string, body: string): Promise<void> {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    throw new HttpError(
      503,
      'WHATSAPP_NOT_CONFIGURED',
      'WhatsApp is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM to your .env file.',
    );
  }

  const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  const to = `whatsapp:${normalisePhone(toPhone)}`;
  const from = env.TWILIO_WHATSAPP_FROM;

  await client.messages.create({ from, to, body });
}
