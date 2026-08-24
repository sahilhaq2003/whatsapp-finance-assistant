'use client';

import type { InboxConversation } from '@/types/whatsapp';

function formatTime(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
  loading,
}: {
  conversations: InboxConversation[];
  selectedId: string | null;
  onSelect: (conversationId: string) => void;
  loading: boolean;
}) {
  if (loading && conversations.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-sm text-slate-500">Loading conversations...</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-xl">
          @
        </div>
        <p className="text-sm font-semibold text-slate-700">No conversations yet</p>
        <p className="text-xs text-slate-500">
          When a customer messages your WhatsApp business number, the conversation
          appears here in real time.
        </p>
      </div>
    );
  }

  return (
    <ul className="h-full divide-y divide-slate-100 overflow-y-auto">
      {conversations.map((conversation) => {
        const isActive = conversation.id === selectedId;
        const displayName =
          conversation.customerName || conversation.customerPhone;

        return (
          <li key={conversation.id}>
            <button
              onClick={() => onSelect(conversation.id)}
              className={`w-full px-4 py-3 text-left transition ${
                isActive ? 'bg-emerald-50' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <p
                  className={`truncate text-sm font-semibold ${
                    isActive ? 'text-emerald-800' : 'text-[#17211c]'
                  }`}
                >
                  {displayName}
                </p>
                <span className="shrink-0 text-xs text-slate-400">
                  {formatTime(conversation.latestMessageAt)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="truncate text-xs text-slate-500">
                  {conversation.latestMessagePreview || 'No messages yet'}
                </p>
                {conversation.unreadCount > 0 && (
                  <span className="shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                    {conversation.unreadCount}
                  </span>
                )}
              </div>
              {!conversation.customerName && (
                <p className="mt-0.5 truncate text-[11px] text-slate-400">
                  {conversation.customerPhone}
                </p>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
