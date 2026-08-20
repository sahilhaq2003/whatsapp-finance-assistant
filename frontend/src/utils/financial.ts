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

function getDecimals(currency: string): number {
  return CURRENCY_DECIMALS[currency.toUpperCase()] ?? 2;
}

export function minorToDisplay(amountMinor: number, currency: string): number {
  const factor = Math.pow(10, getDecimals(currency));
  return amountMinor / factor;
}

export function formatCurrencyAmount(
  amountMinor: number,
  currency: string,
): string {
  const amount = minorToDisplay(amountMinor, currency);
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: getDecimals(currency),
    maximumFractionDigits: getDecimals(currency),
  }).format(amount);
}

export function formatAmountWithSign(
  amountMinor: number,
  currency: string,
  type: string,
): string {
  const formatted = formatCurrencyAmount(amountMinor, currency);
  return type === 'income' ? `+ ${formatted}` : `- ${formatted}`;
}
