import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BusinessQueryType } from '../../enums/business-query.enums';
import type { BusinessQueryClassification } from '../interfaces/business-query.interface';

@Injectable()
export class BusinessQueryClassifierService {
  private readonly logger = new Logger(BusinessQueryClassifierService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('AI_API_KEY') || '';
    this.model = this.configService.get<string>('AI_MODEL') || 'gpt-4o-mini';
    this.timeoutMs = this.configService.get<number>('AI_REQUEST_TIMEOUT_MS') || 15000;
  }

  async classify(question: string): Promise<BusinessQueryClassification> {
    if (!this.apiKey) {
      this.logger.warn('AI_API_KEY not configured, using fallback classification');
      return this.fallbackClassification(question);
    }

    const systemPrompt = this.buildClassifierPrompt();
    const userMessage = question;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: userMessage }],
              },
            ],
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json',
            },
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`Gemini API error: ${response.status} - ${errText}`);
        return this.fallbackClassification(question);
      }

      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        this.logger.error('No content in classifier response');
        return this.fallbackClassification(question);
      }

      return this.parseClassification(content);
    } catch (error) {
      this.logger.error(`Classifier API call failed: ${error}`);
      return this.fallbackClassification(question);
    }
  }

  private buildClassifierPrompt(): string {
    return `You are a business-finance question classifier.

Your ONLY job is to classify the user's question into a structured query type.

You do NOT answer the financial question.
You do NOT calculate totals.
You do NOT invent business information.
You do NOT access any database.
You do NOT modify any data.

Identify only:
- query type
- requested date range
- customer name if explicitly mentioned
- invoice number if explicitly mentioned
- result limit if explicitly requested

AVAILABLE QUERY TYPES:
- income_total: Questions about total recorded income (e.g. "How much income?", "What is my income this month?")
- expense_total: Questions about total recorded expenses (e.g. "How much did I spend?", "What are my expenses?")
- net_cash_flow: Questions about income minus expenses (e.g. "Am I making more than I spend?", "What is my net cash flow?")
- transaction_count: Questions about number of transactions (e.g. "How many expenses?", "How many transactions?")
- expense_category_breakdown: Questions about expense categories (e.g. "Where did I spend the most?", "What are my biggest expenses?", "Breakdown of expenses")
- income_category_breakdown: Questions about income categories (e.g. "Where does my income come from?")
- outstanding_amount: Questions about total outstanding/in unpaid amounts (e.g. "How much money is owed to me?", "How much is outstanding?")
- outstanding_invoices: Questions about count of outstanding invoices (e.g. "How many unpaid invoices?")
- overdue_invoices: Questions about overdue invoices (e.g. "Which invoices are overdue?", "What payments are overdue?")
- unpaid_customers: Questions about customers who owe money (e.g. "Who has not paid me?", "Who owes me money?", "Which customers have outstanding balances?")
- invoice_status: Questions about a specific invoice (e.g. "Has invoice INV-2026-000015 been paid?", "What is the status of invoice X?")
- recent_transactions: Questions about recent transactions (e.g. "Show my last 5 transactions", "Recent activity")
- unknown: Questions that cannot be classified into the above types (e.g. forecasting, tax calculation, general advice)

DATE RANGE PRESETS:
- today, yesterday, this_week, last_week, this_month, last_month, this_year
- custom (when user specifies explicit dates)

If no date range is mentioned, use "this_month" as default.

OUTPUT FORMAT (JSON only):
{
  "intent": "business_query",
  "queryType": "one of the available query types",
  "confidence": 0.0-1.0,
  "dateRange": {
    "preset": "preset name or custom",
    "startDate": "YYYY-MM-DD or null",
    "endDate": "YYYY-MM-DD or null"
  },
  "customerName": "exact customer name if mentioned or null",
  "invoiceNumber": "invoice number if mentioned or null",
  "limit": number or null
}`;
  }

  private parseClassification(content: string): BusinessQueryClassification {
    try {
      const parsed = JSON.parse(content) as Record<string, unknown>;

      const queryType = this.validateQueryType(parsed.queryType as string);
      const confidence = typeof parsed.confidence === 'number'
        ? Math.min(1, Math.max(0, parsed.confidence))
        : 0.5;

      const dateRange = parsed.dateRange as Record<string, unknown> | undefined;

      return {
        intent: 'business_query',
        queryType,
        confidence,
        dateRange: dateRange ? {
          preset: (dateRange.preset as string) || 'this_month',
          startDate: (dateRange.startDate as string) || null,
          endDate: (dateRange.endDate as string) || null,
        } : undefined,
        customerName: (parsed.customerName as string) || null,
        invoiceNumber: (parsed.invoiceNumber as string) || null,
        limit: typeof parsed.limit === 'number' ? parsed.limit : null,
      };
    } catch {
      this.logger.error('Failed to parse classifier output');
      return {
        intent: 'business_query',
        queryType: BusinessQueryType.UNKNOWN,
        confidence: 0,
      };
    }
  }

  private validateQueryType(raw: string): BusinessQueryType {
    const validTypes = Object.values(BusinessQueryType);
    if (validTypes.includes(raw as BusinessQueryType)) {
      return raw as BusinessQueryType;
    }
    return BusinessQueryType.UNKNOWN;
  }

  private fallbackClassification(question: string): BusinessQueryClassification {
    const q = question.toLowerCase();

    const hasExpenseTotal = q.includes('spend') || q.includes('expense') || q.includes('cost') || q.includes('payment');
    const hasIncomeTotal = q.includes('income') || q.includes('revenue') || q.includes('earn') || q.includes('received') || q.includes('came in');
    const hasNetCashFlow = q.includes('net') || q.includes('cash flow') || (hasIncomeTotal && hasExpenseTotal && (q.includes('more') || q.includes('vs') || q.includes('compare')));
    const hasOutstanding = q.includes('outstanding') || q.includes('owed') || q.includes('owe') || q.includes('balance due');
    const hasOverdue = q.includes('overdue') || q.includes('late');
    const hasUnpaid = q.includes('not paid') || q.includes('unpaid') || q.includes('who owes');
    const hasRecent = q.includes('recent') || q.includes('last ') || q.includes('latest');
    const hasBreakdown = q.includes('category') || q.includes('breakdown') || q.includes('biggest') || q.includes('most') || q.includes('where');
    const hasInvoiceStatus = q.includes('invoice') && (q.includes('status') || q.includes('paid') || q.includes('inv-'));
    const hasCount = q.includes('how many');

    let queryType = BusinessQueryType.UNKNOWN;
    let confidence = 0.5;

    if (hasNetCashFlow) { queryType = BusinessQueryType.NET_CASH_FLOW; confidence = 0.7; }
    else if (hasInvoiceStatus) { queryType = BusinessQueryType.INVOICE_STATUS; confidence = 0.6; }
    else if (hasOverdue) { queryType = BusinessQueryType.OVERDUE_INVOICES; confidence = 0.7; }
    else if (hasUnpaid) { queryType = BusinessQueryType.UNPAID_CUSTOMERS; confidence = 0.7; }
    else if (hasOutstanding) { queryType = BusinessQueryType.OUTSTANDING_AMOUNT; confidence = 0.7; }
    else if (hasBreakdown && hasExpenseTotal) { queryType = BusinessQueryType.EXPENSE_CATEGORY_BREAKDOWN; confidence = 0.7; }
    else if (hasBreakdown && hasIncomeTotal) { queryType = BusinessQueryType.INCOME_CATEGORY_BREAKDOWN; confidence = 0.7; }
    else if (hasBreakdown) { queryType = BusinessQueryType.EXPENSE_CATEGORY_BREAKDOWN; confidence = 0.5; }
    else if (hasCount && hasExpenseTotal) { queryType = BusinessQueryType.TRANSACTION_COUNT; confidence = 0.7; }
    else if (hasCount && hasIncomeTotal) { queryType = BusinessQueryType.TRANSACTION_COUNT; confidence = 0.7; }
    else if (hasCount) { queryType = BusinessQueryType.TRANSACTION_COUNT; confidence = 0.5; }
    else if (hasRecent) { queryType = BusinessQueryType.RECENT_TRANSACTIONS; confidence = 0.7; }
    else if (hasExpenseTotal) { queryType = BusinessQueryType.EXPENSE_TOTAL; confidence = 0.6; }
    else if (hasIncomeTotal) { queryType = BusinessQueryType.INCOME_TOTAL; confidence = 0.6; }

    return {
      intent: 'business_query',
      queryType,
      confidence,
      dateRange: { preset: 'this_month' },
    };
  }
}
