import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { BetaInvite, BetaInviteDocument } from '../schemas/beta-invite.schema';
import {
  BetaEnrollment,
  BetaEnrollmentDocument,
} from '../schemas/beta-enrollment.schema';
import { BetaInviteStatus } from '../enums/beta-invite-status.enum';
import { BetaEnrollmentStatus } from '../enums/beta-enrollment-status.enum';
import type { CreateBetaInviteDto } from '../dto/create-beta-invite.dto';
import type { UpdateBetaEnrollmentDto } from '../dto/update-beta-enrollment.dto';

@Injectable()
export class BetaService {
  constructor(
    @InjectModel(BetaInvite.name)
    private betaInviteModel: Model<BetaInviteDocument>,
    @InjectModel(BetaEnrollment.name)
    private betaEnrollmentModel: Model<BetaEnrollmentDocument>,
    private configService: ConfigService,
  ) {}

  private generateCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `DP-BETA-${code}`;
  }

  private hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  async createInvite(
    dto: CreateBetaInviteDto,
    createdByUserId: string,
  ): Promise<{ invite: BetaInviteDocument; plaintextCode: string }> {
    const plaintextCode = this.generateCode();
    const codeHash = this.hashCode(plaintextCode);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (dto.expiresInDays ?? 30));

    const invite = await this.betaInviteModel.create({
      codeHash,
      email: dto.email,
      status: BetaInviteStatus.ACTIVE,
      expiresAt,
      maxUses: dto.maxUses ?? 1,
      usedCount: 0,
      createdByUserId,
      notes: dto.notes,
      cohort: dto.cohort,
    });

    return { invite, plaintextCode };
  }

  async redeemInvite(
    code: string,
    userId: string,
  ): Promise<BetaEnrollmentDocument> {
    const codeHash = this.hashCode(code);

    const invite = await this.betaInviteModel.findOne({ codeHash });

    if (!invite) {
      throw new NotFoundException('Invalid invite code');
    }

    if (invite.status !== BetaInviteStatus.ACTIVE) {
      throw new BadRequestException(`Invite is ${invite.status}`);
    }

    if (new Date() > invite.expiresAt) {
      throw new BadRequestException('Invite has expired');
    }

    const updatedInvite = await this.betaInviteModel.findOneAndUpdate(
      {
        codeHash,
        status: BetaInviteStatus.ACTIVE,
        usedCount: { $lt: invite.maxUses },
      },
      {
        $inc: { usedCount: 1 },
      },
      { new: true },
    );

    if (!updatedInvite) {
      throw new ConflictException(
        'Invite has been fully redeemed or is no longer valid',
      );
    }

    if (updatedInvite.usedCount >= updatedInvite.maxUses) {
      await this.betaInviteModel.findByIdAndUpdate(updatedInvite._id, {
        status: BetaInviteStatus.EXHAUSTED,
      });
    }

    let enrollment = await this.betaEnrollmentModel.findOne({
      userId,
    });

    if (enrollment) {
      if (
        enrollment.status === BetaEnrollmentStatus.ACTIVE ||
        enrollment.status === BetaEnrollmentStatus.ONBOARDING
      ) {
        throw new ConflictException('User already has an active enrollment');
      }

      enrollment.status = BetaEnrollmentStatus.ONBOARDING;
      enrollment.inviteId = updatedInvite._id;
      enrollment.cohort = updatedInvite.cohort;
      enrollment.startedAt = new Date();
      enrollment.activatedAt = undefined;
      enrollment.pausedAt = undefined;
      enrollment.exitedAt = undefined;
      await enrollment.save();
      return enrollment;
    }

    enrollment = await this.betaEnrollmentModel.create({
      userId,
      inviteId: updatedInvite._id,
      cohort: updatedInvite.cohort,
      status: BetaEnrollmentStatus.ONBOARDING,
      startedAt: new Date(),
    });

    return enrollment;
  }

  async getInvites(): Promise<BetaInviteDocument[]> {
    return this.betaInviteModel.find().sort({ createdAt: -1 }).exec();
  }

  async revokeInvite(id: string): Promise<BetaInviteDocument> {
    const invite = await this.betaInviteModel.findByIdAndUpdate(
      id,
      { status: BetaInviteStatus.REVOKED },
      { new: true },
    );

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    return invite;
  }

  async createEnrollment(
    businessId: string,
    userId: string,
    inviteId?: string,
    cohort?: string,
  ): Promise<BetaEnrollmentDocument> {
    const existing = await this.betaEnrollmentModel.findOne({ businessId });

    if (existing) {
      throw new ConflictException(
        'An enrollment already exists for this business',
      );
    }

    return this.betaEnrollmentModel.create({
      businessId,
      userId,
      inviteId,
      cohort,
      status: BetaEnrollmentStatus.INVITED,
    });
  }

  async getEnrollment(businessId: string): Promise<BetaEnrollmentDocument> {
    const enrollment = await this.betaEnrollmentModel.findOne({
      businessId,
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found for this business');
    }

    return enrollment;
  }

  async updateEnrollment(
    businessId: string,
    dto: UpdateBetaEnrollmentDto,
  ): Promise<BetaEnrollmentDocument> {
    const enrollment = await this.betaEnrollmentModel.findOne({ businessId });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found for this business');
    }

    if (dto.status !== undefined) {
      enrollment.status = dto.status;

      const now = new Date();
      switch (dto.status) {
        case BetaEnrollmentStatus.ACTIVE:
          enrollment.activatedAt = enrollment.activatedAt ?? now;
          break;
        case BetaEnrollmentStatus.PAUSED:
          enrollment.pausedAt = now;
          break;
        case BetaEnrollmentStatus.EXITED:
          enrollment.exitedAt = now;
          break;
      }
    }

    if (dto.notes !== undefined) {
      enrollment.notes = dto.notes;
    }

    return enrollment.save();
  }

  async listEnrollments(cohort?: string): Promise<BetaEnrollmentDocument[]> {
    const filter: Record<string, unknown> = {};
    if (cohort) {
      filter.cohort = cohort;
    }
    return this.betaEnrollmentModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  isBetaMode(): boolean {
    return this.configService.get<string>('BETA_MODE', 'false') === 'true';
  }

  async checkBetaAccess(userId: string): Promise<{
    hasAccess: boolean;
    enrollment?: BetaEnrollmentDocument;
  }> {
    if (!this.isBetaMode()) {
      return { hasAccess: true };
    }

    const enrollment = await this.betaEnrollmentModel.findOne({
      userId,
      status: {
        $in: [BetaEnrollmentStatus.ACTIVE, BetaEnrollmentStatus.ONBOARDING],
      },
    });

    return {
      hasAccess: !!enrollment,
      enrollment: enrollment ?? undefined,
    };
  }

  async setFirstMeaningfulActivity(businessId: string): Promise<void> {
    const enrollment = await this.betaEnrollmentModel.findOne({
      businessId,
      firstMeaningfulActivityAt: { $exists: false },
    });

    if (enrollment) {
      await this.betaEnrollmentModel.findByIdAndUpdate(enrollment._id, {
        firstMeaningfulActivityAt: new Date(),
      });
    }
  }
}
