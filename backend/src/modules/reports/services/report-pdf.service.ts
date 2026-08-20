import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import PDFDocument from 'pdfkit';
import { Business, BusinessDocument } from '../../businesses/schemas/business.schema';
import { FinancialOverviewResult } from '../interfaces/financial-overview.interface';
import { fromMinorUnits, formatCurrency } from '../../../common/utils/financial.utils';

@Injectable()
export class ReportPdfService {
  private readonly logger = new Logger(ReportPdfService.name);

  constructor(
    @InjectModel(Business.name) private businessModel: Model<BusinessDocument>,
  ) {}

  async generateOverviewPdf(businessId: string, overview: FinancialOverviewResult): Promise<Buffer> {
    const business = await this.businessModel.findById(new Types.ObjectId(businessId));
    const businessName = business?.name || 'Business';
    const currency = overview.currency;

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).font('Helvetica-Bold').text(businessName, { align: 'left' });
      doc.moveDown(0.3);
      doc.fontSize(16).font('Helvetica-Bold').text('Financial Overview Report', { align: 'left' });
      doc.moveDown(0.3);

      const startDate = new Date(overview.period.startDate).toLocaleDateString('en-LK');
      const endDate = new Date(overview.period.endDate).toLocaleDateString('en-LK');
      doc.fontSize(10).font('Helvetica').text(`Period: ${startDate} – ${endDate}`);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-LK')}`);
      doc.moveDown(1);

      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);

      const addLine = (label: string, value: number, color = 'black') => {
        doc.fontSize(11).font('Helvetica').fillColor('black').text(label, 50, doc.y, { continued: true });
        doc.fontSize(11).font('Helvetica-Bold').fillColor(color).text(`  ${formatCurrency(value, currency)}`, { align: 'right' });
        doc.moveDown(0.3);
      };

      addLine('Income', overview.income, '#16a34a');
      addLine('Expenses', overview.expenses, '#dc2626');
      doc.moveDown(0.2);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.3);

      const netColor = overview.netCashFlow >= 0 ? '#16a34a' : '#dc2626';
      doc.fontSize(13).font('Helvetica').fillColor('black').text('Net Cash Flow', 50, doc.y, { continued: true });
      doc.fontSize(13).font('Helvetica-Bold').fillColor(netColor).text(`  ${formatCurrency(overview.netCashFlow, currency)}`, { align: 'right' });
      doc.moveDown(0.5);

      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);

      doc.fontSize(11).font('Helvetica').fillColor('black');
      doc.text(`Transaction Count: ${overview.transactionCount}`);
      doc.moveDown(0.3);

      doc.fontSize(12).font('Helvetica-Bold').text('Invoice Summary');
      doc.fontSize(10).font('Helvetica');
      doc.text(`Outstanding: ${formatCurrency(overview.outstandingAmount, currency)} (${overview.outstandingInvoiceCount} invoices)`);
      doc.text(`Overdue: ${formatCurrency(overview.overdueAmount, currency)} (${overview.overdueInvoiceCount} invoices)`);
      doc.moveDown(1);

      const footerY = doc.page.height - 50;
      doc.fontSize(8).font('Helvetica').fillColor('gray');
      doc.text(`Currency: ${currency}`, 50, footerY, { align: 'center' });
      doc.text(`Page 1`, 50, footerY + 10, { align: 'center' });

      doc.end();
    });
  }

  async generateTransactionPdf(
    businessId: string,
    title: string,
    rows: Array<{ date: string; type: string; description: string; categoryName: string; amount: number }>,
    currency: string,
  ): Promise<Buffer> {
    const business = await this.businessModel.findById(new Types.ObjectId(businessId));
    const businessName = business?.name || 'Business';

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      let pageNumber = 1;

      const addHeader = () => {
        doc.fontSize(16).font('Helvetica-Bold').text(businessName, { align: 'left' });
        doc.fontSize(12).font('Helvetica').text(title);
        doc.text(`Generated: ${new Date().toLocaleDateString('en-LK')}`);
        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(0.5);
      };

      addHeader();

      const colDate = 50;
      const colType = 130;
      const colDesc = 190;
      const colCategory = 370;
      const colAmount = 470;

      const drawTableHeader = () => {
        doc.fontSize(8).font('Helvetica-Bold').fillColor('black');
        doc.text('Date', colDate, doc.y, { width: 75 });
        doc.text('Type', colType, doc.y - 11, { width: 55 });
        doc.text('Description', colDesc, doc.y - 11, { width: 175 });
        doc.text('Category', colCategory, doc.y - 11, { width: 95 });
        doc.text('Amount', colAmount, doc.y - 11, { width: 70, align: 'right' });
        doc.moveDown(0.3);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(0.3);
      };

      drawTableHeader();
      doc.font('Helvetica').fontSize(8);

      for (const row of rows) {
        if (doc.y > 720) {
          doc.addPage();
          pageNumber++;
          addHeader();
          drawTableHeader();
          doc.font('Helvetica').fontSize(8);
        }

        const y = doc.y;
        const dateStr = new Date(row.date).toLocaleDateString('en-LK');
        doc.fillColor('black').text(dateStr, colDate, y, { width: 75 });
        doc.text(row.type, colType, y, { width: 55 });
        doc.text(row.description || '-', colDesc, y, { width: 175 });
        doc.text(row.categoryName || '-', colCategory, y, { width: 95 });
        const amountStr = formatCurrency(row.amount, currency);
        doc.text(amountStr, colAmount, y, { width: 70, align: 'right' });
        doc.moveDown(0.5);
      }

      doc.fontSize(8).font('Helvetica').fillColor('gray');
      doc.text(`Page ${pageNumber}`, 50, doc.page.height - 50, { align: 'center' });

      doc.end();
    });
  }

  generateFilename(businessName: string, reportType: string, startDate: string, endDate: string): string {
    const safeName = businessName.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30);
    const from = startDate.split('T')[0];
    const to = endDate.split('T')[0];
    return `${safeName}-${reportType}-${from}-to-${to}.pdf`;
  }
}
