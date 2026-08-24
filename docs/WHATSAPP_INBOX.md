# WhatsApp Inbox with Human-Approved AI Replies

The operator inbox is available at `/dashboard/inbox`. It follows one invariant:

> AI suggests -> a human reviews -> a human approves -> the backend sends.

AI generation never invokes the WhatsApp sending service. The only AI-send path is the authenticated `approve-and-send` endpoint, which atomically claims a waiting draft before sending it.

## Data model

- `whatsapp_conversations` stores one conversation per business/customer phone pair, including preview, unread count, and last customer message time.
- `message_events` stores inbound and outbound messages, provider IDs, direction, sender type, AI origin/edit flags, timestamps, and delivery state. The provider/message ID unique index deduplicates webhook retries.
- `whatsapp_ai_reply_drafts` stores generation/review state, original and final text, reviewer, timestamps, edit status, and the resulting outbound message ID.

Mongoose creates the new collections and indexes automatically at application startup; no manual migration is required.

## Secured API

All inbox routes require the normal login cookie/JWT and `X-Business-Id` membership check.

- `GET /api/whatsapp/inbox/conversations`
- `GET /api/whatsapp/inbox/conversations/:conversationId/messages`
- `POST /api/whatsapp/inbox/conversations/:conversationId/drafts`
- `POST /api/whatsapp/inbox/drafts/:draftId/reject`
- `POST /api/whatsapp/inbox/drafts/:draftId/approve-and-send` with `{ "text": "..." }`
- `POST /api/whatsapp/inbox/conversations/:conversationId/send-manual` with `{ "text": "..." }`
- `GET /api/whatsapp/inbox/stream` (authenticated SSE; the UI falls back to polling)

The existing public Meta webhook remains `GET/POST /api/whatsapp/webhook` and retains challenge and signature verification.

## Environment

No inbox-specific secret is added. Configure the existing server-side variables:

- `MONGODB_URI`
- `AI_API_KEY` and `AI_MODEL` (Gemini model name used by the existing provider)
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_APP_SECRET`
- `WHATSAPP_VERIFY_TOKEN`
- `FRONTEND_URL=https://salligo.com`

The frontend only needs `NEXT_PUBLIC_API_URL=https://api.salligo.com/api`. Never put Meta or AI credentials in a `NEXT_PUBLIC_` variable.

## Verification

Run locally from `backend`:

```bash
npm test -- --runInBand
npm run test:inbox-e2e
```

Then build the frontend from `frontend`:

```bash
npm run build
```

The inbox end-to-end test uses an in-memory database and local Meta API receiver while exercising the real application and configured AI provider. It verifies deduplication, authentication, draft-only generation, approve/send, rejection, regeneration, manual sending, delivery states, SSE, concurrent customer messages, and the existing authorized-sender path.

For a live check, send a text from a customer number to the configured WhatsApp Business number, open `/dashboard/inbox`, review or edit the suggestion, and click **Approve & Send**. Messages outside Meta's 24-hour customer-service window are blocked with a template-required explanation.
