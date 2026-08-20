# WhatsApp Webhook Runbook

## Webhook Not Verifying

1. Check `WHATSAPP_VERIFY_TOKEN` matches Meta configuration
2. Verify GET endpoint accessible: `GET /api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=TOKEN&hub.challenge=CHALLENGE`
3. Check server logs for verification attempts
4. Ensure no proxy/firewall blocking GET requests

## Signature Failing

1. Verify `WHATSAPP_APP_SECRET` is correctly set
2. Check `x-hub-signature-256` header presence
3. Ensure raw body is preserved (not parsed before verification)
4. Compare computed HMAC with received signature

## Duplicate Webhooks

- System uses `providerMessageId` for idempotency
- Check `message_events` collection for existing `providerMessageId`
- Duplicate webhooks are silently ignored
- If duplicates persist, check MongoDB unique index on `providerMessageId`

## Business Connection Not Resolved

1. Verify WhatsApp phone number is registered in `whatsapp_connections`
2. Check `phoneNumberId` matches Meta configuration
3. Ensure business account is active
4. Check connection status is not `disconnected`

## Outbound Failure

1. Check `WHATSAPP_ACCESS_TOKEN` validity
2. Verify recipient phone number format
3. Check Meta API rate limits
4. Review `message_events` for delivery status
5. Check provider adapter logs for specific error codes

## Unknown Sender

- Messages from unregistered senders are stored but not processed for finance
- No financial information is exposed to unauthorized senders
- Sender must be in `whatsapp_authorized_senders` with OWNER role for financial queries
