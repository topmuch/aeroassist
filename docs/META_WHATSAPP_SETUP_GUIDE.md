# Meta WhatsApp Business API — Setup Guide for AeroAssist

This guide walks you through setting up the **WhatsApp Business Platform** (Meta Cloud API) for AeroAssist. After completing these steps, your webhook endpoint at `/api/webhook/whatsapp` will be able to send and receive WhatsApp messages at scale.

---

## Prerequisites

- A [Meta Business Account](https://business.facebook.com/) (free to create)
- A phone number you own (will be registered as the WhatsApp Business number)
- Access to your AeroAssist deployment (to set environment variables)

---

## Step 1: Create a Meta Business Account

1. Go to [Meta Business Settings](https://business.facebook.com/settings/).
2. If you don't have one, click **Create Account**.
3. Enter your business name: **AeroAssist** (or your legal entity name).
4. Complete the business verification details (address, VAT, etc.).
5. Note your **Business ID** — you'll need it later.

> **Important:** For sending templates (notifications, receipts, reminders), your business account must be verified. Start verification early — it can take several days.

---

## Step 2: Create a Meta App with WhatsApp Product

1. Go to [Meta for Developers](https://developers.facebook.com/apps/).
2. Click **Create App** → select **Business** type.
3. Name the app (e.g., "AeroAssist WhatsApp").
4. In the app dashboard, click **Add Product** → select **WhatsApp**.
5. Click **Set Up** under WhatsApp.

The WhatsApp Configuration panel will appear with your **Phone Number ID** and **WhatsApp Business Account ID**.

---

## Step 3: Add & Configure the WhatsApp Product

1. In the WhatsApp product settings, you'll see:
   - **Phone Number ID** — unique identifier for your business phone
   - **WhatsApp Business Account ID** — links to your Meta Business Account
   - **Permanent Access Token** — generated in the next step

2. Click **API Setup** to see your Base URL and available endpoints.

---

## Step 4: Verify Your Phone Number

Meta requires you to verify the phone number that will send messages.

### Option A: SMS Verification (recommended)
1. In the WhatsApp Configuration panel, click **Add Phone Number**.
2. Select your country and enter the phone number.
3. Choose **SMS** as the verification method.
4. Enter the 6-digit code sent to the phone.

### Option B: Voice Call Verification
1. Same as above, but select **Call** as the verification method.
2. An automated call will read the 6-digit code.

### Option C: Business Verification (for high-volume senders)
If you plan to send > 1,000 messages/day, apply for **Business Verification**:
1. Go to **Business Settings → Business Information**.
2. Complete the verification form with business documents.
3. Once approved, your messaging limits are raised.

> **Note:** Until verified, your number can only message up to 250 unique customers per day (Tier 1).

---

## Step 5: Configure the Webhook URL

1. In the WhatsApp Configuration panel, under **Webhooks**, click **Manage**.
2. Click **Edit** next to the Callback URL field.
3. Enter your AeroAssist webhook URL:

   ```
   https://your-domain.com/api/webhook/whatsapp
   ```

4. Enter the **Verify Token** (must match `WHATSAPP_VERIFY_TOKEN` in your `.env`):

   ```
   aeroassist_webhook_verify_2024
   ```

5. Meta will send a `GET` request with `hub.mode`, `hub.verify_token`, and `hub.challenge`. Your endpoint will respond with the challenge string if the token matches.

6. Click **Verify and Save**.

### Webhook Fields to Subscribe To

After verification, subscribe to these events:

| Field | Description |
|-------|-------------|
| `messages` | Incoming messages from users |
| `messages.message_reactions` | Reactions to messages |
| `messages.message_status` | Delivered/read receipts |
| `messaging_postbacks` | Interactive button replies |

> **Important:** The webhook endpoint must be served over **HTTPS** with a valid SSL certificate.

---

## Step 6: Subscribe to Webhooks

1. In the Webhook settings, click **Subscribe** next to each field you want.
2. At minimum, subscribe to **`messages`** to receive user messages.

The webhook is now live. Test by sending a WhatsApp message to your business number — you should see a `POST` request arrive at your endpoint.

---

## Step 7: Set Environment Variables

Add the following to your AeroAssist `.env` file (or your deployment's environment variables):

```bash
# ── WhatsApp Meta Cloud API ──────────────────────────────────
# Required: Token generated from Meta App Dashboard
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxx

# Required: Phone Number ID from WhatsApp Configuration
WHATSAPP_PHONE_NUMBER_ID=1xxxxxxxxxx

# Required: Webhook verification token (must match Meta config)
WHATSAPP_VERIFY_TOKEN=aeroassist_webhook_verify_2024

# Required: App Secret for HMAC webhook signature verification
WHATSAPP_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional: System User Access Token (for template CRUD operations)
WHATSAPP_SYSTEM_USER_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxx

# Optional: Business Account ID (for template management)
WHATSAPP_BUSINESS_ACCOUNT_ID=1xxxxxxxxxx

# Optional: Meta Graph API version (default: v19.0)
WHATSAPP_API_VERSION=v19.0
```

### Where to Get Each Value

| Variable | Where to Find It |
|----------|-----------------|
| `WHATSAPP_ACCESS_TOKEN` | App Dashboard → WhatsApp → API Setup → Temporary/Permanent Token |
| `WHATSAPP_PHONE_NUMBER_ID` | App Dashboard → WhatsApp → API Setup → Phone Number ID |
| `WHATSAPP_VERIFY_TOKEN` | You choose this — must match Meta webhook config |
| `WHATSAPP_APP_SECRET` | App Dashboard → Settings → Basic → App Secret → Show |
| `WHATSAPP_SYSTEM_USER_ACCESS_TOKEN` | Business Settings → System Users → Generate Token |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Business Settings → Business Info → Business ID |

> **Security:** Never commit these tokens to Git. Use a secrets manager or encrypted env files in production.

---

## Step 8: Submit Templates for Approval

WhatsApp requires message templates to be approved before use. AeroAssist ships with 5 templates in `src/data/templates.json`.

### Option A: Submit via Meta Business Manager (UI)
1. Go to [WhatsApp Manager](https://business.facebook.com/wa/manage/).
2. Click **Messaging Templates** → **Create Template**.
3. For each template in `src/data/templates.json`:
   - Enter the **name** exactly as specified
   - Select the **category** (`UTILITY` or `MARKETING`)
   - Select **French (fr)** as the language
   - Paste the **body** text
   - Click **Submit**

### Option B: Submit via API (automated)
Use the `syncTemplatesToMeta()` function from `@/services/whatsapp-meta.service`:

```typescript
import { syncTemplatesToMeta } from '@/services/whatsapp-meta.service';

// Call from an admin API route or script
const result = await syncTemplatesToMeta();
console.log(`Created: ${result.created}, Updated: ${result.updated}, Failed: ${result.failed}`);
```

This requires `WHATSAPP_SYSTEM_USER_ACCESS_TOKEN` and `WHATSAPP_BUSINESS_ACCOUNT_ID` to be set.

### Template Approval Timeline

| Category | Typical Approval Time | Notes |
|----------|----------------------|-------|
| `UTILITY` | 24-48 hours | Flight status, receipts, confirmations |
| `MARKETING` | 48 hours+ | Promotions, reminders (requires opt-in) |

Templates must follow Meta's [Messaging Policy](https://business.whatsapp.com/policy). Common rejections:
- Contains promotional content in `UTILITY` category
- Uses emojis in headers/buttons
- Missing opt-out option for `MARKETING` templates

---

## Step 9: Test with Meta Graph API Explorer

Verify your integration using the [Graph API Explorer](https://developers.facebook.com/tools/explorer/):

### Test 1: Send a Text Message
```
POST /v19.0/{PHONE_NUMBER_ID}/messages
Headers: Authorization: Bearer {ACCESS_TOKEN}
Body:
{
  "messaging_product": "whatsapp",
  "to": "{YOUR_PERSONAL_PHONE}",
  "type": "text",
  "text": { "body": "Test from AeroAssist" }
}
```

### Test 2: Send a Template Message
```
POST /v19.0/{PHONE_NUMBER_ID}/messages
Headers: Authorization: Bearer {ACCESS_TOKEN}
Body:
{
  "messaging_product": "whatsapp",
  "to": "{YOUR_PERSONAL_PHONE}",
  "type": "template",
  "template": {
    "name": "aeroassist_welcome",
    "language": { "code": "fr" }
  }
}
```

### Test 3: Verify Webhook Signature
```bash
curl -X POST https://your-domain.com/api/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=..." \
  -d '{"object":"whatsapp_business_account","entry":[{"changes":[{"value":{"messages":[{"from":"33612345678","id":"wamid_abc","type":"text","text":{"body":"Hello"}}]}}]}]}'
```

---

## Troubleshooting

### Webhook Not Receiving Messages

| Symptom | Cause | Solution |
|---------|-------|----------|
| No `GET` verification | Wrong verify token | Ensure `WHATSAPP_VERIFY_TOKEN` matches Meta config |
| Signature verification fails | Wrong app secret | Check `WHATSAPP_APP_SECRET` matches App Dashboard |
| 200 response but no data | Webhook not subscribed to `messages` field | Re-subscribe in Meta webhook settings |
| Timeout errors | Server not reachable | Ensure HTTPS, open port 443, check DNS |

### Messages Not Sending

| Symptom | Cause | Solution |
|---------|-------|----------|
| `401 Unauthorized` | Expired or invalid token | Regenerate token in App Dashboard |
| `403 Forbidden` | Insufficient permissions | Grant `whatsapp_business_messaging` permission |
| `429 Too Many Requests` | Rate limit hit | Wait and retry with exponential backoff |
| Template not found | Template not approved | Check template status in WhatsApp Manager |
| `1008` Template name mismatch | Case-sensitive name | Use exact template name as in `templates.json` |

### Session / Rate Limit Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| Users getting "too many messages" | Rate limit (20/min) hit | Default limit; adjust `RATE_LIMIT_MAX` in service |
| Context lost between messages | Session expired (24h TTL) | This is by design; sessions reset after 24h |
| Old sessions consuming memory | No cleanup | Cleanup runs every 10 minutes automatically |

### Meta API Errors Reference

| Code | Error | Action |
|------|-------|--------|
| `80007` | Media download failed | Media URL expired (re-fetch) |
| `131008` | Template param count mismatch | Check template body placeholders |
| `131021` | Template not approved | Wait for Meta approval |
| `131047` | Recipient opted out | User has blocked your number |
| `131051` | Daily limit reached | Wait 24h or apply for higher tier |

---

## Architecture Overview

```
User (WhatsApp)
    │
    ▼
Meta Cloud API
    │
    ▼ POST /api/webhook/whatsapp
    │
    ├── verifyWebhookSignature()     ← Security (HMAC-SHA256)
    ├── processIncomingMessage()     ← Session + Rate Limit (whatsapp-meta.service)
    ├── detectLanguage()             ← NLP
    ├── detectIntent()               ← Keyword matching
    ├── searchKnowledgeBase()        ← Prisma DB (RAG)
    ├── callAI()                     ← Groq via z-ai-web-dev-sdk
    ├── sendTextMessage()            ← Meta Cloud API or OpenBSP
    └── storeOutboundMessage()       ← Prisma DB
```

---

## Useful Links

- [WhatsApp Business Platform Docs](https://developers.facebook.com/docs/whatsapp/cloud-api/)
- [Message Templates Guide](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates)
- [Webhook Setup Guide](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks)
- [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
- [Rate Limiting Policy](https://developers.facebook.com/docs/whatsapp/messaging/rate-limits)
- [Messaging Policy](https://business.whatsapp.com/policy)
