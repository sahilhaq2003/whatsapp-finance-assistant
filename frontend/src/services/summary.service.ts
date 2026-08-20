import { api } from '@/lib/api-client';
import type {
  SummaryPreference,
  FinancialSummary,
  SummaryListResponse,
  SummaryPreview,
  UpdateSummaryPreferenceRequest,
  SummaryFrequency,
} from '@/types/financial-summary';

class SummaryService {
  async getPreferences(): Promise<{ success: boolean; data: SummaryPreference }> {
    return api.get('/summaries/preferences');
  }

  async updatePreferences(
    data: UpdateSummaryPreferenceRequest
  ): Promise<{ success: boolean; data: SummaryPreference }> {
    return api.put('/summaries/preferences', data);
  }

  async getSummaries(params?: {
    frequency?: SummaryFrequency;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ success: boolean; data: SummaryListResponse }> {
    const query = new URLSearchParams();
    if (params?.frequency) query.set('frequency', params.frequency);
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    const qs = query.toString();
    return api.get(`/summaries${qs ? `?${qs}` : ''}`);
  }

  async getSummary(id: string): Promise<{ success: boolean; data: FinancialSummary }> {
    return api.get(`/summaries/${id}`);
  }

  async preview(frequency: SummaryFrequency): Promise<{ success: boolean; data: SummaryPreview }> {
    return api.post('/summaries/preview', { frequency });
  }

  async generate(frequency: SummaryFrequency): Promise<{ success: boolean; data: FinancialSummary }> {
    return api.post('/summaries/generate', { frequency });
  }

  async send(id: string): Promise<{ success: boolean; message: string }> {
    return api.post(`/summaries/${id}/send`);
  }
}

export const summaryService = new SummaryService();
