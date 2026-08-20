import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';

export interface LineItemInput {
  quantity: string;
  rate: number;
}

export interface CalculatedLineItem {
  amountMinor: number;
}

@Injectable()
export class InvoiceCalculationService {
  private getDecimals(currency: string): number {
    const upper = currency.toUpperCase();
    if (upper === 'JPY' || upper === 'KRW') return 0;
    return 2;
  }

  calculateLineTotal(
    quantity: string,
    rate: number,
    currency: string,
  ): CalculatedLineItem {
    const decimals = this.getDecimals(currency);
    const factor = new Decimal(10).pow(decimals);

    const qty = new Decimal(quantity);
    const rateDecimal = new Decimal(rate).mul(factor);

    if (qty.lte(0)) {
      throw new Error('Quantity must be greater than zero');
    }
    if (rateDecimal.lt(0)) {
      throw new Error('Rate must not be negative');
    }

    const amount = qty.mul(rateDecimal).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
    return { amountMinor: amount.toNumber() };
  }

  calculateInvoiceTotals(
    items: { quantity: string; rate: number }[],
    currency: string,
  ): { subtotalMinor: number; totalMinor: number } {
    if (!items || items.length === 0) {
      throw new Error('Invoice must have at least one item');
    }

    let subtotal = new Decimal(0);

    for (const item of items) {
      const line = this.calculateLineTotal(item.quantity, item.rate, currency);
      subtotal = subtotal.add(line.amountMinor);
    }

    const totalMinor = subtotal.toNumber();
    return { subtotalMinor: totalMinor, totalMinor };
  }

  toMinorUnits(amount: number, currency: string): number {
    const decimals = this.getDecimals(currency);
    const factor = new Decimal(10).pow(decimals);
    return new Decimal(amount).mul(factor).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
  }

  fromMinorUnits(amountMinor: number, currency: string): number {
    const decimals = this.getDecimals(currency);
    const factor = new Decimal(10).pow(decimals);
    return new Decimal(amountMinor).div(factor).toNumber();
  }
}
