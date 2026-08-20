export interface AiExtractionContext {
  businessId: string;
  userId: string;
  messageEventId: string;
  senderPhone: string;
  originalText: string;
  businessTimezone: string;
  businessCurrency: string;
  currentLocalDate: string;
  expenseCategories: Array<{ _id: string; name: string }>;
  incomeCategories: Array<{ _id: string; name: string }>;
}
