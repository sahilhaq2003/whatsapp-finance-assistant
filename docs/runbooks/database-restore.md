# Database Restore Runbook

## CRITICAL: Never restore over active production database

Always restore into:
- Staging environment
- Temporary recovery database
- Isolated test environment

## Restore Procedure

### Step 1: Prepare Target Environment

```bash
# Create restore database
mongosh --eval "use dulan_finance_restore"
```

### Step 2: Restore from Backup

```bash
# Restore from dump
mongorestore --uri="RESTORE_MONGODB_URI" --dir=/backup/BACKUP_DATE --drop
```

### Step 3: Verify Restore

Run verification script:

```bash
mongosh --uri="RESTORE_MONGODB_URI" --eval "
  db = db.getSiblingDB('dulan_finance_restore');
  
  // Check collection counts
  ['users','businesses','transactions','invoices','payments','customers'].forEach(c => {
    print(c + ': ' + db[c].countDocuments());
  });
  
  // Verify financial reconciliation
  const businessId = ObjectId('TARGET_BUSINESS_ID');
  
  const income = db.transactions.aggregate([
    { \$match: { businessId, type: 'income', status: 'confirmed' } },
    { \$group: { _id: null, total: { \$sum: '\$amountMinor' } } }
  ]).toArray();
  
  const expenses = db.transactions.aggregate([
    { \$match: { businessId, type: 'expense', status: 'confirmed' } },
    { \$group: { _id: null, total: { \$sum: '\$amountMinor' } } }
  ]).toArray();
  
  print('Income: ' + (income[0]?.total || 0));
  print('Expenses: ' + (expenses[0]?.total || 0));
"
```

### Step 4: Financial Reconciliation

For each business, verify:

| Metric | Before Backup | After Restore |
|--------|--------------|---------------|
| Transaction Count | X | X |
| Income Total | Y | Y |
| Expense Total | Z | Z |
| Invoice Count | A | A |
| Outstanding Amount | B | B |
| Payment Count | C | C |

All values must match exactly.

### Step 5: Application Verification

1. Start application against restored database
2. Login with existing credentials
3. Verify business selection works
4. Check transaction list
5. Check invoice list
6. Run a report
7. Verify no cross-business data leakage

## Rollback

If restore fails:

1. Stop application
2. Drop restored database
3. Restore original database connection
4. Restart application
5. Document failure reason
