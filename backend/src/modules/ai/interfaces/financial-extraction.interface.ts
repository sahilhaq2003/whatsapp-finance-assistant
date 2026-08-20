import { AiIntent } from '../enums/ai-intent.enum';

export interface ParsedTransactionProposal {
  type?: 'income' | 'expense';
  amount?: number;
  currency?: string | null;
  category?: string | null;
  categoryId?: string | null;
  date?: string | null;
  description?: string | null;
  customer?: string | null;
  customerId?: string | null;
  paymentMethod?: string | null;
}

export interface ProposalRevision {
  timestamp: string;
  previousData: Partial<ParsedTransactionProposal>;
  updatedData: Partial<ParsedTransactionProposal>;
  sourceText: string;
}
