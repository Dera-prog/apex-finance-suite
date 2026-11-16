/**
 * Money lives in integer minor units — kobo for NGN, cents for USD.
 * The brand turns "I formatted kobo as naira" into a compile error, so every
 * conversion has to go through toMinor() or the arithmetic helpers below.
 */
export type Minor = number & { readonly __minor: unique symbol };

export const toMinor = (amount: number): Minor => Math.round(amount * 100) as Minor;

/** Rounds a value that is already in minor units, e.g. a weighted average cost. */
export const roundMinor = (minor: number): Minor => Math.round(minor) as Minor;

export const add = (a: Minor, b: Minor): Minor => (a + b) as Minor;
export const sub = (a: Minor, b: Minor): Minor => (a - b) as Minor;
export const neg = (a: Minor): Minor => -a as Minor;
export const abs = (a: Minor): Minor => Math.abs(a) as Minor;
export const sum = (items: readonly Minor[]): Minor =>
  items.reduce<number>((total, value) => total + value, 0) as Minor;
export const times = (units: number, perUnit: Minor): Minor => Math.round(units * perUnit) as Minor;
export const pctOf = (amount: Minor, percent: number): Minor =>
  Math.round((amount * percent) / 100) as Minor;

const group = (value: number) => Math.floor(value).toLocaleString('en-NG');

export function formatPlain(minor: Minor, decimals: 0 | 2 = 0): string {
  const abs = Math.abs(minor);
  const whole = group(abs / 100);
  if (decimals === 0) return `${minor < 0 ? '-' : ''}${whole}`;
  const fraction = String(Math.trunc(abs) % 100).padStart(2, '0');
  return `${minor < 0 ? '-' : ''}${whole}.${fraction}`;
}

export const formatNgn = (minor: Minor, decimals: 0 | 2 = 0): string => `₦${formatPlain(minor, decimals)}`;

export const formatUsd = (minor: Minor): string => `$${formatPlain(minor, 2)}`;

export function compactNgn(minor: Minor): string {
  const abs = Math.abs(minor);
  if (abs >= 100_000_000_000) return `₦${(abs / 100_000_000_000).toFixed(1)}b`;
  if (abs >= 100_000_000) return `₦${(abs / 100_000_000).toFixed(1)}m`;
  if (abs >= 100_000) return `₦${Math.round(abs / 100_000)}k`;
  return formatNgn(minor);
}

export function parseNgn(text: string): Minor | null {
  const cleaned = text.replace(/[₦,\s]/g, '');
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  return toMinor(Number(cleaned));
}
