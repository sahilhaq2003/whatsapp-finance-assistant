'use client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const MONGO_OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

export type InboxStreamEvent =
  | 'connected'
  | 'conversation_updated'
  | 'message_created'
  | 'draft_updated'
  | 'message_status';

export interface InboxStreamPayload {
  conversation?: Record<string, unknown>;
  conversationId?: string;
  message?: Record<string, unknown>;
  draft?: Record<string, unknown>;
  providerMessageId?: string;
  status?: string;
}

interface StreamHandlers {
  onEvent: (event: InboxStreamEvent, payload: InboxStreamPayload) => void;
  onConnectionChange: (connected: boolean) => void;
}

/**
 * Consumes the backend SSE stream over fetch so we can attach the
 * X-Business-Id header and credentials cookie (native EventSource cannot).
 * Falls back gracefully: the caller is notified of disconnects so it can poll.
 */
export class InboxStreamClient {
  private controller: AbortController | null = null;
  private readonly businessId: string;
  private readonly handlers: StreamHandlers;
  private closedByUser = false;

  constructor(businessId: string, handlers: StreamHandlers) {
    this.businessId = businessId;
    this.handlers = handlers;
  }

  connect(): void {
    if (!MONGO_OBJECT_ID_PATTERN.test(this.businessId)) return;
    this.closedByUser = false;
    this.controller = new AbortController();

    fetch(`${API_BASE}/whatsapp/inbox/stream`, {
      method: 'GET',
      credentials: 'include',
      signal: this.controller.signal,
      headers: {
        Accept: 'text/event-stream',
        'X-Business-Id': this.businessId,
        'Cache-Control': 'no-cache',
      },
    })
      .then((response) => {
        if (!response.ok || !response.body) {
          throw new Error(`Stream unavailable (${response.status})`);
        }
        this.handlers.onConnectionChange(true);
        return this.readStream(response.body);
      })
      .catch((error) => {
        if (this.closedByUser || (error as Error).name === 'AbortError') return;
        this.handlers.onConnectionChange(false);
      });
  }

  close(): void {
    this.closedByUser = true;
    this.controller?.abort();
    this.controller = null;
    this.handlers.onConnectionChange(false);
  }

  private async readStream(body: ReadableStream<Uint8Array>): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1) {
          const frame = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          this.dispatchFrame(frame);
          boundary = buffer.indexOf('\n\n');
        }
      }
    } finally {
      reader.releaseLock();
    }

    if (!this.closedByUser) {
      this.handlers.onConnectionChange(false);
    }
  }

  private dispatchFrame(frame: string): void {
    let event: InboxStreamEvent | null = null;
    const dataLines: string[] = [];

    for (const line of frame.split('\n')) {
      if (line.startsWith('event:')) {
        event = line.slice(6).trim() as InboxStreamEvent;
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim());
      }
    }

    if (!event) return;

    let payload: InboxStreamPayload = {};
    if (dataLines.length > 0) {
      try {
        payload = JSON.parse(dataLines.join('\n')) as InboxStreamPayload;
      } catch {
        payload = {};
      }
    }

    try {
      this.handlers.onEvent(event, payload);
    } catch {
      // Never let a malformed payload break the stream loop.
    }
  }
}
