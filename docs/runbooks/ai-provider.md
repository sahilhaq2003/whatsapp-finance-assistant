# AI Provider Runbook

## Provider Timeout

- AI features return safe temporary failure message
- Manual finance operations continue normally
- No financial records created on timeout
- User can retry or use manual entry

## Invalid Structured Response

- AI returns unstructured text
- System validates response schema before processing
- Invalid responses are logged and rejected
- No financial record created
- User informed: "Unable to process message"

## AI Disabled (AI_ENABLED=false)

- AI extraction features are unavailable
- WhatsApp text messages receive generic guidance
- Voice notes are not processed
- Manual finance CRUD fully functional
- Reports, summaries, reminders unaffected

## High Correction Rate

- Monitor: track AI proposal confirmation vs correction rate
- High correction rate indicates:
  - AI model needs fine-tuning
  - Business-specific vocabulary needed
  - Input quality issues
- Actions:
  - Review common correction patterns
  - Adjust AI prompt/context
  - Consider model upgrade

## Prompt Injection Attempt

- User input is treated as data, not instructions
- AI does not have database access
- Cross-business data never included in AI context
- Malicious inputs are logged for review
- No financial records created from injection attempts

## API Key Expiry

- AI features return safe failure
- Manual operations unaffected
- Update `AI_API_KEY` in environment
- Restart API process
- No data loss

## Cost Monitoring

- AI usage costs depend on:
  - OpenAI API pricing
  - Number of transactions processed
  - Number of AI questions asked
- Set usage alerts in OpenAI dashboard
- Consider rate limiting AI endpoints per business
