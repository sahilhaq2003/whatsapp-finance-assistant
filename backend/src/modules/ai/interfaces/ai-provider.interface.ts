import { AiIntent } from '../enums/ai-intent.enum';

export interface FinancialExtractionInput {
  messageText: string;
  businessTimezone: string;
  businessCurrency: string;
  currentLocalDate: string;
  expenseCategories: string[];
  incomeCategories: string[];
}

export interface FinancialExtractionResult {
  intent: AiIntent;
  confidence: number;
  transactions: Array<{
    type?: 'income' | 'expense' | null;
    amount?: number | null;
    currency?: string | null;
    category?: string | null;
    date?: string | null;
    description?: string | null;
    customer?: string | null;
    paymentMethod?: string | null;
  }>;
  missingFields: string[];
  clarificationQuestion?: string | null;
}

export interface AiProvider {
  extractFinancialIntent(
    input: FinancialExtractionInput,
  ): Promise<FinancialExtractionResult>;
}
