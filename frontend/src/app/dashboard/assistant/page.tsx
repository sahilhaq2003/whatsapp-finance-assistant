'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { aiBusinessQueryService } from '@/services/ai-business-query.service';
import { minorToDisplay, formatCurrencyAmount } from '@/utils/financial';
import type {
  BusinessQueryResponse,
  SuggestedQuestion,
  CategoryBreakdownData,
  UnpaidCustomersData,
  OverdueInvoicesData,
  InvoiceStatusData,
  NetCashFlowData,
  TransactionCountData,
  OutstandingAmountData,
  RecentTransactionsData,
} from '@/types/ai-business-query';

const suggestedQuestions: SuggestedQuestion[] = [
  { label: 'Expenses this month', question: 'How much did I spend this month?' },
  { label: 'Income this month', question: 'What is my income this month?' },
  { label: 'Net cash flow', question: 'What is my net cash flow this month?' },
  { label: 'Who owes me', question: 'Who has not paid me?' },
  { label: 'Overdue invoices', question: 'Which invoices are overdue?' },
  { label: 'Biggest expenses', question: 'What are my biggest expenses this month?' },
  { label: 'Recent transactions', question: 'Show my last 5 transactions' },
  { label: 'Transaction count', question: 'How many transactions this month?' },
];

interface Message {
  id: string;
  type: 'user' | 'assistant';
  text: string;
  result?: BusinessQueryResponse['result'];
  timestamp: Date;
}

export default function AssistantPage() {
  const { selectedBusiness, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  useEffect(() => {
    setMessages([]);
  }, [selectedBusiness?._id]);

  const handleAsk = async (question: string) => {
    const q = question.trim();
    if (!q || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: q,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await aiBusinessQueryService.askBusinessQuestion(q);
      if (res.success) {
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          text: res.data.answer,
          result: res.data.result,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        text: err.message || 'Something went wrong. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAsk(input);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-[#17211c]">AI Assistant</h1>
        <p className="text-sm text-slate-500">
          Ask about your recorded business data
        </p>
      </div>

      <div className="flex-1 overflow-y-auto rounded-[1.5rem] border bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8">
            <div className="mb-6 rounded-full bg-emerald-50 p-4">
              <svg className="h-8 w-8 text-emerald-700" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
            </div>
            <p className="mb-2 text-lg font-medium text-[#17211c]">Ask a question</p>
            <p className="mb-6 text-sm text-slate-500">
              Query your income, expenses, invoices, and outstanding payments
            </p>
            <div className="grid max-w-lg grid-cols-2 gap-2">
              {suggestedQuestions.map((sq) => (
                <button
                  key={sq.question}
                  onClick={() => handleAsk(sq.question)}
                  className="rounded-2xl border border-slate-100 bg-[#f4f6f3] px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                >
                  {sq.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`mb-4 flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-[1.5rem] px-4 py-3 ${
                    msg.type === 'user'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-[#17211c]'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{msg.text}</p>
                  {msg.result && msg.result.period && (
                    <p className="mt-1 text-xs opacity-70">
                      Period: {msg.result.period.startDate} to {msg.result.period.endDate}
                    </p>
                  )}
                  {msg.result && <ResultDetails result={msg.result} />}
                </div>
              </div>
            ))}
            {loading && (
              <div className="mb-4 flex justify-start">
                <div className="rounded-[1.5rem] bg-slate-100 px-4 py-3">
                  <p className="text-sm text-slate-500">Checking your business records...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your business..."
          disabled={loading}
          className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-2xl bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function ResultDetails({ result }: { result: BusinessQueryResponse['result'] }) {
  if (!result || !result.data) return null;

  const currency = result.currency || 'LKR';

  switch (result.queryType) {
    case 'expense_total':
    case 'income_total': {
      const d = result.data as { amountDisplay: number; transactionCount: number; currency: string };
      if (d.transactionCount === 0) return null;
      return (
        <div className="mt-2 rounded-2xl bg-white/10 p-2 text-xs">
          <p>Amount: {formatCurrencyAmount(d.amountDisplay * 100, d.currency)}</p>
          <p>Transactions: {d.transactionCount}</p>
        </div>
      );
    }

    case 'net_cash_flow': {
      const d = result.data as NetCashFlowData;
      return (
        <div className="mt-2 rounded-2xl bg-white/10 p-2 text-xs space-y-0.5">
          <p>Income: {formatCurrencyAmount(d.incomeAmountDisplay * 100, d.currency)}</p>
          <p>Expenses: {formatCurrencyAmount(d.expenseAmountDisplay * 100, d.currency)}</p>
          <p className="font-medium">Net: {d.netCashFlowMinor >= 0 ? '' : '-'}{formatCurrencyAmount(Math.abs(d.netCashFlowDisplay) * 100, d.currency)}</p>
        </div>
      );
    }

    case 'transaction_count': {
      const d = result.data as TransactionCountData;
      return (
        <div className="mt-2 rounded-2xl bg-white/10 p-2 text-xs space-y-0.5">
          <p>Total: {d.totalCount}</p>
          {d.incomeCount > 0 && <p>Income: {d.incomeCount}</p>}
          {d.expenseCount > 0 && <p>Expenses: {d.expenseCount}</p>}
        </div>
      );
    }

    case 'expense_category_breakdown':
    case 'income_category_breakdown': {
      const d = result.data as CategoryBreakdownData;
      if (!d.categories || d.categories.length === 0) return null;
      return (
        <div className="mt-2 rounded-2xl bg-white/10 p-2 text-xs space-y-1">
          {d.categories.slice(0, 5).map((cat, i) => (
            <div key={cat.categoryId} className="flex justify-between">
              <span>{i + 1}. {cat.categoryName}</span>
              <span>{formatCurrencyAmount(cat.amountDisplay * 100, currency)}</span>
            </div>
          ))}
        </div>
      );
    }

    case 'outstanding_amount': {
      const d = result.data as OutstandingAmountData;
      return (
        <div className="mt-2 rounded-2xl bg-white/10 p-2 text-xs">
          <p>Total: {formatCurrencyAmount(d.amountDisplay * 100, d.currency)}</p>
          <p>Invoices: {d.outstandingInvoiceCount}</p>
        </div>
      );
    }

    case 'unpaid_customers': {
      const d = result.data as UnpaidCustomersData;
      if (!d.customers || d.customers.length === 0) return null;
      return (
        <div className="mt-2 rounded-2xl bg-white/10 p-2 text-xs space-y-1">
          {d.customers.slice(0, 5).map((c) => (
            <div key={c.customerId} className="flex justify-between">
              <span>{c.customerName} ({c.invoiceCount} inv{c.invoiceCount !== 1 ? 's' : ''})</span>
              <span>{formatCurrencyAmount(c.outstandingAmountDisplay * 100, currency)}</span>
            </div>
          ))}
        </div>
      );
    }

    case 'overdue_invoices': {
      const d = result.data as OverdueInvoicesData;
      if (!d.invoices || d.invoices.length === 0) return null;
      return (
        <div className="mt-2 rounded-2xl bg-white/10 p-2 text-xs space-y-1">
          {d.invoices.slice(0, 5).map((inv) => (
            <div key={inv.invoiceId} className="flex justify-between">
              <span>{inv.invoiceNumber} — {inv.customerName}</span>
              <span>{formatCurrencyAmount(inv.remainingMinor, currency)}</span>
            </div>
          ))}
        </div>
      );
    }

    case 'invoice_status': {
      const d = result.data as InvoiceStatusData;
      if (!d.found) return null;
      return (
        <div className="mt-2 rounded-2xl bg-white/10 p-2 text-xs space-y-0.5">
          <p>Customer: {d.customerName}</p>
          <p>Status: {d.paymentStatus?.replace('_', ' ')}</p>
          <p>Total: {formatCurrencyAmount(d.totalMinor || 0, d.currency || currency)}</p>
          <p>Paid: {formatCurrencyAmount(d.paidMinor || 0, d.currency || currency)}</p>
          <p>Remaining: {formatCurrencyAmount(d.remainingMinor || 0, d.currency || currency)}</p>
        </div>
      );
    }

    case 'recent_transactions': {
      const d = result.data as RecentTransactionsData;
      if (!d.transactions || d.transactions.length === 0) return null;
      return (
        <div className="mt-2 rounded-2xl bg-white/10 p-2 text-xs space-y-1">
          {d.transactions.slice(0, 5).map((tx) => (
            <div key={tx.id} className="flex justify-between">
              <span>{tx.type === 'income' ? 'Inc' : 'Exp'} — {tx.description || tx.categoryName}</span>
              <span>{formatCurrencyAmount(tx.amountDisplay * 100, tx.currency)}</span>
            </div>
          ))}
        </div>
      );
    }

    default:
      return null;
  }
}
