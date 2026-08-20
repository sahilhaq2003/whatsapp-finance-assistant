import { api } from '@/lib/api-client';
import type { BusinessQueryResponse } from '@/types/ai-business-query';
import type { ApiResponse } from '@/types/auth';

export const aiBusinessQueryService = {
  askBusinessQuestion: (question: string) =>
    api.post<ApiResponse<BusinessQueryResponse>>('/ai/business-query', { question }),
};
