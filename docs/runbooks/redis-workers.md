# Redis & Workers Runbook

## Redis Unavailable

- Core finance CRUD (transactions, invoices, payments, customers) continues normally
- Background automation is degraded:
  - Payment reminders may not process
  - Scheduled summaries may not generate
- Redis reconnection is automatic
- Monitor: `GET /api/health/ready` shows degraded status

## Queue Backlog

1. Check Redis connectivity
2. Review BullMQ dashboard or logs for queue depth
3. Verify workers are running: check `workers` module logs
4. If backlog is large, consider scaling workers

## Failed Jobs

1. Check worker logs for error details
2. Common causes:
   - Redis timeout
   - WhatsApp provider error
   - Invalid job data
3. BullMQ retries jobs automatically with backoff
4. After max retries, job moves to failed set
5. Manual retry: restart the API/worker process

## Worker Restart

1. Workers are part of the API process
2. Graceful shutdown: send SIGTERM
3. Workers finish in-progress jobs before exit
4. Start new process: `npm run start:prod`
5. BullMQ handles job reassignment automatically

## Reminder Reconciliation

- Reminders use deduplication via `reminder_dedup_key` compound index
- Running scheduler multiple times is safe
- Duplicate sends are prevented by dedup check
- If reminders stuck, check:
  - Redis connectivity
  - Invoice payment status (paid invoices skip reminders)
  - Reminder rule `isEnabled` flag
