export const AI_CONSTANTS = {
  PROPOSAL_EXPIRY_DEFAULT_MINUTES: 30,
  CONFIRMATION_KEYWORDS: ['yes', 'confirm', 'correct', 'ok', 'save', 'confirmed'] as const,
  REJECTION_KEYWORDS: ['no', 'cancel', 'reject', 'discard'] as const,
  EDIT_KEYWORDS: ['edit', 'change', 'update', 'fix', 'wrong', 'correct it', 'correction'] as const,
  MAX_OUTBOUND_TEXT_LENGTH: 4096,
} as const;

export const AI_AUDIT_ACTIONS = {
  PROPOSAL_CONFIRMED: 'AI_PROPOSAL_CONFIRMED',
  PROPOSAL_REJECTED: 'AI_PROPOSAL_REJECTED',
  PROPOSAL_CORRECTED: 'AI_PROPOSAL_CORRECTED',
} as const;

export const AI_REPLIES = {
  AI_UNAVAILABLE: 'Financial message understanding is temporarily unavailable. You can still add transactions from the dashboard.',

  AI_FAILED: 'I received your message, but I could not understand it right now. Please try again in a moment.',

  BUSINESS_QUERY_UNAVAILABLE: 'I can answer questions about your recorded business data, such as income, expenses, invoices and outstanding payments. Forecasting is not enabled yet.',

  BUSINESS_QUERY_FAILED: 'I received your question, but I couldn\'t retrieve your business records right now. Please try again.',

  CONFIRM_PROMPT: (text: string) => `I understood:\n\n${text}\n\nConfirm this transaction?\n\nReply:\nCONFIRM\nEDIT\nCANCEL`,

  CONFIRMED_SUCCESS: (text: string) => `Saved successfully.\n\n${text}`,

  CANCELLED: 'Okay. I did not save this transaction.',

  EDIT_HELP: 'Tell me what needs to be changed.\n\nExample:\n"Amount should be 2000"\nor\n"Category should be Transport"',

  CORRECTED: (text: string) => `Updated:\n\n${text}\n\nConfirm?\n\nCONFIRM\nEDIT\nCANCEL`,

  MULTI_TRANSACTION: 'I found more than one transaction in your message.\n\nPlease send them one at a time for now.',

  EXPIRED_PROPOSAL: 'That confirmation request has expired. Please send the transaction again.',

  CLARIFY: (question: string) => question,

  AMOUNT_MISSING: (description: string) => `How much did you ${description.includes('receive') ? 'receive' : 'spend'}${description ? ' on ' + description : ''}?`,

  CUSTOMER_NOT_FOUND: (name: string) => `I could not find a customer named "${name}". Should I save without a customer?`,

  CUSTOMER_AMBIGUOUS: (names: string[]) => `Which customer did you mean?\n\n${names.map((n, i) => `${i + 1}. ${n}`).join('\n')}`,
} as const;
