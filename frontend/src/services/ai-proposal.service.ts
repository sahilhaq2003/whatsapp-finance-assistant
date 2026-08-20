import { api } from '@/lib/api-client';
import type { AiProposal, ProposalListResponse, ProposalParsedData } from '@/types/ai-proposal';
import type { ApiResponse } from '@/types/auth';

export const aiProposalService = {
  getProposals: (params?: {
    status?: string;
    intent?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.intent) searchParams.set('intent', params.intent);
    if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom);
    if (params?.dateTo) searchParams.set('dateTo', params.dateTo);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    const qs = searchParams.toString();
    return api.get<ApiResponse<ProposalListResponse>>(`/ai/proposals${qs ? '?' + qs : ''}`);
  },

  getProposal: (proposalId: string) =>
    api.get<ApiResponse<AiProposal>>(`/ai/proposals/${proposalId}`),

  confirmProposal: (proposalId: string) =>
    api.post<ApiResponse<{ transaction: any; proposal: AiProposal }>>(
      `/ai/proposals/${proposalId}/confirm`,
    ),

  rejectProposal: (proposalId: string) =>
    api.post<ApiResponse<AiProposal>>(`/ai/proposals/${proposalId}/reject`),

  updateProposal: (proposalId: string, updates: Partial<ProposalParsedData>) =>
    api.patch<ApiResponse<{ proposal: AiProposal; confirmationText: string }>>(
      `/ai/proposals/${proposalId}`,
      updates,
    ),
};
