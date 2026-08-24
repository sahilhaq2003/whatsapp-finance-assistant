import { Injectable, Logger } from '@nestjs/common';
import type { Response } from 'express';

export type InboxRealtimeEvent =
  | 'conversation_updated'
  | 'message_created'
  | 'draft_updated'
  | 'message_status';

interface InboxClient {
  businessId: string;
  write: (chunk: string) => void;
}

const HEARTBEAT_MS = 25000;

@Injectable()
export class WhatsAppRealtimeService {
  private readonly logger = new Logger(WhatsAppRealtimeService.name);
  private readonly clients = new Set<InboxClient>();
  private heartbeatTimer?: NodeJS.Timeout;

  subscribe(businessId: string, res: Response): void {
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const client: InboxClient = {
      businessId,
      write: (chunk: string) => res.write(chunk),
    };

    this.clients.add(client);
    this.startHeartbeat();

    client.write(
      `event: connected\ndata: ${JSON.stringify({ businessId })}\n\n`,
    );
    this.logger.log(
      `SSE client connected for business ${businessId} (${this.clients.size} total)`,
    );

    res.on('close', () => {
      this.clients.delete(client);
      if (this.clients.size === 0) this.stopHeartbeat();
      this.logger.log(
        `SSE client disconnected for business ${businessId} (${this.clients.size} total)`,
      );
    });
  }

  emit(businessId: string, event: InboxRealtimeEvent, payload: unknown): void {
    const frame = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    let delivered = 0;

    for (const client of this.clients) {
      if (client.businessId !== businessId) continue;
      try {
        client.write(frame);
        delivered += 1;
      } catch (error) {
        this.logger.warn(`Failed to write SSE frame: ${error}`);
        this.clients.delete(client);
      }
    }

    this.logger.debug(
      `Emitted ${event} to ${delivered} client(s) for business ${businessId}`,
    );
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => {
      for (const client of this.clients) {
        try {
          client.write(': ping\n\n');
        } catch {
          this.clients.delete(client);
        }
      }
    }, HEARTBEAT_MS);
    this.heartbeatTimer.unref?.();
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }
}
