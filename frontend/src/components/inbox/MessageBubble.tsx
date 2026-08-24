'use client';

import type { InboxMessage } from '@/types/whatsapp';

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function DeliveryTicks({ message }: { message: InboxMessage }) {
  if (message.direction !== 'outbound') return null;

  if (message.deliveryStatus === 'failed') {
    return (
      <span className="ml-1 font-bold text-rose-300" title="Message failed to deliver">
        !
      </span>
    );
  }
  if (message.deliveryStatus === 'read') {
    return (
      <span className="ml-1 text-sky-200" title="Read">
        &#10003;&#10003;
      </span>
    );
  }
  if (message.deliveryStatus === 'delivered') {
    return (
      <span className="ml-1" title="Delivered">
        &#10003;&#10003;
      </span>
    );
  }
  return (
    <span className="ml-1 opacity-70" title="Sent">
      &#10003;
    </span>
  );
}

export default function MessageBubble({ message }: { message: InboxMessage }) {
  const isInbound = message.direction === 'inbound';
  const isMedia = ['image', 'audio', 'document', 'video', 'sticker'].includes(
    message.messageType,
  );

  const originLabel = !isInbound
    ? message.senderType === 'ai'
      ? `AI reply${message.humanEdited ? ' (edited)' : ''} · human approved`
      : 'Sent by agent'
    : null;

  return (
    <div className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[78%] rounded-2xl px-3.5 py-2 shadow-sm sm:max-w-[65%] ${
          isInbound
            ? 'rounded-bl-md bg-white text-[#17211c]'
            : 'rounded-br-md bg-[#0d4336] text-white'
        }`}
      >
        {isMedia && (
          <p
            className={`mb-1 text-xs italic ${
              isInbound ? 'text-slate-400' : 'text-emerald-100'
            }`}
          >
            [{message.messageType} message]
          </p>
        )}
        {message.text && (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {message.text}
          </p>
        )}
        <div
          className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
            isInbound ? 'text-slate-400' : 'text-emerald-100/80'
          }`}
        >
          {originLabel && <span className="mr-auto">{originLabel}</span>}
          <span>{formatTimestamp(message.timestamp)}</span>
          <DeliveryTicks message={message} />
        </div>
      </div>
    </div>
  );
}
