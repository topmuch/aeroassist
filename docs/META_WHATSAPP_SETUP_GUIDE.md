# Meta WhatsApp Business API — Setup Guide for AeroAssist

This guide walks you through setting up the **WhatsApp Business Platform** (Meta Cloud API) for AeroAssist. After completing these steps, your webhook endpoint at `/api/webhook/whatsapp` will be able to send and receive WhatsApp messages at scale.

---

## Prerequisites

Before you begin, ensure you have the following:

- A **Meta Business Account** — [Create one here](https://business.facebook.com/) (free)
- A **phone number** you own that will be registered as the WhatsApp Business number
- **Admin access** to your Meta App in the [Meta Developer Portal](https://developers.facebook.com/apps/)
- Your AeroAssist deployment URL (must be **HTTPS** with a valid SSL certificate)
- Access to your AeroAssist `.env` file to set environment variables

> **Important:** For sending template messages (notifications, receipts, reminders), your business account must be verified. Start verification early — it can take several days.

---

## Step-by-Step Setup

### Step 1: Create a Meta App (Business Type)

1. Go to the [Meta Developer Portal](https://developers.facebook.com/apps/).
2. Click **Create App**.
3. Select **Business** as the app type.
4. Name the app (e.g., "AeroAssist WhatsApp").
5. Enter your business email and click **Create App**.
6. Complete the Business Verification details if prompted (business name, address, VAT number).

### Step 2: Add the WhatsApp Product

1. In your app dashboard, click **Add Product** in the left sidebar.
2. Find **WhatsApp** and click **Set Up**.
3. The WhatsApp Configuration panel will appear, showing:
   - **Phone Number ID** — Unique identifier for your business phone
   - **WhatsApp Business Account ID** — Links to your Meta Business Account
   - **Temporary Access Token** — Valid for 24 hours (generate a permanent one later)

### Step 3: Verify Your Phone Number

Meta requires you to verify the phone number that will send messages.

1. In the WhatsApp Configuration panel, click **Add Phone Number**.
2. Select your country and enter the phone number.
3. Choose verification method:
   - **SMS** (recommended) — Enter the 6-digit code sent to your phone
   - **Voice Call** — Automated call reads the 6-digit code
4. Once verified, the number appears as your **WhatsApp Business Number**.

> **Note:** Until your business is verified, your number can message up to **250 unique customers per day** (Tier 1). Verified businesses get up to 10,000/day (Tier 2).

### Step 4: Generate a Permanent Access Token

The temporary token expires in 24 hours. Generate a permanent one:

1. In the WhatsApp Configuration panel, under **API Setup**, find **Access Token**.
2. For production: Add a **System User** in Business Settings → System Users → Generate Token.
3. Select permissions: `whatsapp_business_messaging`, `whatsapp_business_management`.
4. Copy the token — you'll set it as `META_WHATSAPP_ACCESS_TOKEN`.

### Step 5: Configure the Webhook URL

1. In the WhatsApp Configuration panel, under **Webhooks**, click **Manage**.
2. Click **Edit** next to the Callback URL field.
3. Enter your AeroAssist webhook URL:

   ```
   https://your-domain.com/api/webhook/whatsapp
   ```

4. Enter the **Verify Token** — this must match `META_WEBHOOK_VERIFY_TOKEN` in your `.env`:

   ```
   aeroassist_webhook_verify_2024
   ```

5. Meta will send a `GET` request with `hub.mode`, `hub.verify_token`, and `hub.challenge`. Your endpoint responds with the challenge string if the token matches.

6. Click **Verify and Save**.

> **Important:** The webhook endpoint must be served over **HTTPS** with a valid SSL certificate. Meta will reject HTTP endpoints.

### Step 6: Subscribe to Message Webhooks

After verification, subscribe to these webhook fields:

| Field | Description | Required |
|-------|-------------|----------|
| `messages` | Incoming messages from users | ✅ Yes |
| `messages.message_reactions` | Reactions to messages | Optional |
| `messages.message_status` | Delivered/read receipts | Optional |
| `messaging_postbacks` | Interactive button replies | ✅ Yes |

1. Click **Subscribe** next to each field.
2. At minimum, subscribe to **`messages`** to receive user messages.

**Test:** Send a WhatsApp message to your business number — you should see a `POST` request arrive at your endpoint.

---

## Environment Variables

Add the following to your AeroAssist `.env` file:

```bash
# ── WhatsApp Meta Cloud API ──────────────────────────────────
# Required: Permanent access token from Meta App Dashboard
META_WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxx

# Required: Phone Number ID from WhatsApp Configuration
META_WHATSAPP_PHONE_NUMBER_ID=1xxxxxxxxxx

# Required: Webhook verify token (must match Meta webhook config)
META_WEBHOOK_VERIFY_TOKEN=aeroassist_webhook_verify_2024

# Required: Business Account ID from Business Settings
META_WHATSAPP_BUSINESS_ACCOUNT_ID=1xxxxxxxxxx

# Required: App Secret for HMAC webhook signature verification
META_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional: Graph API version (default: v19.0)
META_API_VERSION=v19.0
```

### Where to Find Each Value

| Variable | Where to Find It |
|----------|-----------------|
| `META_WHATSAPP_ACCESS_TOKEN` | App Dashboard → WhatsApp → API Setup → System User Token |
| `META_WHATSAPP_PHONE_NUMBER_ID` | App Dashboard → WhatsApp → API Setup → Phone Number ID |
| `META_WEBHOOK_VERIFY_TOKEN` | You define this — must match Meta webhook config |
| `META_WHATSAPP_BUSINESS_ACCOUNT_ID` | Business Settings → Business Info → Business ID |
| `META_APP_SECRET` | App Dashboard → Settings → Basic → App Secret → Show |

> **Security:** Never commit these tokens to Git. Use environment variables or a secrets manager in production.

---

## Template Message Setup

WhatsApp requires message templates to be approved before use. AeroAssist ships with 5 templates in `src/data/templates.json`.

### Create Templates in Meta Dashboard

1. Go to [WhatsApp Manager](https://business.facebook.com/wa/manage/).
2. Click **Messaging Templates** → **Create Template**.
3. For each template in `src/data/templates.json`:
   - Enter the **name** exactly as specified (e.g., `aeroassist_welcome`)
   - Select the **category**: `UTILITY`, `MARKETING`, or `ACCOUNT_UPDATE`
   - Select **French (fr)** as the language
   - Paste the **body** text with `{{1}}`, `{{2}}`, etc. for parameters
   - Click **Submit**

### Template Categories

| Category | Use Case | Approval Time |
|----------|----------|---------------|
| `UTILITY` | Flight status, reservations, reminders, confirmations | 24-48 hours |
| `MARKETING` | Welcome messages, promotions | 48+ hours |
| `ACCOUNT_UPDATE` | Payment receipts, account notifications | 24-48 hours |

### Common Rejection Reasons

- Contains promotional content in `UTILITY` category
- Missing opt-out option for `MARKETING` templates
- Uses emojis in headers or buttons (allowed in body text)
- Template body too similar to an existing template

---

## Testing with the WhatsApp Sandbox

Before going live, test your integration using Meta's built-in tools:

### Test 1: Graph API Explorer

1. Go to the [Graph API Explorer](https://developers.facebook.com/tools/explorer/).
2. Select your app and generate a user access token.
3. Send a test text message:

```
POST /v19.0/{PHONE_NUMBER_ID}/messages
Headers: Authorization: Bearer {ACCESS_TOKEN}
Body:
{
  "messaging_product": "whatsapp",
  "to": "{YOUR_PERSONAL_PHONE}",
  "type": "text",
  "text": { "body": "Test from AeroAssist ✈️" }
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

### Test 3: Webhook Verification

```bash
# Simulate Meta's verification GET request
curl -v "https://your-domain.com/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=aeroassist_webhook_verify_2024&hub.challenge=test123"
# Expected response: test123
```

### Test 4: Stripe CLI (for payment webhooks)

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
stripe trigger checkout.session.completed
```

---

## Rate Limits

Meta enforces rate limits on the WhatsApp Business API. Here are the key limits:

| Limit Type | Tier 1 (Unverified) | Tier 2 (Verified) |
|------------|---------------------|-------------------|
| **Conversations/day** | 250 unique users | 10,000 unique users |
| **Messages/second** | 1 per business | 10 per business (configurable) |
| **API calls/second** | 20 | 20 |

### Best Practices

1. **Batch messages** — Don't send more than 1 message per second to the same user
2. **Use templates** — Only template messages can be sent outside a 24-hour conversation window
3. **Respect opt-outs** — If a user blocks your number, do not attempt to re-engage
4. **Implement exponential backoff** — Retry failed sends with increasing delays (1s, 2s, 4s, 8s)
5. **Monitor your tier** — Track daily unique conversations to avoid hitting limits

---

## Troubleshooting

### Webhook Not Receiving Messages

| Symptom | Cause | Solution |
|---------|-------|----------|
| Verification fails (403) | Wrong verify token | Ensure `META_WEBHOOK_VERIFY_TOKEN` matches Meta config exactly |
| Signature verification fails | Wrong app secret | Check `META_APP_SECRET` matches App Dashboard |
| 200 but no data | Not subscribed to `messages` | Re-subscribe in Meta webhook settings |
| Timeout errors | Server unreachable | Ensure HTTPS, port 443 open, DNS resolves |

### Messages Not Sending

| Symptom | Cause | Solution |
|---------|-------|----------|
| `401 Unauthorized` | Expired token | Regenerate permanent token in Meta Dashboard |
| `403 Forbidden` | Insufficient permissions | Grant `whatsapp_business_messaging` to System User |
| `429 Too Many Requests` | Rate limit hit | Wait and retry with exponential backoff |
| Template not found | Not approved | Check template status in WhatsApp Manager |
| `1008` Name mismatch | Case-sensitive | Use exact template name from `templates.json` |

### Meta API Error Codes

| Code | Error | Action |
|------|-------|--------|
| `80007` | Media download failed | Media URL expired; re-fetch |
| `131008` | Parameter count mismatch | Check template body placeholders |
| `131021` | Template not approved | Wait for Meta approval (24-48h) |
| `131047` | Recipient opted out | User has blocked your number |
| `131051` | Daily limit reached | Wait 24h or apply for higher tier |

---

## Going Live

### Pre-Launch Checklist

- [ ] Business account is verified
- [ ] All templates are approved by Meta
- [ ] Webhook URL is verified and subscribed to `messages`
- [ ] Permanent access token is generated
- [ ] Environment variables are set in production
- [ ] Payment flow (Stripe) is tested end-to-end
- [ ] Error handling and fallbacks are configured
- [ ] Monitoring and alerting are active

### Meta Review Process

If your app requires review (e.g., for additional permissions):

1. Go to **App Dashboard → App Review**.
2. Select the permissions you need.
3. Provide screenshots/video of your app in action.
4. Include test credentials if requested.
5. Submit for review — typically takes 3-10 business days.

### Launch Day

1. Switch from test token to **production access token**.
2. Verify webhook is receiving live traffic.
3. Send a test template message to yourself.
4. Monitor Grafana dashboard for the first 2 hours.
5. Have the runbook (`docs/README-RUNBOOK.md`) ready for quick reference.

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
    ├── verifyWebhookSignature()     ← HMAC-SHA256
    ├── processIncomingMessage()     ← Session + Rate Limit
    ├── detectLanguage()             ← French / English
    ├── detectIntent()               ← Keyword matching
    ├── searchKnowledgeBase()        ← RAG pipeline (PostgreSQL)
    ├── callAI()                     ← Groq AI
    ├── sendTextMessage()            ← Meta Cloud API
    └── storeOutboundMessage()       ← PostgreSQL
```

---

## Useful Links

- [WhatsApp Business Platform Docs](https://developers.facebook.com/docs/whatsapp/cloud-api/)
- [Message Templates Guide](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates)
- [Webhook Setup Guide](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks)
- [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
- [Rate Limiting Policy](https://developers.facebook.com/docs/whatsapp/messaging/rate-limits)
- [Messaging Policy](https://business.whatsapp.com/policy)
- [Meta Developer Status](https://developers.facebook.com/status/)
