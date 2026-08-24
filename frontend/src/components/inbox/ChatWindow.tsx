'use client';

import { useEffect, useRef } from 'react';
import type {
  InboxAiDraft,
  InboxConversation,
  InboxMessage,
} from '@/types/whatsapp';
import MessageBubble from './MessageBubble';
import AISuggestedReply from './AISuggestedReply';
import ReplyComposer from './ReplyComposer';

export default function ChatWindow({
  conversation,
  messages,
  draft,
  animateDraft,
  composerText,
  onComposerChange,
  onApproveDraft,
  onRejectDraft,
  onRegenerateDraft,
  onSendManual,
  approving,
  rejecting,
  regenerating,
  sendingManual,
  sendError,
  actionError,
  loadingHistory,
}: {
  conversation: InboxConversation;
  messages: InboxMessage[];
  draft: InboxAiDraft | null;
  animateDraft: boolean;
  composerText: string;
  onComposerChange: (text: string) => void;
  onApproveDraft: (finalText: string) => Promise<void>;
  onRejectDraft: () => Promise<void>;
  onRegenerateDraft: () => Promise<void>;
  onSendManual: () => Promise<void>;
  approving: boolean;
  rejecting: boolean;
  regenerating: boolean;
  sendingManual: boolean;
  sendError?: string;
  actionError?: string;
  loadingHistory: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !stickToBottomRef.current) return;
    container.scrollTop = container.scrollHeight;
  }, [messages, draft?.status, draft?.id, composerText]);

  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;
    stickToBottomRef.current =
      container.scrollHeight - container.scrollTop - container.clientHeight < 80;
  };

  const displayName =
    conversation.customerName || conversation.customerPhone;

  const showManualComposer =
    !draft || ['rejected', 'failed'].includes(draft.status);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#eef2ee]">
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0d4336] text-sm font-bold text-white">
          {displayName.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[#17211c]">{displayName}</p>
          <p className="truncate text-xs text-slate-500">
            {conversation.customerPhone}
          </p>
        </div>
        <span
          className={`ml-auto rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
            conversation.status === 'open'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          {conversation.status}
        </span>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 space-y-2 overflow-y-auto px-4 py-4"
      >
        {loadingHistory ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Loading messages...
          </p>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No messages yet.
          </p>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
      </div>

      <div className="border-t border-slate-200 bg-white/70 pt-3 backdrop-blur">
        {actionError && (
          <p className="mx-auto mb-2 w-full max-w-3xl px-4">
            <span className="block rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {actionError}
            </span>
          </p>
        )}
        {draft && draft.status !== 'approved' && (
          <AISuggestedReply
            key={`${draft.id}:${draft.status}`}
            draft={draft}
            animate={animateDraft}
            approving={approving}
            rejecting={rejecting}
            regenerating={regenerating}
            onApprove={onApproveDraft}
            onReject={onRejectDraft}
            onRegenerate={onRegenerateDraft}
          />
        )}
        {showManualComposer && (
          <ReplyComposer
            value={composerText}
            onChange={onComposerChange}
            onSend={() => void onSendManual()}
            sending={sendingManual}
            lastCustomerMessageAt={conversation.lastCustomerMessageAt}
            error={sendError}
          />
        )}
        {draft?.status === 'waiting_for_approval' && (
          <p className="pb-2 text-center text-[11px] font-medium text-emerald-700">
            Review the AI suggestion above &mdash; it is only sent when you click
            Approve &amp; Send.
          </p>
        )}
      </div>
    </div>
  );
}
