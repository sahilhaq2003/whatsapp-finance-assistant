'use client';

import { useEffect, useRef, useState } from 'react';

const CUSTOMER_SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

export default function ReplyComposer({
  value,
  onChange,
  onSend,
  sending,
  disabled,
  lastCustomerMessageAt,
  error,
}: {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  sending: boolean;
  disabled?: boolean;
  lastCustomerMessageAt?: string;
  error?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [windowOpen, setWindowOpen] = useState(true);

  useEffect(() => {
    const checkWindow = () => {
      setWindowOpen(
        !lastCustomerMessageAt ||
          Date.now() - new Date(lastCustomerMessageAt).getTime() <
            CUSTOMER_SERVICE_WINDOW_MS,
      );
    };
    checkWindow();
    const timer = setInterval(checkWindow, 60000);
    return () => clearInterval(timer);
  }, [lastCustomerMessageAt]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(160, textarea.scrollHeight)}px`;
  }, [value]);

  const canSend = windowOpen && !sending && !disabled && value.trim().length > 0;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (canSend) onSend();
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-4">
      {!windowOpen && (
        <p className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          The 24-hour WhatsApp customer service window has closed. Sending
          free-form replies requires an approved WhatsApp template message.
        </p>
      )}
      {error && (
        <p className="mb-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          {error}
        </p>
      )}
      <div className="flex items-end gap-2 rounded-[1.25rem] border border-slate-200 bg-white p-2 shadow-sm">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            windowOpen
              ? 'Write a reply to the customer...'
              : 'Replies are unavailable outside the 24-hour window'
          }
          rows={1}
          maxLength={4096}
          className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-[#17211c] outline-none placeholder:text-slate-400"
        />
        <button
          onClick={onSend}
          disabled={!canSend}
          title="Sends your message through WhatsApp"
          className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </div>
      <p className="mt-1 px-1 text-[11px] text-slate-400">
        Enter to send &middot; Shift+Enter for a new line
      </p>
    </div>
  );
}
