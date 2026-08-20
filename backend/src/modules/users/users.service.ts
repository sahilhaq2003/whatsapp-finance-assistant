import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    const existingPhone = await this.userModel.findOne({
      phone: createUserDto.phone,
    });
    if (existingPhone) {
      throw new ConflictException('A user with this phone number already exists');
    }

    if (createUserDto.email) {
      const existingEmail = await this.userModel.findOne({
        email: createUserDto.email.toLowerCase(),
      });
      if (existingEmail) {
        throw new ConflictException('A user with this email already exists');
      }
    }

    const user = new this.userModel(createUserDto);
    return user.save();
  }

  async findById(id: string): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userModel.findById(new Types.ObjectId(id));
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByPhone(phone: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ phone });
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() });
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    if (updateUserDto.email) {
      const existingEmail = await this.userModel.findOne({
        email: updateUserDto.email.toLowerCase(),
        _id: { $ne: new Types.ObjectId(id) },
      });
      if (existingEmail) {
        throw new ConflictException('A user with this email already exists');
      }
    }

    if (updateUserDto.phone) {
      const existingPhone = await this.userModel.findOne({
        phone: updateUserDto.phone,
        _id: { $ne: new Types.ObjectId(id) },
      });
      if (existingPhone) {
        throw new ConflictException(
          'A user with this phone number already exists',
        );
      }
    }

    const user = await this.userModel.findByIdAndUpdate(
      new Types.ObjectId(id),
      { $set: updateUserDto },
      { new: true },
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
