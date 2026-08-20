import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Business, BusinessDocument } from '../../businesses/schemas/business.schema';
import { BusinessQueryType } from '../enums/business-query.enums';
import type { BusinessQueryClassification, BusinessQueryResult } from './interfaces/business-query.interface';
import { BusinessQueryClassifierService } from './services/business-query-classifier.service';
import { BusinessQueryDateService } from './services/business-query-date.service';
import { BusinessQueryService } from './services/business-query.service';
import { BusinessQueryResponseService } from './services/business-query-response.service';

@Injectable()
export class BusinessQueryHandler {
  private readonly logger = new Logger(BusinessQueryHandler.name);

  constructor(
    @InjectModel(Business.name)
    private businessModel: Model<BusinessDocument>,
    private readonly classifier: BusinessQueryClassifierService,
    private readonly dateService: BusinessQueryDateService,
    private readonly queryService: BusinessQueryService,
    private readonly responseService: BusinessQueryResponseService,
  ) {}

  async handleQuestion(
    businessId: string,
    question: string,
  ): Promise<{
    answer: string;
    classification: BusinessQueryClassification;
    result: BusinessQueryResult;
  }> {
    const startTime = Date.now();

    const business = await this.businessModel.findById(businessId);
    if (!business) {
      return {
        answer: 'Business not found.',
        classification: { intent: 'business_query', queryType: BusinessQueryType.UNKNOWN, confidence: 0 },
        result: { queryType: BusinessQueryType.UNKNOWN, currency: 'LKR', data: null },
      };
    }

    const currency = business.baseCurrency || 'LKR';
    const timezone = business.timezone || 'Asia/Colombo';

    const classification = await this.classifier.classify(question);

    this.logger.log(
      `Business query classified: ${classification.queryType} (${classification.confidence}) in ${Date.now() - startTime}ms`,
    );

    if (classification.queryType === BusinessQueryType.UNKNOWN) {
      return {
        answer: 'I can answer questions about your recorded business data, such as income, expenses, invoices and outstanding payments. Forecasting is not enabled yet.',
        classification,
        result: { queryType: BusinessQueryType.UNKNOWN, currency, data: null },
      };
    }

    if (classification.confidence < 0.4) {
      return {
        answer: 'I couldn\'t understand that business question. You can ask things like:\n\n- How much did I spend this month?\n- Who has not paid me?\n- What is my income this month?',
        classification,
        result: { queryType: BusinessQueryType.UNKNOWN, currency, data: null },
      };
    }

    try {
      const resolvedDate = this.dateService.resolveDateRange(
        classification.dateRange,
        timezone,
      );

      const startDate = this.dateService.getStartOfDay(resolvedDate.startDate);
      const endDate = this.dateService.getEndOfDay(resolvedDate.endDate);

      const result = await this.queryService.executeQuery(
        classification.queryType,
        businessId,
        currency,
        { startDate, endDate },
        resolvedDate,
        {
          customerName: classification.customerName,
          invoiceNumber: classification.invoiceNumber,
          limit: classification.limit,
        },
      );

      const answer = this.responseService.formatResponse(result);

      this.logger.log(
        `Business query completed: ${classification.queryType} in ${Date.now() - startTime}ms`,
      );

      return { answer, classification, result };
    } catch (error) {
      this.logger.error(`Business query execution failed: ${error}`);
      return {
        answer: 'I received your question, but I couldn\'t retrieve your business records right now. Please try again.',
        classification,
        result: { queryType: classification.queryType, currency, data: null },
      };
    }
  }
}
