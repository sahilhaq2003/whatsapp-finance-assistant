'use client';

import { useEffect, useState } from 'react';
import type { InboxAiDraft } from '@/types/whatsapp';

const TYPE_SPEED_MS = 14;

export default function AISuggestedReply({
  draft,
  animate,
  approving,
  rejecting,
  regenerating,
  onApprove,
  onReject,
  onRegenerate,
}: {
  draft: InboxAiDraft | null;
  animate: boolean;
  approving: boolean;
  rejecting: boolean;
  regenerating: boolean;
  onApprove: (finalText: string) => Promise<void>;
  onReject: () => Promise<void>;
  onRegenerate: () => Promise<void>;
}) {
  const suggestionText = draft?.originalText || '';
  // Remounted per draft/status (parent uses key), so lazy initializers are safe.
  const [typedLength, setTypedLength] = useState(() =>
    animate ? 0 : suggestionText.length,
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(suggestionText);

  useEffect(() => {
    if (!animate || !suggestionText) return;
    const timer = setInterval(() => {
      setTypedLength((current) => {
        if (current >= suggestionText.length) {
          clearInterval(timer);
          return current;
        }
        return current + 1;
      });
    }, TYPE_SPEED_MS);
    return () => clearInterval(timer);
  }, [animate, suggestionText]);

  if (!draft) return null;

  if (draft.status === 'generating') {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pb-2">
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
          </span>
          <p className="text-sm font-medium text-emerald-800">
            AI is preparing a suggested reply...
          </p>
        </div>
      </div>
    );
  }

  if (draft.status === 'failed') {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pb-2">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-800">
            AI could not prepare a reply
          </p>
          <p className="mt-0.5 text-xs text-amber-700">
            {draft.generationError ||
              'Something went wrong while generating the suggestion.'}
          </p>
          <button
            onClick={() => void onRegenerate()}
            disabled={regenerating}
            className="mt-2 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {regenerating ? 'Retrying...' : 'Try again'}
          </button>
        </div>
      </div>
    );
  }

  if (draft.status === 'rejected') {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pb-2">
        <p className="rounded-2xl bg-slate-100 px-4 py-2 text-xs text-slate-500">
          AI suggestion rejected. You can write a manual reply below or generate a
          new suggestion.
        </p>
      </div>
    );
  }

  if (draft.status !== 'waiting_for_approval') {
    return null;
  }

  const skipTypewriter = () => setTypedLength(suggestionText.length);

  const isTyping = typedLength < suggestionText.length;
  const displayText = isTyping
    ? suggestionText.slice(0, typedLength)
    : suggestionText;
  const finalText = isEditing ? editedText : suggestionText;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-2">
      <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-3 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            AI Suggested Reply
          </span>
          <span className="text-[11px] font-medium text-emerald-700">
            Waiting for approval &mdash; nothing has been sent
          </span>
        </div>

        {isEditing ? (
          <textarea
            value={editedText}
            onChange={(event) => setEditedText(event.target.value)}
            maxLength={4096}
            rows={Math.min(8, Math.max(3, editedText.split('\n').length + 1))}
            autoFocus
            className="w-full resize-none rounded-xl border border-emerald-300 bg-white px-3 py-2 text-sm text-[#17211c] focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
          />
        ) : (
          <p
            onClick={skipTypewriter}
            className={`whitespace-pre-wrap break-words rounded-xl bg-white px-3 py-2 text-sm leading-relaxed text-[#17211c] ${
              isTyping ? 'cursor-pointer' : ''
            }`}
          >
            {displayText}
            {isTyping && (
              <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-emerald-600 align-middle" />
            )}
          </p>
        )}

        {isEditing && editedText.trim() !== suggestionText.trim() && (
          <p className="mt-1.5 text-[11px] font-medium text-amber-600">
            Edited before sending &mdash; your changes will be recorded in the audit log.
          </p>
        )}

        <div className="mt-2.5 flex flex-wrap items-center justify-end gap-2">
          {isEditing ? (
            <button
              onClick={() => {
                setIsEditing(false);
                setEditedText(suggestionText);
              }}
              disabled={approving}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel edit
            </button>
          ) : (
            <button
              onClick={() => {
                skipTypewriter();
                setIsEditing(true);
              }}
              disabled={approving || rejecting || regenerating}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Edit
            </button>
          )}
          <button
            onClick={() => void onRegenerate()}
            disabled={approving || rejecting || regenerating}
            className="rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
          >
            {regenerating ? 'Regenerating...' : 'Regenerate'}
          </button>
          <button
            onClick={() => void onReject()}
            disabled={approving || rejecting || regenerating}
            className="rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
          >
            {rejecting ? 'Rejecting...' : 'Reject'}
          </button>
          <button
            onClick={() => void onApprove(finalText)}
            disabled={approving || rejecting || regenerating || !finalText.trim()}
            title="This is the only action that sends the message to the customer"
            className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {approving ? 'Sending...' : 'Approve & Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
