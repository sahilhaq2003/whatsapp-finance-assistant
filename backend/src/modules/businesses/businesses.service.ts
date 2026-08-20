import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Business, BusinessDocument } from './schemas/business.schema';
import {
  BusinessMember,
  BusinessMemberDocument,
} from './schemas/business-member.schema';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { BusinessRole } from '../../common/enums/business-role.enum';

@Injectable()
export class BusinessesService {
  constructor(
    @InjectModel(Business.name)
    private businessModel: Model<BusinessDocument>,
    @InjectModel(BusinessMember.name)
    private businessMemberModel: Model<BusinessMemberDocument>,
  ) {}

  private toSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  async createBusinessForOwner(
    ownerUserId: string,
    createBusinessDto: CreateBusinessDto,
  ): Promise<{ business: BusinessDocument; membership: BusinessMemberDocument }> {
    if (!Types.ObjectId.isValid(ownerUserId)) {
      throw new BadRequestException('Invalid owner user ID');
    }

    const slug = this.toSlug(createBusinessDto.name);

    const existingSlug = await this.businessModel.findOne({ slug });
    if (existingSlug) {
      throw new ConflictException('A business with this name already exists');
    }

    const session = await this.businessModel.db.startSession();
    session.startTransaction();

    try {
      const business = new this.businessModel({
        ...createBusinessDto,
        slug,
      });
      await business.save({ session });

      const membership = new this.businessMemberModel({
        userId: new Types.ObjectId(ownerUserId),
        businessId: business._id,
        role: BusinessRole.OWNER,
      });
      await membership.save({ session });

      await session.commitTransaction();
      return { business, membership };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async findBusinessById(id: string): Promise<BusinessDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid business ID');
    }

    const business = await this.businessModel.findById(new Types.ObjectId(id));
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    return business;
  }

  async findBusinessBySlug(slug: string): Promise<BusinessDocument> {
    const business = await this.businessModel.findOne({ slug });
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    return business;
  }

  async updateBusiness(
    id: string,
    updateBusinessDto: UpdateBusinessDto,
  ): Promise<BusinessDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid business ID');
    }

    if (updateBusinessDto.name) {
      const slug = this.toSlug(updateBusinessDto.name);
      const existingSlug = await this.businessModel.findOne({
        slug,
        _id: { $ne: new Types.ObjectId(id) },
      });
      if (existingSlug) {
        throw new ConflictException('A business with this name already exists');
      }
      (updateBusinessDto as Record<string, unknown>).slug = slug;
    }

    const business = await this.businessModel.findByIdAndUpdate(
      new Types.ObjectId(id),
      { $set: updateBusinessDto },
      { new: true },
    );

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    return business;
  }

  async createMembership(
    userId: string,
    businessId: string,
    role: BusinessRole = BusinessRole.MEMBER,
  ): Promise<BusinessMemberDocument> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }
    if (!Types.ObjectId.isValid(businessId)) {
      throw new BadRequestException('Invalid business ID');
    }

    const existingMembership = await this.businessMemberModel.findOne({
      userId: new Types.ObjectId(userId),
      businessId: new Types.ObjectId(businessId),
    });
    if (existingMembership) {
      throw new ConflictException('User is already a member of this business');
    }

    const membership = new this.businessMemberModel({
      userId: new Types.ObjectId(userId),
      businessId: new Types.ObjectId(businessId),
      role,
    });

    return membership.save();
  }

  async findMembership(
    userId: string,
    businessId: string,
  ): Promise<BusinessMemberDocument | null> {
    return this.businessMemberModel.findOne({
      userId: new Types.ObjectId(userId),
      businessId: new Types.ObjectId(businessId),
    });
  }

  async findUserBusinesses(userId: string): Promise<BusinessDocument[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const memberships = await this.businessMemberModel.find({
      userId: new Types.ObjectId(userId),
      isActive: true,
    });

    const businessIds = memberships.map((m) => m.businessId);

    return this.businessModel.find({ _id: { $in: businessIds } });
  }

  async findBusinessMembers(
    businessId: string,
  ): Promise<BusinessMemberDocument[]> {
    if (!Types.ObjectId.isValid(businessId)) {
      throw new BadRequestException('Invalid business ID');
    }

    return this.businessMemberModel
      .find({ businessId: new Types.ObjectId(businessId) })
      .populate('userId', 'firstName lastName email phone');
  }
}
