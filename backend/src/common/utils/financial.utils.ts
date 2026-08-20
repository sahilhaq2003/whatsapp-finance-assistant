const CURRENCY_DECIMALS: Record<string, number> = {
  LKR: 2,
  USD: 2,
  EUR: 2,
  GBP: 2,
  JPY: 0,
  KRW: 0,
  INR: 2,
  BDT: 2,
  PHP: 2,
};

function getMinorUnits(currency: string): number {
  const upper = currency.toUpperCase();
  if (upper in CURRENCY_DECIMALS) return CURRENCY_DECIMALS[upper];
  return 2;
}

export function toMinorUnits(amount: number, currency: string): number {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Invalid amount: must be a non-negative finite number');
  }
  const decimals = getMinorUnits(currency);
  const factor = Math.pow(10, decimals);
  return Math.round(amount * factor);
}

export function fromMinorUnits(amountMinor: number, currency: string): number {
  if (!Number.isFinite(amountMinor) || amountMinor < 0) {
    throw new Error('Invalid minor amount: must be a non-negative finite number');
  }
  const decimals = getMinorUnits(currency);
  const factor = Math.pow(10, decimals);
  return amountMinor / factor;
}

export function formatCurrency(amountMinor: number, currency: string): string {
  const amount = fromMinorUnits(amountMinor, currency);
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: getMinorUnits(currency),
    maximumFractionDigits: getMinorUnits(currency),
  }).format(amount);
}
