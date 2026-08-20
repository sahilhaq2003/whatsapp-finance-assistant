// Feature flags for controlled beta rollout
// All flags are read from environment variables with safe defaults

export interface FeatureFlags {
  voiceInput: boolean;
  automatedReminders: boolean;
  scheduledSummaries: boolean;
  advancedReports: boolean;
  teamAccess: boolean;
  aiExtraction: boolean;
  speechProcessing: boolean;
  whatsappOutbound: boolean;
  invoicePdfGeneration: boolean;
  reportCsvExport: boolean;
}

export function getFeatureFlags(configService: { get: (key: string, defaultValue?: any) => any }): FeatureFlags {
  return {
    voiceInput: configService.get('FEATURE_VOICE_INPUT', 'false') === 'true',
    automatedReminders: configService.get('FEATURE_AUTOMATED_REMINDERS', 'false') === 'true',
    scheduledSummaries: configService.get('FEATURE_SCHEDULED_SUMMARIES', 'false') === 'true',
    advancedReports: configService.get('FEATURE_ADVANCED_REPORTS', 'true') === 'true',
    teamAccess: configService.get('FEATURE_TEAM_ACCESS', 'false') === 'true',
    aiExtraction: configService.get('AI_ENABLED', 'false') === 'true',
    speechProcessing: configService.get('SPEECH_ENABLED', 'false') === 'true',
    whatsappOutbound: configService.get('WHATSAPP_WEBHOOK_ENABLED', 'false') === 'true',
    invoicePdfGeneration: configService.get('FEATURE_INVOICE_PDF', 'true') === 'true',
    reportCsvExport: configService.get('FEATURE_REPORT_CSV', 'true') === 'true',
  };
}
