# WhatsApp Webhook Contracts

> This document describes the inbound Meta (WhatsApp Business API) webhook endpoints, their expected payloads, verification flow, and internal processing logic.

---

## 1. GET `/api/whatsapp/webhook` — Verification

### Purpose

Meta sends a GET request to verify that your webhook endpoint is owned by you and is reachable. This is a one-time handshake that must respond with the `hub.challenge` value when the verify token matches.

### Authentication

None. This is a public endpoint.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `hub.mode` | string | Yes | Must be `"subscribe"` |
| `hub.verify_token` | string | Yes | The verify token you configured in the Meta app dashboard |
| `hub.challenge` | string | Yes | A random string Meta sends; you must echo it back |

### Expected Response

- **200 OK** — Plain-text body containing the `hub.challenge` string.
- **403 Forbidden** — Returned if `hub.verify_token` does not match the configured token.

### Notes

- No request body.
- No authentication or signature verification for this endpoint.

---

## 2. POST `/api/whatsapp/webhook` — Inbound Events

### Purpose

Receives all WhatsApp Business API events: incoming messages and delivery status updates.

### Authentication

No JWT authentication. The request is authenticated via HMAC-SHA256 signature verification.

### Request Headers

| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `x-hub-signature-256` | string | Yes | HMAC-SHA256 signature of the raw request body, computed with the app secret |

### Signature Verification

1. The raw request body is captured by a `RawBodyMiddleware` before any JSON parsing.
2. The `x-hub-signature-256` header value is compared against `HMAC-SHA256(app_secret, raw_body)`.
3. If the signature is invalid or missing, the endpoint returns **401 Unauthorized** and the event is rejected.

### Request Body Structure

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "<whatsapp_business_account_id>",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "1234567890",
              "phone_number_id": "<phone_number_id>"
            },
            "contacts": [
              {
                "wa_id": "<sender_phone>",
                "profile": {
                  "name": "<sender_name>"
                }
              }
            ],
            "messages": [
              {
                "from": "<sender_phone>",
                "id": "<provider_message_id>",
                "timestamp": "<unix_timestamp>",
                "type": "text",
                "text": {
                  "body": "<message_body>"
                }
              }
            ],
            "statuses": [
              {
                "id": "<provider_message_id>",
                "status": "sent|delivered|read|failed",
                "timestamp": "<unix_timestamp>",
                "recipient_id": "<recipient_phone>"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

> **Note:** The `messages` and `statuses` arrays are mutually exclusive per change — a single change will contain either `messages` (inbound) or `statuses` (delivery updates), not both.

### Supported Message Types

| Type | Description | Processing |
|------|-------------|------------|
| `text` | Plain text message | Checked for active proposal interaction (confirm/cancel/edit), otherwise processed via AI extraction |
| `audio` | Voice message (PTT or audio) | Requires voice feature flag enabled; downloaded, transcribed, then processed via AI extraction |
| `image` | Image attachment | Rejected with "unsupported" reply |
| `document` | Document attachment | Rejected with "unsupported" reply |
| `interactive` | Button/list selection | Checked for active proposal interaction |
| Any other | — | Logged and ignored |

### Delivery Status Values

| Status | Description |
|--------|-------------|
| `sent` | Message has been sent by the WhatsApp server |
| `delivered` | Message has been delivered to the recipient's device |
| `read` | Message has been read by the recipient |
| `failed` | Message delivery failed |

---

## 3. Processing Flow — Incoming Messages

### Step-by-Step

```
1. Raw body captured by RawBodyMiddleware
2. HMAC-SHA256 signature verified against app secret
3. Parse JSON body
4. Iterate entry[] -> changes[] -> value
5. Extract providerMessageId from message
6. Check idempotency (deduplicate by providerMessageId)
   - Unique compound index: { provider, providerMessageId }
   - If already processed -> return 200 OK (skip)
7. Resolve business via phoneNumberId:
   - phoneNumberId -> WhatsAppConnection -> Business
   - If no connection found -> log warning, return 200 OK
8. Find authorized sender:
   - sender phone + business -> WhatsAppAuthorizedSender
   - Only VERIFIED status senders are authorized
   - If unauthorized -> log, optionally reply "unauthorized", return 200 OK
9. Route by message type:
   a. TEXT:
      - Check for active AI proposal awaiting confirmation
        - "confirm" / "yes" / "ok" -> confirm proposal
        - "cancel" / "no" / "reject" -> reject proposal
        - Numeric edit -> update proposal amount
      - Otherwise -> process via AI extraction pipeline
   b. AUDIO:
      - Check voice feature flag for the business
      - If disabled -> reply "voice messages not enabled"
      - If enabled -> download audio from Meta CDN
      - Transcribe via speech-to-text service
      - Process transcribed text via AI extraction pipeline
   c. Other types:
      - Reply with "unsupported message type" message
10. Store outbound reply as MessageEvent (OUTBOUND direction)
```

### Idempotency

- Each inbound message has a unique `providerMessageId` assigned by Meta.
- A compound unique index on `{ provider, providerMessageId }` ensures each message is processed exactly once.
- Duplicate webhook deliveries (Meta retries on non-2xx) are silently ignored after the first successful processing.

### Business Resolution

```
phone_number_id (from webhook metadata)
  -> WhatsAppConnection.phoneNumberId
    -> WhatsAppConnection.businessId
      -> Business (active, with valid subscription)
```

- If the `phone_number_id` has no matching `WhatsAppConnection`, the event is logged and ignored.
- If the `WhatsAppConnection` is inactive or the business is suspended, the event is logged and ignored.

### Authorized Sender Verification

```
sender_phone (from message "from" field)
  + business_id (resolved above)
    -> WhatsAppAuthorizedSender
      -> status must be "VERIFIED"
```

- Only senders explicitly added and verified for a business can trigger financial operations.
- Unrecognized senders receive an informative reply but no data is extracted.

---

## 4. Processing Flow — Delivery Status Updates

### Step-by-Step

```
1. Extract providerMessageId and status from the statuses array
2. Look up the matching outbound MessageEvent by providerMessageId
3. Update MessageEvent.deliveryStatus with the new status
4. If the message was related to a Reminder:
   - Update Reminder status accordingly
     - "sent" -> mark reminder as sent
     - "delivered" -> mark reminder as delivered
     - "read" -> mark reminder as read
     - "failed" -> mark reminder as failed, optionally trigger retry
5. If the message was related to a Summary:
   - Update Summary delivery status accordingly
6. Return 200 OK
```

### Status Lifecycle

```
MessageEvent:
  created -> sent -> delivered -> read
                            \-> failed

Reminder:
  pending -> sent -> delivered -> read
                    \-> failed (may retry)

Summary:
  generated -> sent -> delivered -> read
                     \-> failed
```

---

## 5. Security Considerations

- **Signature verification** is mandatory. Requests without a valid `x-hub-signature-256` are rejected.
- **No production tokens or secrets** are included in this documentation.
- The `RawBodyMiddleware` ensures the original body bytes are available for HMAC verification before any parsing occurs.
- Webhook endpoints are **not** protected by JWT authentication — they are secured solely by HMAC signature verification.
- All incoming data is treated as untrusted and validated before processing.

---

## 6. Error Handling

| Scenario | Response | Behavior |
|----------|----------|----------|
| Invalid or missing signature | 401 Unauthorized | Event rejected, logged |
| Unknown `phone_number_id` | 200 OK | Event logged, ignored (do not reveal whether the ID exists) |
| Unauthorized sender | 200 OK | Event logged, optional "unauthorized" reply sent |
| Duplicate `providerMessageId` | 200 OK | Event silently skipped (idempotent) |
| Unsupported message type | 200 OK | "Unsupported" reply sent to sender |
| Internal processing error | 200 OK | Error logged, Meta will retry delivery |
| Voice feature disabled | 200 OK | "Voice not enabled" reply sent to sender |

> **Important:** Always return 200 OK for webhook events, even when processing fails internally. Non-2xx responses cause Meta to retry the event, which can lead to duplicate processing attempts. Log failures instead of rejecting.
