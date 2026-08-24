'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { whatsappService } from '@/services/whatsapp.service';
import {
  InboxStreamClient,
  type InboxStreamPayload,
} from '@/lib/inbox-stream';
import type {
  InboxAiDraft,
  InboxConversation,
  InboxMessage,
} from '@/types/whatsapp';
import ConversationList from '@/components/inbox/ConversationList';
import ChatWindow from '@/components/inbox/ChatWindow';

const POLL_INTERVAL_MS = 8000;
const RECONNECT_DELAY_MS = 4000;

export default function WhatsAppInboxPage() {
  const { selectedBusiness, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [draft, setDraft] = useState<InboxAiDraft | null>(null);
  const [animateDraft, setAnimateDraft] = useState(false);
  const [composerText, setComposerText] = useState('');

  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [sendingManual, setSendingManual] = useState(false);
  const [sendError, setSendError] = useState('');
  const [actionError, setActionError] = useState('');
  const [listError, setListError] = useState('');

  const [connected, setConnected] = useState(false);

  const streamRef = useRef<InboxStreamClient | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  const refreshConversations = useCallback(async () => {
    try {
      const res = await whatsappService.listInboxConversations();
      if (res.success) {
        setConversations(res.data.conversations || []);
      }
    } catch (error) {
      setListError(
        error instanceof Error ? error.message : 'Failed to load conversations',
      );
    }
  }, []);

  const refreshSelectedHistory = useCallback(async () => {
    const conversationId = selectedIdRef.current;
    if (!conversationId) return;
    try {
      const res = await whatsappService.getInboxConversation(conversationId);
      if (res.success) {
        setMessages(res.data.messages || []);
        setDraft(res.data.draft);
      }
    } catch {
      // Transient errors are retried by the next poll cycle.
    }
  }, []);

  const selectConversation = useCallback(
    async (conversationId: string) => {
      setSelectedId(conversationId);
      selectedIdRef.current = conversationId;
      setLoadingHistory(true);
      setDraft(null);
      setAnimateDraft(false);
      setActionError('');
      setSendError('');
      try {
        const res = await whatsappService.getInboxConversation(conversationId);
        if (res.success) {
          setMessages(res.data.messages || []);
          setDraft(res.data.draft);
          setConversations((current) =>
            current.map((conversation) =>
              conversation.id === conversationId
                ? { ...conversation, unreadCount: 0 }
                : conversation,
            ),
          );
        }
      } catch (error) {
        setActionError(
          error instanceof Error
            ? error.message
            : 'Failed to load this conversation',
        );
        setMessages([]);
      } finally {
        setLoadingHistory(false);
      }
    },
    [],
  );

  const upsertConversation = useCallback(
    (summary: Record<string, unknown>) => {
      const incoming: InboxConversation = {
        id: String(summary.id ?? summary._id ?? ''),
        customerPhone: String(summary.customerPhone ?? ''),
        customerName: (summary.customerName as string) || undefined,
        status: (summary.status as 'open' | 'closed') || 'open',
        unreadCount: Number(summary.unreadCount ?? 0),
        latestMessagePreview:
          (summary.latestMessagePreview as string) || undefined,
        latestMessageAt: (summary.latestMessageAt as string) || undefined,
        lastCustomerMessageAt:
          (summary.lastCustomerMessageAt as string) || undefined,
      };
      if (!incoming.id) return;

      setConversations((current) => {
        const rest = current.filter(
          (conversation) => conversation.id !== incoming.id,
        );
        const isSelected = incoming.id === selectedIdRef.current;
        if (isSelected && !incoming.customerName) {
          const previous = current.find((c) => c.id === incoming.id);
          if (previous?.customerName) {
            incoming.customerName = previous.customerName;
          }
        }
        if (isSelected && incoming.unreadCount > 0) {
          incoming.unreadCount = 0;
        }
        return [incoming, ...rest].sort(
          (a, b) =>
            new Date(b.latestMessageAt || 0).getTime() -
            new Date(a.latestMessageAt || 0).getTime(),
        );
      });
    },
    [],
  );

  const handleStreamEvent = useCallback(
    (event: string, payload: InboxStreamPayload) => {
      if (event === 'conversation_updated' && payload.conversation) {
        upsertConversation(payload.conversation);
        return;
      }

      if (event === 'message_created' && payload.message) {
        const message = payload.message as unknown as InboxMessage;
        if (
          payload.conversationId &&
          payload.conversationId !== selectedIdRef.current
        ) {
          void refreshConversations();
          return;
        }
        setMessages((current) =>
          current.some((existing) => existing.id === message.id)
            ? current.map((existing) =>
                existing.id === message.id ? { ...existing, ...message } : existing,
              )
            : [...current, message],
        );
        return;
      }

      if (event === 'draft_updated' && payload.draft) {
        if (
          payload.conversationId &&
          payload.conversationId !== selectedIdRef.current
        ) {
          return;
        }
        const incoming = payload.draft as unknown as InboxAiDraft;
        setDraft((current) => {
          if (current && current.status === 'rejected') {
            // The operator explicitly rejected; do not resurrect stale drafts.
            return current;
          }
          return incoming;
        });
        setAnimateDraft(true);
        setRegenerating(false);
        return;
      }

      if (event === 'message_status' && payload.providerMessageId) {
        setMessages((current) =>
          current.map((message) =>
            message.providerMessageId === payload.providerMessageId
              ? {
                  ...message,
                  deliveryStatus: payload.status as InboxMessage['deliveryStatus'],
                }
              : message,
          ),
        );
      }
    },
    [refreshConversations, upsertConversation],
  );

  // Real-time stream + polling fallback.
  useEffect(() => {
    const businessId = selectedBusiness?._id;
    if (!businessId) return;

    let disposed = false;

    const startPolling = () => {
      if (pollTimerRef.current) return;
      pollTimerRef.current = setInterval(() => {
        void refreshConversations();
        void refreshSelectedHistory();
      }, POLL_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };

    const scheduleReconnect = () => {
      if (disposed || reconnectTimerRef.current) return;
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        if (disposed) return;
        client.connect();
      }, RECONNECT_DELAY_MS);
    };

    const client = new InboxStreamClient(businessId, {
      onEvent: handleStreamEvent,
      onConnectionChange: (isConnected) => {
        if (disposed) return;
        setConnected(isConnected);
        if (isConnected) {
          stopPolling();
        } else {
          startPolling();
          scheduleReconnect();
        }
      },
    });

    client.connect();
    streamRef.current = client;

    return () => {
      disposed = true;
      client.close();
      stopPolling();
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [selectedBusiness?._id, handleStreamEvent, refreshConversations, refreshSelectedHistory]);

  const selectedBusinessId = selectedBusiness?._id;

  useEffect(() => {
    if (!selectedBusinessId) return;
    let cancelled = false;
    whatsappService
      .listInboxConversations()
      .then((res) => {
        if (cancelled) return;
        if (res.success) setConversations(res.data.conversations || []);
      })
      .catch(() => {
        // surfaced via the polling fallback / list error banner on retry
      })
      .finally(() => {
        if (!cancelled) setLoadingConversations(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedBusinessId]);

  useEffect(() => {
    if (
      !loadingConversations &&
      conversations.length > 0 &&
      !selectedId &&
      !selectedIdRef.current
    ) {
      void selectConversation(conversations[0].id);
    }
  }, [loadingConversations, conversations, selectedId, selectConversation]);

  const handleApproveDraft = useCallback(
    async (finalText: string) => {
      if (!draft || approving) return;
      setApproving(true);
      setActionError('');
      try {
        await whatsappService.approveAndSendInboxDraft(draft.id, finalText);
        setDraft(null);
        setAnimateDraft(false);
        await refreshSelectedHistory();
        void refreshConversations();
      } catch (error) {
        setActionError(
          error instanceof Error
            ? error.message
            : 'Failed to approve and send the reply',
        );
        await refreshSelectedHistory();
      } finally {
        setApproving(false);
      }
    },
    [draft, approving, refreshSelectedHistory, refreshConversations],
  );

  const handleRejectDraft = useCallback(async () => {
    if (!draft || rejecting) return;
    setRejecting(true);
    setActionError('');
    try {
      const res = await whatsappService.rejectInboxDraft(draft.id);
      if (res.success && res.data.draft) {
        setDraft({ ...res.data.draft });
      }
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Failed to reject the suggestion',
      );
    } finally {
      setRejecting(false);
    }
  }, [draft, rejecting]);

  const handleRegenerateDraft = useCallback(async () => {
    if (!selectedId || regenerating) return;
    setRegenerating(true);
    setActionError('');
    setDraft(null);
    try {
      const res = await whatsappService.generateInboxDraft(selectedId);
      if (res.success && res.data.draft) {
        setDraft(res.data.draft);
        setAnimateDraft(true);
      }
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'AI could not prepare a suggestion. Try again or write a manual reply.',
      );
    } finally {
      setRegenerating(false);
    }
  }, [selectedId, regenerating]);

  const handleSendManual = useCallback(async () => {
    if (!selectedId || sendingManual) return;
    const text = composerText.trim();
    if (!text) return;

    setSendingManual(true);
    setSendError('');
    try {
      await whatsappService.sendManualInboxReply(selectedId, text);
      setComposerText('');
      await refreshSelectedHistory();
      void refreshConversations();
    } catch (error) {
      setSendError(
        error instanceof Error
          ? error.message
          : 'Failed to send the reply. Please try again.',
      );
    } finally {
      setSendingManual(false);
    }
  }, [selectedId, composerText, sendingManual, refreshSelectedHistory, refreshConversations]);

  const selectedConversation =
    conversations.find((conversation) => conversation.id === selectedId) || null;

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#17211c]">WhatsApp Inbox</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Customer conversations with AI-drafted replies awaiting human approval.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            connected
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-amber-100 text-amber-700'
          }`}
          title={
            connected
              ? 'Live updates connected'
              : 'Live connection unavailable - refreshing periodically'
          }
        >
          {connected ? 'Live' : 'Polling'}
        </span>
      </div>

      {listError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">
          {listError}
        </div>
      )}

      <div className="grid h-[calc(100vh-14rem)] min-h-[480px] grid-cols-1 overflow-hidden rounded-[1.35rem] border border-slate-100 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)] lg:grid-cols-[340px_1fr]">
        <div className="min-h-0 border-b border-slate-100 lg:border-b-0 lg:border-r">
          <ConversationList
            conversations={conversations}
            selectedId={selectedId}
            onSelect={(id) => void selectConversation(id)}
            loading={loadingConversations}
          />
        </div>

        <div className="min-h-0">
          {selectedConversation ? (
            <ChatWindow
              conversation={selectedConversation}
              messages={messages}
              draft={draft}
              animateDraft={animateDraft}
              composerText={composerText}
              onComposerChange={setComposerText}
              onApproveDraft={handleApproveDraft}
              onRejectDraft={handleRejectDraft}
              onRegenerateDraft={handleRegenerateDraft}
              onSendManual={handleSendManual}
              approving={approving}
              rejecting={rejecting}
              regenerating={regenerating}
              sendingManual={sendingManual}
              sendError={sendError}
              actionError={actionError}
              loadingHistory={loadingHistory}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-lg text-emerald-600">
                &#9993;
              </div>
              <p className="text-sm font-semibold text-slate-700">
                Select a conversation
              </p>
              <p className="text-xs text-slate-500">
                Choose a customer on the left to view the full chat history and
                review AI-suggested replies.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
