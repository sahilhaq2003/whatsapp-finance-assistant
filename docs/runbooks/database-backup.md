# Database Backup Runbook

## Backup Strategy

### What Is Backed Up

- `users` - User accounts
- `businesses` - Business configurations
- `business_members` - Business memberships
- `categories` - Income/expense categories
- `transactions` - All financial transactions
- `customers` - Customer records
- `invoices` - Invoices and invoice items
- `payments` - Payment records
- `aiproposals` - AI extraction proposals
- `audit_logs` - Audit trail
- `reminders` - Reminder configurations and history
- `financial_summaries` - Summary snapshots
- `message_events` - WhatsApp message tracking
- `whatsapp_connections` - WhatsApp business connections
- `whatsapp_authorized_senders` - Authorized senders

### What Is NOT Backed Up

- Temporary voice audio files (deleted after processing)
- Application logs (stored separately)
- Environment secrets (managed separately)

## MongoDB Atlas Backup

### Automated Backups (Atlas)

1. Enable continuous backups in Atlas dashboard
2. Configure retention policy:
   - Daily backups: retain 7 days
   - Weekly backups: retain 4 weeks
   - Monthly backups: retain 12 months
3. Enable point-in-time recovery if available

### Manual Backup

```bash
# Export all collections
mongodump --uri="MONGODB_URI" --out=/backup/$(date +%Y%m%d)

# Verify backup
ls -la /backup/$(date +%Y%m%d)/
```

## Backup Verification

After backup, verify:

1. Backup directory exists and is non-empty
2. Collection counts match source:
   ```bash
   mongosh --uri="MONGODB_URI" --eval "
     db = db.getSiblingDB('dulan_finance');
     ['users','businesses','transactions','invoices','payments','customers'].forEach(c => {
       print(c + ': ' + db[c].countDocuments());
     });
   "
   ```
3. Recent transaction timestamps are within expected range

## Backup Security

- Backups must be encrypted at rest
- Access restricted to authorized personnel only
- Backup storage must be separate from application servers
- Never store backup credentials alongside application code

## Backup Documentation

- Document backup schedule
- Document retention policy
- Document access procedures
- Document encryption expectations
- Review quarterly
