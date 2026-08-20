import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  InvoiceCounter,
  InvoiceCounterDocument,
} from '../schemas/invoice-counter.schema';

@Injectable()
export class InvoiceNumberService {
  constructor(
    @InjectModel(InvoiceCounter.name)
    private counterModel: Model<InvoiceCounterDocument>,
  ) {}

  async generateNextInvoiceNumber(
    businessId: string,
    date: Date,
  ): Promise<string> {
    const year = date.getFullYear();

    const counter = await this.counterModel.findOneAndUpdate(
      {
        businessId: new Types.ObjectId(businessId),
        year,
      },
      { $inc: { sequence: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    const seq = String(counter.sequence).padStart(6, '0');
    return `INV-${year}-${seq}`;
  }
}
