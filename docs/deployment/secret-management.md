# Secret Management Guide

## Golden Rule

**NEVER store secrets in Git.** Not in source code, not in config files committed to the repository, not in CI/CD pipeline definitions, and not in any file that will be version-controlled.

## Where to Store Secrets

### Platform Secret Managers

Use your hosting platform's built-in secret/variable management:

- **Railway**: Project → Variables tab → Environment Variables (masked by default)
- **Fly.io**: `fly secrets set KEY=VALUE`
- **AWS Secrets Manager**: Store and retrieve at runtime via SDK
- **Docker Compose (local only)**: Use `.env` files excluded by `.gitignore`

### Local Development

Use a `.env` file at the project root. The `.gitignore` must exclude it. A `.env.example` file with placeholder values is committed instead:

```
# .env.example — DO NOT put real values here
JWT_ACCESS_SECRET=replace_me
JWT_REFRESH_SECRET=replace_me
WHATSAPP_ACCESS_TOKEN=replace_me
WHATSAPP_VERIFY_TOKEN=replace_me
AI_API_KEY=replace_me
SPEECH_API_KEY=replace_me
MONGODB_URI=mongodb://localhost:27017/finance_app
REDIS_URL=redis://localhost:6379
OBJECT_STORAGE_ACCESS_KEY=replace_me
OBJECT_STORAGE_SECRET_KEY=replace_me
```

## Environment Separation

| Secret Category | Staging | Production |
|----------------|---------|------------|
| Database credentials | Separate staging cluster | Separate production cluster |
| Redis credentials | Separate staging instance | Separate production instance |
| WhatsApp tokens | Sandbox/test tokens | Live production tokens |
| AI/Speech API keys | Staging or development keys | Production keys with billing alerts |
| JWT secrets | Independent staging secrets | Independent production secrets |
| Object storage | Staging bucket credentials | Production bucket credentials |

**Never share the same secret between staging and production.**

## Secret Rotation Schedule

All secrets must be rotated on a **quarterly minimum** cadence, or immediately if compromise is suspected.

| Secret | Rotation Frequency | Notes |
|--------|-------------------|-------|
| `JWT_ACCESS_SECRET` | Quarterly | Rotate all users out on rotation |
| `JWT_REFRESH_SECRET` | Quarterly | Rotate alongside access secret |
| `WHATSAPP_ACCESS_TOKEN` | Quarterly | Revoke old token after new one is active |
| `WHATSAPP_VERIFY_TOKEN` | Quarterly | Update in WhatsApp app dashboard |
| `AI_API_KEY` | Quarterly | Check usage before rotation |
| `SPEECH_API_KEY` | Quarterly | Check usage before rotation |
| `MONGODB_URI` (password) | Quarterly | Update DB user password first |
| `REDIS_URL` (password) | Quarterly | Update Redis password first |
| `OBJECT_STORAGE_*` keys | Quarterly | Generate new key pair, then delete old |

### Rotation Procedure

1. Generate a new credential from the source (provider dashboard, database, etc.).
2. Update the secret in the platform's secret manager for the affected environment.
3. Deploy or restart the service so it picks up the new value.
4. Verify the application is functioning correctly with the new credential.
5. Revoke or delete the old credential from the source.
6. Log the rotation in the operations audit trail with date and rotated-by.

## Compromised Secret Procedure

If a secret is suspected or confirmed to be compromised:

1. **Remove the secret from source code** — delete it from any committed file immediately.
2. **Rotate the credential** at the source (revoke the old one, generate a new one).
3. **Update the secret manager** with the new value.
4. **Redeploy** the affected service(s).
5. **Rotate all secrets** that shared the same access scope or were stored in the same location.
6. **Audit access logs** to determine the extent of exposure.
7. **Notify** the team and document the incident.

## Security Rules

- **Never share secrets through chat, email, or messaging platforms.** Use the platform's secret manager or an approved secrets sharing tool.
- **Never log secrets.** Ensure logging frameworks redact sensitive fields. Use structured logging with field-level masking.
- **Never paste secrets into Slack, Teams, email, or support tickets.** If you must discuss a secret, reference it by name only.
- **Never commit `.env` files.** Verify `.gitignore` includes `.env*` patterns before your first commit.
- **Rotate immediately** if you suspect any secret has been exposed through logs, version control, or any other channel.
