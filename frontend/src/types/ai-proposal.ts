export interface ProposalParsedData {
  type?: string;
  amount?: number;
  currency?: string;
  category?: string;
  categoryId?: string;
  date?: string;
  description?: string;
  customer?: string;
  customerId?: string;
  paymentMethod?: string;
}

export interface ProposalRevision {
  timestamp: string;
  previousData: Record<string, unknown>;
  updatedData: Record<string, unknown>;
  sourceText: string;
}

export interface AiProposal {
  _id: string;
  businessId: string;
  userId: string;
  messageEventId: string;
  intent: string;
  originalText: string;
  inputSource?: 'whatsapp_text' | 'whatsapp_voice' | 'dashboard';
  transcript?: string;
  speechConfidence?: number;
  parsedData: ProposalParsedData;
  confidence: number;
  status: string;
  validationErrors: string[];
  clarificationQuestion?: string;
  confirmedTransactionId?: string;
  confirmedAt?: string;
  rejectedAt?: string;
  expiresAt: string;
  revisionHistory: ProposalRevision[];
  createdAt: string;
  updatedAt: string;
}

export interface ProposalListResponse {
  items: AiProposal[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
