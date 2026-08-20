import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  Inject,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BusinessAccessGuard } from '../auth/guards/business-access.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentBusiness } from '../auth/decorators/current-business.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { BusinessContext } from '../auth/interfaces/authenticated-request.interface';
import { InvoicesService } from './invoices.service';
import { InvoicePdfService } from './services/invoice-pdf.service';
import { LocalFileStorageService } from '../files/local-file-storage.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceQueryDto } from './dto/invoice-query.dto';
import { VoidInvoiceDto } from './dto/void-invoice.dto';

@Controller('invoices')
@UseGuards(JwtAuthGuard, BusinessAccessGuard)
export class InvoicesController {
  private readonly logger = new Logger(InvoicesController.name);

  constructor(
    private invoicesService: InvoicesService,
    private invoicePdfService: InvoicePdfService,
    private configService: ConfigService,
    private fileStorage: LocalFileStorageService,
  ) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
    @Body() dto: CreateInvoiceDto,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }
    const invoice = await this.invoicesService.create(
      business.businessId,
      user.userId,
      dto,
    );
    return {
      success: true,
      message: 'Invoice created successfully',
      data: invoice,
    };
  }

  @Get('summary/outstanding')
  async getOutstandingSummary(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }
    const summary = await this.invoicesService.getOutstandingSummary(
      business.businessId,
    );
    return { success: true, data: summary };
  }

  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
    @Query() query: InvoiceQueryDto,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }
    const result = await this.invoicesService.findAll(
      business.businessId,
      query,
    );
    return { success: true, data: result };
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
    @Param('id') id: string,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }
    const invoice = await this.invoicesService.findById(
      business.businessId,
      id,
    );
    const items = await this.invoicesService.getItems(
      business.businessId,
      id,
    );
    const paymentSummary = await this.invoicesService.getInvoicePaymentSummary(
      business.businessId,
      id,
    );

    const isOverdue =
      invoice.status === 'issued' &&
      invoice.paymentStatus !== 'paid' &&
      invoice.dueDate &&
      new Date(invoice.dueDate) < new Date();

    return {
      success: true,
      data: {
        ...invoice.toObject(),
        items,
        paymentSummary,
        isOverdue,
      },
    };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }
    const invoice = await this.invoicesService.update(
      business.businessId,
      user.userId,
      id,
      dto,
    );
    return {
      success: true,
      message: 'Invoice updated successfully',
      data: invoice,
    };
  }

  @Post(':id/issue')
  async issue(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
    @Param('id') id: string,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }
    const invoice = await this.invoicesService.issue(
      business.businessId,
      user.userId,
      id,
    );

    let pdfKey: string | undefined;
    try {
      const pdfBuffer = await this.invoicePdfService.generatePdf(
        id,
        business.businessId,
      );
      const filename = this.invoicePdfService.sanitizeFilename(
        invoice.invoiceNumber,
      );
      const key = `invoices/${business.businessId}/${filename}.pdf`;
      await this.fileStorage.save(key, pdfBuffer, 'application/pdf');
      await this.invoicesService.savePdfKey(
        business.businessId,
        id,
        key,
      );
      pdfKey = key;
    } catch (error) {
      this.logger.error('Failed to generate invoice PDF', error);
    }

    return {
      success: true,
      message: 'Invoice issued successfully',
      data: { ...invoice.toObject(), pdfKey },
    };
  }

  @Post(':id/void')
  async void(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
    @Param('id') id: string,
    @Body() dto: VoidInvoiceDto,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }
    const invoice = await this.invoicesService.void(
      business.businessId,
      user.userId,
      id,
      dto.reason,
    );
    return {
      success: true,
      message: 'Invoice voided successfully',
      data: invoice,
    };
  }

  @Get(':id/pdf')
  async downloadPdf(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    if (!user || !business) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    try {
      const invoice = await this.invoicesService.findById(
        business.businessId,
        id,
      );

      let pdfBuffer: Buffer | null = null;

      if (invoice.pdfKey) {
        try {
          pdfBuffer = await this.fileStorage.get(invoice.pdfKey);
        } catch {
          // File not found, regenerate
        }
      }

      if (!pdfBuffer) {
        pdfBuffer = await this.invoicePdfService.generatePdf(
          id,
          business.businessId,
        );
      }

      const filename = this.invoicePdfService.sanitizeFilename(
        invoice.invoiceNumber,
      );
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}.pdf"`,
      });
      res.send(pdfBuffer);
    } catch (error) {
      this.logger.error('Failed to download invoice PDF', error);
      return res
        .status(404)
        .json({ success: false, message: 'Invoice not found' });
    }
  }

  @Get(':id/payments')
  async getPayments(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentBusiness() business: BusinessContext,
    @Param('id') id: string,
  ) {
    if (!user || !business) {
      return { success: false, message: 'Unauthorized' };
    }
    const result = await this.invoicesService.getPayments(
      business.businessId,
      id,
    );
    return { success: true, data: result };
  }
}
