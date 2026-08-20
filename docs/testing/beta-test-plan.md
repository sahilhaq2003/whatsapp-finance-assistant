# Beta Test Plan

## Beta Objectives

1. Can users record transactions easily via WhatsApp?
2. Do users return after first session? (retention)
3. Does WhatsApp reduce friction vs dashboard-only entry?
4. How often does AI need correction?
5. Do invoices provide value for beta users?
6. What causes users to stop?

## Beta Scope

- 10-30 controlled beta users/businesses
- Sri Lankan small businesses
- English only for MVP
- WhatsApp text + voice (if opted in)
- Manual dashboard entry as fallback

## Beta Success Metrics

These metrics will be measured during controlled beta:

| Metric | Collection/Source | How Measured |
|--------|-------------------|-------------|
| Weekly active businesses | business_members (active in last 7 days) | Product analytics service |
| Transactions per active business | transactions (confirmed, per business) | Product analytics service |
| D7 retention | beta_enrollments.firstMeaningfulActivityAt + transactions in week 2 | Retention service |
| D30 retention | Same pattern for 30 days | Retention service |
| WhatsApp-to-confirmed success | ai_proposals (CONFIRMED / total from whatsapp) | Product analytics |
| AI correction rate | ai_proposals with revisionHistory.length > 0 | Product analytics |
| Clarification rate | ai_proposals (NEEDS_CLARIFICATION / total) | Product analytics |
| Invoice adoption | invoices / active businesses | Product analytics |
| Voice success | message_events (audio, transcription completed) | Product analytics |
| Reminder-to-payment outcome | reminders sent -> payments within 7 days | Product analytics |

**Note:** Targets will be agreed separately. During beta, metrics will be measured and reported weekly.

## Beta Rollout Plan

1. Deploy to staging environment
2. Seed test data
3. Invite first 5 pilot users
4. Monitor for 1 week
5. Invite next 10 users
6. Weekly metric reports
7. Iterate based on feedback

## Feedback Collection

- In-app feedback form (POST /api/feedback)
- Weekly check-in with beta users
- Automated product analytics
