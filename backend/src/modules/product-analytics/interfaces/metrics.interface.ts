export interface BetaMetricsResponse {
  period: { from: string; to: string };
  weeklyActiveBusinesses: number;
  transactionsPerActiveBusiness: number;
  d7Retention: RetentionResult;
  d30Retention: RetentionResult;
  whatsappConfirmationSuccess: RateResult;
  aiCorrectionRate: RateResult;
  aiClarificationRate: RateResult;
  invoiceAdoption: RateResult;
  voiceQuality: VoiceQualityResult;
  reminderOutcome: ReminderOutcomeResult;
}

export interface RetentionResult {
  eligibleBusinesses: number;
  retainedBusinesses: number;
  rate: number;
}

export interface RateResult {
  denominator: number;
  numerator: number;
  rate: number;
}

export interface VoiceQualityResult {
  voiceReceived: number;
  successfulTranscription: number;
  transcriptionSuccessRate: number;
  proposalsCreated: number;
  proposalsConfirmed: number;
  confirmationRate: number;
}

export interface ReminderOutcomeResult {
  remindersSent: number;
  paymentsAfterReminder: number;
  outcomeRate: number;
}
