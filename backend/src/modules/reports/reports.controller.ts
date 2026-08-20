import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BusinessAccessGuard } from '../auth/guards/business-access.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentBusiness } from '../auth/decorators/current-business.decorator';
import { AuthenticatedUser, BusinessContext } from '../auth/interfaces/authenticated-request.interface';
import { ReportsService } from './services/reports.service';
import { TransactionReportService } from './services/transaction-report.service';
import { InvoiceReportService } from './services/invoice-report.service';
import { CustomerReportService } from './services/customer-report.service';
import { PaymentReportService } from './services/payment-report.service';
import { ReportPdfService } from './services/report-pdf.service';
import { ReportCsvService } from './services/report-csv.service';
import { ReportPeriodService } from './services/report-period.service';
import { ReportQueryDto } from './dto/report-query.dto';
import { TransactionReportQueryDto } from './dto/transaction-report-query.dto';
import { CategoryReportQueryDto } from './dto/category-report-query.dto';
import { CustomerReportQueryDto } from './dto/customer-report-query.dto';
import { InvoiceReportQueryDto } from './dto/invoice-report-query.dto';
import { ReportType } from './enums/report-type.enum';
import { ReportPeriod } from './enums/report-period.enum';
import { TransactionType } from '../../common/enums/transaction-type.enum';

@Controller('reports')
@UseGuards(JwtAuthGuard, BusinessAccessGuard)
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name);

  constructor(
    private readonly reportsService: ReportsService,
    private readonly transactionReportService: TransactionReportService,
    private readonly invoiceReportService: InvoiceReportService,
    private readonly customerReportService: CustomerReportService,
    private readonly paymentReportService: PaymentReportService,
    private readonly pdfService: ReportPdfService,
    private readonly csvService: ReportCsvService,
  ) {}

  @Get('overview')
  async getOverview(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
    @Query() query: ReportQueryDto,
  ) {
    if (!user || !business) return { success: false, message: 'Unauthorized' };
    const data = await this.reportsService.getFinancialOverview(business.businessId, query);
    return { success: true, data };
  }

  @Get('income')
  async getIncome(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
    @Query() query: TransactionReportQueryDto,
  ) {
    if (!user || !business) return { success: false, message: 'Unauthorized' };
    const periodResult = await this.reportsService.getCategoryBreakdown(
      business.businessId,
      TransactionType.INCOME,
      { period: query.period, dateFrom: query.dateFrom, dateTo: query.dateTo },
    );
    const transactions = await this.transactionReportService.getTransactionReport(business.businessId, {
      ...query,
      type: TransactionType.INCOME,
    });
    return {
      success: true,
      data: {
        ...periodResult,
        transactionCount: transactions.pagination.total,
        averageIncome: transactions.pagination.total > 0 ? Math.round(periodResult.total / transactions.pagination.total) : 0,
        transactions: transactions.transactions,
        pagination: transactions.pagination,
      },
    };
  }

  @Get('expenses')
  async getExpenses(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
    @Query() query: TransactionReportQueryDto,
  ) {
    if (!user || !business) return { success: false, message: 'Unauthorized' };
    const periodResult = await this.reportsService.getCategoryBreakdown(
      business.businessId,
      TransactionType.EXPENSE,
      { period: query.period, dateFrom: query.dateFrom, dateTo: query.dateTo },
    );
    const transactions = await this.transactionReportService.getTransactionReport(business.businessId, {
      ...query,
      type: TransactionType.EXPENSE,
    });
    return {
      success: true,
      data: {
        ...periodResult,
        transactionCount: transactions.pagination.total,
        averageExpense: transactions.pagination.total > 0 ? Math.round(periodResult.total / transactions.pagination.total) : 0,
        transactions: transactions.transactions,
        pagination: transactions.pagination,
      },
    };
  }

  @Get('income-vs-expenses')
  async getIncomeVsExpenses(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
    @Query() query: ReportQueryDto,
  ) {
    if (!user || !business) return { success: false, message: 'Unauthorized' };
    const data = await this.reportsService.getIncomeVsExpenses(business.businessId, query);
    return { success: true, data };
  }

  @Get('categories')
  async getCategories(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
    @Query() query: CategoryReportQueryDto,
  ) {
    if (!user || !business) return { success: false, message: 'Unauthorized' };
    const data = await this.reportsService.getCategoryReport(business.businessId, {
      period: query.period,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });
    return { success: true, data };
  }

  @Get('transactions')
  async getTransactions(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
    @Query() query: TransactionReportQueryDto,
  ) {
    if (!user || !business) return { success: false, message: 'Unauthorized' };
    if (query.customerId) {
      const valid = await this.reportsService.verifyCustomerOwnership(business.businessId, query.customerId);
      if (!valid) throw new BadRequestException('Customer not found in current business');
    }
    if (query.categoryId) {
      const valid = await this.reportsService.verifyCategoryOwnership(business.businessId, query.categoryId);
      if (!valid) throw new BadRequestException('Category not found in current business');
    }
    const data = await this.transactionReportService.getTransactionReport(business.businessId, query);
    return { success: true, data };
  }

  @Get('customers')
  async getCustomers(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
  ) {
    if (!user || !business) return { success: false, message: 'Unauthorized' };
    const data = await this.customerReportService.getCustomerReport(business.businessId);
    return { success: true, data };
  }

  @Get('customers/:customerId')
  async getCustomerDetail(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
    @Param('customerId') customerId: string,
  ) {
    if (!user || !business) return { success: false, message: 'Unauthorized' };
    const data = await this.customerReportService.getCustomerDetail(business.businessId, customerId);
    if (!data) throw new BadRequestException('Customer not found');
    return { success: true, data };
  }

  @Get('invoices/outstanding')
  async getOutstandingInvoices(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
  ) {
    if (!user || !business) return { success: false, message: 'Unauthorized' };
    const data = await this.invoiceReportService.getOutstandingInvoices(business.businessId);
    return { success: true, data };
  }

  @Get('invoices/overdue')
  async getOverdueInvoices(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
  ) {
    if (!user || !business) return { success: false, message: 'Unauthorized' };
    const data = await this.invoiceReportService.getOverdueInvoices(business.businessId);
    return { success: true, data };
  }

  @Get('payments')
  async getPayments(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
    @Query() query: ReportQueryDto & { customerId?: string; invoiceId?: string; method?: string; status?: string },
  ) {
    if (!user || !business) return { success: false, message: 'Unauthorized' };
    const data = await this.paymentReportService.getPaymentReport(business.businessId, query);
    return { success: true, data };
  }

  @Post('export')
  async exportReport(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
    @Body() body: { type: string; format: string; period?: ReportPeriod; dateFrom?: string; dateTo?: string },
    @Res() res: Response,
  ) {
    if (!user || !business) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const businessId = business.businessId;
    const query: ReportQueryDto = { period: body.period, dateFrom: body.dateFrom, dateTo: body.dateTo };

    try {
      if (body.format === 'csv') {
        await this.handleCsvExport(res, body.type, businessId, query);
      } else if (body.format === 'pdf') {
        await this.handlePdfExport(res, body.type, businessId, query);
      } else {
        res.status(400).json({ success: false, message: 'Invalid format. Use csv or pdf.' });
      }
    } catch (error) {
      this.logger.error(`Export failed: ${error.message}`);
      res.status(500).json({ success: false, message: 'Unable to generate the report. Please try again.' });
    }
  }

  private async handleCsvExport(res: Response, type: string, businessId: string, query: ReportQueryDto) {
    let csv = '';
    let filename = '';

    switch (type) {
      case ReportType.TRANSACTIONS: {
        const txQuery: TransactionReportQueryDto = { ...query, page: 1, limit: 10000 };
        const result = await this.transactionReportService.getTransactionReport(businessId, txQuery);
        csv = this.csvService.generateTransactionsCsv(result.transactions, result.currency);
        filename = this.csvService.sanitizeFilename(`transactions-${query.period || 'report'}.csv`);
        break;
      }
      case ReportType.OUTSTANDING_INVOICES: {
        const result = await this.invoiceReportService.getOutstandingInvoices(businessId);
        csv = this.csvService.generateOutstandingCsv(result.invoices, result.currency);
        filename = this.csvService.sanitizeFilename(`outstanding-invoices-${query.period || 'report'}.csv`);
        break;
      }
      case ReportType.OVERDUE_INVOICES: {
        const result = await this.invoiceReportService.getOverdueInvoices(businessId);
        csv = this.csvService.generateOutstandingCsv(result.invoices, result.currency);
        filename = this.csvService.sanitizeFilename(`overdue-invoices-${query.period || 'report'}.csv`);
        break;
      }
      case ReportType.PAYMENTS: {
        const result = await this.paymentReportService.getPaymentReport(businessId, query);
        csv = this.csvService.generatePaymentsCsv(result.payments, result.currency);
        filename = this.csvService.sanitizeFilename(`payments-${query.period || 'report'}.csv`);
        break;
      }
      case ReportType.CATEGORY_BREAKDOWN: {
        const result = await this.reportsService.getCategoryReport(businessId, query);
        csv = this.csvService.generateCategoryCsv(result.categories, result.currency);
        filename = this.csvService.sanitizeFilename(`categories-${query.period || 'report'}.csv`);
        break;
      }
      default:
        res.status(400).json({ success: false, message: `Unsupported export type: ${type}` });
        return;
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  private async handlePdfExport(res: Response, type: string, businessId: string, query: ReportQueryDto) {
    if (type === ReportType.FINANCIAL_OVERVIEW) {
      const overview = await this.reportsService.getFinancialOverview(businessId, query);
      const pdfBuffer = await this.pdfService.generateOverviewPdf(businessId, overview);
      const filename = this.pdfService.generateFilename(
        'report',
        'financial-overview',
        overview.period.startDate,
        overview.period.endDate,
      );
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdfBuffer);
    } else if (type === ReportType.TRANSACTIONS) {
      const txQuery: TransactionReportQueryDto = { ...query, page: 1, limit: 10000 };
      const result = await this.transactionReportService.getTransactionReport(businessId, txQuery);
      const pdfBuffer = await this.pdfService.generateTransactionPdf(
        businessId,
        'Transaction Report',
        result.transactions.map((t) => ({
          date: t.date,
          type: t.type,
          description: t.description,
          categoryName: t.categoryName,
          amount: t.amount,
        })),
        result.currency,
      );
      const filename = this.pdfService.generateFilename('report', 'transactions', query.dateFrom || new Date().toISOString(), query.dateTo || new Date().toISOString());
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdfBuffer);
    } else {
      res.status(400).json({ success: false, message: `PDF export not supported for type: ${type}` });
    }
  }
}
