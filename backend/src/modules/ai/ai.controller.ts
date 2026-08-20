import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BusinessAccessGuard } from '../auth/guards/business-access.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentBusiness } from '../auth/decorators/current-business.decorator';
import type { AuthenticatedUser, BusinessContext } from '../auth/interfaces/authenticated-request.interface';
import { AiProposalService } from './services/ai-proposal.service';
import { AiProposalQueryDto } from './dto/ai-proposal-query.dto';
import type { ParsedTransactionProposal } from './interfaces/financial-extraction.interface';
import { BusinessQueryHandler } from './business-query/business-query.handler';
import { BusinessQueryRequestDto } from './business-query/dtos/business-query-request.dto';

@Controller('ai')
@UseGuards(JwtAuthGuard, BusinessAccessGuard)
export class AiController {
  constructor(
    private readonly proposalService: AiProposalService,
    private readonly businessQueryHandler: BusinessQueryHandler,
  ) {}

  @Post('business-query')
  async businessQuery(
    @CurrentBusiness() business: BusinessContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BusinessQueryRequestDto,
  ) {
    const result = await this.businessQueryHandler.handleQuestion(
      business.businessId,
      dto.question,
    );

    return {
      success: true,
      message: 'Business question answered successfully',
      data: {
        queryType: result.classification.queryType,
        answer: result.answer,
        result: result.result,
      },
    };
  }

  @Get('proposals')
  async getProposals(
    @CurrentBusiness() business: BusinessContext,
    @Query() query: AiProposalQueryDto,
  ) {
    const result = await this.proposalService.getProposals(business.businessId, {
      status: query.status,
      intent: query.intent,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      page: query.page,
      limit: query.limit,
    });

    return {
      success: true,
      message: 'Proposals fetched',
      data: result,
    };
  }

  @Get('proposals/:proposalId')
  async getProposal(
    @CurrentBusiness() business: BusinessContext,
    @Param('proposalId') proposalId: string,
  ) {
    const proposal = await this.proposalService.getProposal(business.businessId, proposalId);
    return {
      success: true,
      message: 'Proposal fetched',
      data: proposal,
    };
  }

  @Post('proposals/:proposalId/confirm')
  async confirmProposal(
    @CurrentBusiness() business: BusinessContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('proposalId') proposalId: string,
  ) {
    const result = await this.proposalService.confirmProposal(
      business.businessId,
      user.userId,
      proposalId,
    );

    return {
      success: true,
      message: 'Transaction confirmed and created',
      data: result,
    };
  }

  @Post('proposals/:proposalId/reject')
  async rejectProposal(
    @CurrentBusiness() business: BusinessContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('proposalId') proposalId: string,
  ) {
    const proposal = await this.proposalService.rejectProposal(
      business.businessId,
      user.userId,
      proposalId,
    );

    return {
      success: true,
      message: 'Proposal rejected',
      data: proposal,
    };
  }

  @Patch('proposals/:proposalId')
  async updateProposal(
    @CurrentBusiness() business: BusinessContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('proposalId') proposalId: string,
    @Body() updates: Partial<ParsedTransactionProposal>,
  ) {
    const result = await this.proposalService.updateProposal(
      business.businessId,
      user.userId,
      proposalId,
      updates,
    );

    return {
      success: true,
      message: 'Proposal updated',
      data: result,
    };
  }
}
