import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Feedback, FeedbackDocument } from '../schemas/feedback.schema';
import { CreateFeedbackDto } from '../dto/create-feedback.dto';
import { FeedbackType } from '../enums/feedback-type.enum';
import { FeedbackStatus } from '../enums/feedback-status.enum';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectModel(Feedback.name) private feedbackModel: Model<FeedbackDocument>,
  ) {}

  async createFeedback(
    userId: string,
    businessId: string,
    dto: CreateFeedbackDto,
  ): Promise<FeedbackDocument> {
    const feedback = new this.feedbackModel({
      userId: new Types.ObjectId(userId),
      businessId: new Types.ObjectId(businessId),
      type: dto.type,
      message: dto.message,
      rating: dto.rating,
      page: dto.page,
      relatedEntityType: dto.relatedEntityType,
      relatedEntityId: dto.relatedEntityId
        ? new Types.ObjectId(dto.relatedEntityId)
        : undefined,
    });

    return feedback.save();
  }

  async getFeedback(filters: {
    type?: FeedbackType;
    status?: FeedbackStatus;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    feedback: FeedbackDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) {
        (query.createdAt as Record<string, unknown>).$gte = new Date(
          filters.dateFrom,
        );
      }
      if (filters.dateTo) {
        (query.createdAt as Record<string, unknown>).$lte = new Date(
          filters.dateTo,
        );
      }
    }

    const [feedback, total] = await Promise.all([
      this.feedbackModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'firstName lastName phone')
        .populate('businessId', 'name slug')
        .lean()
        .exec(),
      this.feedbackModel.countDocuments(query).exec(),
    ]);

    return { feedback, total, page, limit };
  }

  async updateFeedbackStatus(
    id: string,
    status: FeedbackStatus,
  ): Promise<FeedbackDocument | null> {
    return this.feedbackModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .lean()
      .exec();
  }

  async getFeedbackStats(): Promise<{
    byType: Array<{ type: string; count: number }>;
    byStatus: Array<{ status: string; count: number }>;
  }> {
    const [byType, byStatus] = await Promise.all([
      this.feedbackModel
        .aggregate([
          { $group: { _id: '$type', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ])
        .exec(),
      this.feedbackModel
        .aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ])
        .exec(),
    ]);

    return {
      byType: byType.map((item) => ({ type: item._id, count: item.count })),
      byStatus: byStatus.map((item) => ({
        status: item._id,
        count: item.count,
      })),
    };
  }
}
