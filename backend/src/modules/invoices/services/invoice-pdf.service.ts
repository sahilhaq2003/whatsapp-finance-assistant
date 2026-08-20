import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import PDFDocument from 'pdfkit';
import { Invoice, InvoiceDocument } from '../schemas/invoice.schema';
import { InvoiceItem, InvoiceItemDocument } from '../schemas/invoice-item.schema';
import { Business, BusinessDocument } from '../../businesses/schemas/business.schema';
import Decimal from 'decimal.js';

@Injectable()
export class InvoicePdfService {
  private readonly logger = new Logger(InvoicePdfService.name);

  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(InvoiceItem.name) private itemModel: Model<InvoiceItemDocument>,
    @InjectModel(Business.name) private businessModel: Model<BusinessDocument>,
  ) {}

  async generatePdf(invoiceId: string, businessId: string): Promise<Buffer> {
    const invoice = await this.invoiceModel.findOne({
      _id: new Types.ObjectId(invoiceId),
      businessId: new Types.ObjectId(businessId),
    });
    if (!invoice) throw new Error('Invoice not found');

    const items = await this.itemModel
      .find({
        invoiceId: new Types.ObjectId(invoiceId),
        businessId: new Types.ObjectId(businessId),
      })
      .sort({ sortOrder: 1 });

    const business = await this.businessModel.findById(invoice.businessId);
    if (!business) throw new Error('Business not found');

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Business Name
      doc.fontSize(20).font('Helvetica-Bold').text(business.name, { align: 'left' });
      doc.moveDown(0.5);

      // Invoice title
      doc.fontSize(28).font('Helvetica-Bold').text('INVOICE', { align: 'right' });
      doc.fontSize(10).font('Helvetica').text(`Invoice #: ${invoice.invoiceNumber}`, { align: 'right' });
      doc.moveDown(0.3);

      // Dates
      doc.fontSize(10).font('Helvetica');
      doc.text(`Issue Date: ${invoice.issueDate.toLocaleDateString()}`);
      if (invoice.dueDate) {
        doc.text(`Due Date: ${invoice.dueDate.toLocaleDateString()}`);
      }
      doc.moveDown(1);

      // Bill To
      doc.fontSize(10).font('Helvetica-Bold').text('Bill To:');
      doc.font('Helvetica').fontSize(10);
      doc.text(invoice.customerSnapshot.name);
      if (invoice.customerSnapshot.phone) doc.text(invoice.customerSnapshot.phone);
      if (invoice.customerSnapshot.email) doc.text(invoice.customerSnapshot.email);
      if (invoice.customerSnapshot.address) {
        const addr = invoice.customerSnapshot.address;
        const parts = [addr.line1, addr.line2, addr.city, addr.district, addr.postalCode, addr.country].filter(Boolean);
        if (parts.length > 0) doc.text(parts.join(', '));
      }
      doc.moveDown(1);

      // Table header
      const tableTop = doc.y;
      const descX = 50;
      const qtyX = 320;
      const rateX = 380;
      const amountX = 460;

      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Description', descX, tableTop);
      doc.text('Qty', qtyX, tableTop, { width: 50, align: 'right' });
      doc.text('Rate', rateX, tableTop, { width: 70, align: 'right' });
      doc.text('Amount', amountX, tableTop, { width: 80, align: 'right' });

      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);

      // Table rows
      doc.font('Helvetica').fontSize(10);
      const decimals = invoice.currency === 'JPY' || invoice.currency === 'KRW' ? 0 : 2;

      for (const item of items) {
        const y = doc.y;
        doc.text(item.description, descX, y, { width: 260 });
        doc.text(item.quantity, qtyX, y, { width: 50, align: 'right' });

        const rateDisplay = new Decimal(item.rateMinor).div(new Decimal(10).pow(decimals)).toNumber();
        doc.text(
          `${invoice.currency} ${rateDisplay.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`,
          rateX,
          y,
          { width: 70, align: 'right' },
        );

        const amountDisplay = new Decimal(item.amountMinor).div(new Decimal(10).pow(decimals)).toNumber();
        doc.text(
          `${invoice.currency} ${amountDisplay.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`,
          amountX,
          y,
          { width: 80, align: 'right' },
        );

        doc.moveDown(1);
      }

      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);

      // Totals
      const subtotalDisplay = new Decimal(invoice.subtotalMinor).div(new Decimal(10).pow(decimals)).toNumber();
      const totalDisplay = new Decimal(invoice.totalMinor).div(new Decimal(10).pow(decimals)).toNumber();

      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('Subtotal:', 380, doc.y, { width: 70, align: 'right' });
      doc.text(
        `${invoice.currency} ${subtotalDisplay.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`,
        460,
        doc.y - 14,
        { width: 80, align: 'right' },
      );

      doc.fontSize(12);
      doc.text('Total:', 380, doc.y + 4, { width: 70, align: 'right' });
      doc.text(
        `${invoice.currency} ${totalDisplay.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`,
        460,
        doc.y - 18,
        { width: 80, align: 'right' },
      );

      doc.moveDown(1.5);

      // Payment Status
      doc.fontSize(10).font('Helvetica');
      doc.text(`Payment Status: ${invoice.paymentStatus.replace('_', ' ').toUpperCase()}`);

      // Notes
      if (invoice.notes) {
        doc.moveDown(1);
        doc.font('Helvetica-Bold').text('Notes:');
        doc.font('Helvetica').text(invoice.notes);
      }

      // Footer
      doc.moveDown(2);
      doc.fontSize(8).font('Helvetica').fillColor('gray');
      doc.text(`Currency: ${invoice.currency}`, { align: 'center' });

      doc.end();
    });
  }

  sanitizeFilename(invoiceNumber: string): string {
    return invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  }
}
