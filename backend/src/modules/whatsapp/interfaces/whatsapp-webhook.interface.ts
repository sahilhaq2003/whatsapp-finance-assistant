export interface MetaWebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: string;
      metadata: {
        display_phone_number: string;
        phone_number_id: string;
      };
      contacts?: Array<{
        profile: { name: string };
        wa_id: string;
      }>;
      messages?: Array<{
        from: string;
        id: string;
        timestamp: string;
        type: string;
        text?: { body: string; preview_url?: boolean };
        image?: { id: string; mime_type: string; caption?: string };
        audio?: { id: string; mime_type: string; voice?: boolean };
        document?: { id: string; mime_type: string; filename?: string; caption?: string };
        interactive?: Record<string, unknown>;
        context?: { from: string; id: string };
      }>;
      statuses?: Array<{
        id: string;
        status: string;
        timestamp: string;
        recipient_id: string;
        errors?: Array<{ code: number; title: string; message: string; error_data?: { details: string } }>;
      }>;
    };
    field: string;
  }>;
}

export interface MetaWebhookBody {
  object: string;
  entry: MetaWebhookEntry[];
}
