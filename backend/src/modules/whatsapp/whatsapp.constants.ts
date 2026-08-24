export const WHATSAPP_CONSTANTS = {
  MAX_OUTBOUND_TEXT_LENGTH: 4096,
  PAIRING_CODE_LENGTH: 6,
  PAIRING_CODE_PREFIX: 'DP-',
  PAIRING_CODE_EXPIRY_MINUTES: 10,
  PAIRING_CODE_EXPIRY_MS: 10 * 60 * 1000,
  WEBHOOK_PATH: 'whatsapp/webhook',
  GRAPH_API_VERSION: 'v21.0',
  GRAPH_BASE_URL: 'https://graph.facebook.com',
} as const;

export const WHATSAPP_INBOX_CONSTANTS = {
  CUSTOMER_SERVICE_WINDOW_MS: 24 * 60 * 60 * 1000,
  MAX_MESSAGE_PREVIEW_LENGTH: 160,
  RECENT_MESSAGES_FOR_AI: 20,
} as const;

export const WHATSAPP_AUDIT_ACTIONS = {
  CONNECTION_CREATED: 'WHATSAPP_CONNECTION_CREATED',
  CONNECTION_DISCONNECTED: 'WHATSAPP_CONNECTION_DISCONNECTED',
  PAIRING_CODE_CREATED: 'WHATSAPP_PAIRING_CODE_CREATED',
  SENDER_PAIRED: 'WHATSAPP_SENDER_PAIRED',
  SENDER_REVOKED: 'WHATSAPP_SENDER_REVOKED',
  TEST_MESSAGE_SENT: 'WHATSAPP_TEST_MESSAGE_SENT',
  AI_DRAFT_GENERATED: 'WHATSAPP_AI_DRAFT_GENERATED',
  AI_DRAFT_REGENERATED: 'WHATSAPP_AI_DRAFT_REGENERATED',
  AI_DRAFT_REJECTED: 'WHATSAPP_AI_DRAFT_REJECTED',
  AI_DRAFT_APPROVED_SENT: 'WHATSAPP_AI_DRAFT_APPROVED_SENT',
  MANUAL_REPLY_SENT: 'WHATSAPP_MANUAL_REPLY_SENT',
} as const;

export const WHATSAPP_COMMANDS = {
  HELP: 'help',
  STATUS: 'status',
} as const;

export const WHATSAPP_REPLIES = {
  HELP: `Salligo Finance Assistant

WhatsApp connection is working.

Soon you will be able to record income and expenses by messaging me.

Available now:
\u2022 help
\u2022 status`,

  VOICE_NOT_SUPPORTED:
    'Voice-note processing is not enabled yet. Please send a text message for now.',

  UNSUPPORTED_TYPE:
    'This message type is not supported yet. Please send a text message.',

  FINANCIAL_NOT_READY:
    'Your message was received successfully.\n\nFinancial message understanding will be enabled in the next stage.',

  UNAUTHORIZED:
    'This WhatsApp number is not connected as an authorized Salligo user.',

  PAIRING_SUCCESS: 'Your WhatsApp is now connected to Salligo.',
} as const;
