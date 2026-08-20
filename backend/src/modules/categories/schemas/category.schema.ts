import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { CategoryType } from '../../../common/enums/category-type.enum';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({
  timestamps: true,
  collection: 'categories',
})
export class Category {
  @Prop({ type: Types.ObjectId, ref: 'Business', required: true })
  businessId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 100 })
  name: string;

  @Prop({ type: String, required: true, enum: CategoryType })
  type: CategoryType;

  @Prop({ type: Boolean, default: false })
  isSystem: boolean;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdByUserId: Types.ObjectId;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

CategorySchema.index({ businessId: 1 });
CategorySchema.index({ businessId: 1, type: 1 });
CategorySchema.index({ businessId: 1, isActive: 1 });
CategorySchema.index(
  { businessId: 1, name: 1, type: 1 },
  { unique: true, partialFilterExpression: { isActive: true } },
);
