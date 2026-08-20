# Incident Response Runbook

## Suspected Data Leak

1. **Immediate**: Assess scope of exposure
2. Identify which data was potentially exposed
3. Check access logs for unauthorized access patterns
4. Verify tenant isolation is intact
5. Rotate affected credentials:
   - JWT secrets
   - WhatsApp access token
   - AI API key
6. Notify affected business owners if customer data exposed
7. Document incident timeline
8. Review and strengthen access controls

## Compromised API Key

1. **Immediate**: Rotate the compromised key
2. Update environment configuration
3. Restart affected services
4. Review logs for unauthorized usage
5. Check for data exfiltration
6. Update all related credentials
7. Document the compromise timeline

## Duplicate Financial Records

1. **Immediate**: Identify scope of duplicates
2. Stop automated processing (reminders, summaries)
3. Identify root cause:
   - Webhook idempotency failure?
   - Double confirmation?
   - Race condition?
4. For each duplicate:
   - Verify which is correct
   - Void incorrect records
   - Document void reason
5. Fix root cause before re-enabling automation
6. Run financial reconciliation

## Database Outage

1. Check MongoDB Atlas status page
2. Verify network connectivity
3. Check connection pool settings
4. Review MongoDB logs for errors
5. If Atlas issue: wait for resolution
6. If application issue:
   - Check connection string
   - Verify firewall rules
   - Restart application
7. Health check: `GET /api/health/ready` should show degraded
8. Core finance APIs return safe errors during outage

## WhatsApp Provider Outage

1. Check Meta status page
2. Core finance operations continue normally
3. Outbound messages marked as failed/retryable
4. Inbound webhooks: check retry queue
5. No duplicate financial records created
6. When provider recovers, retry failed messages

## AI Provider Outage

1. Check OpenAI status page
2. Manual finance operations unaffected
3. AI features return safe failure message
4. Scheduled summaries still generate (deterministic)
5. Voice notes: inform user to retry later
6. When provider recovers, no special action needed

## Credential Compromise Procedure

1. Revoke/rotate compromised credential immediately
2. Update secret manager or environment
3. Restart affected services
4. Review logs for exposure window
5. Assess what data could have been accessed
6. Document incident
7. Implement additional controls if needed

## Post-Incident

1. Document root cause
2. Document timeline
3. Document remediation steps
4. Update monitoring/alerting if gaps found
5. Review and update runbooks
6. Schedule follow-up review
