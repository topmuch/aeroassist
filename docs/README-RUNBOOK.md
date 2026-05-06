# AeroAssist — Incident Runbook

> **Version:** 1.0.0  
> **Last Updated:** 2025-01  
> **Classification:** Internal — Operations Team

---

## Table of Contents

1. [Overview](#1-overview)
2. [Monitoring Stack](#2-monitoring-stack)
3. [Common Incidents & Resolution](#3-common-incidents--resolution)
4. [Emergency Procedures](#4-emergency-procedures)
5. [Backup & Recovery](#5-backup--recovery)
6. [Useful Commands](#6-useful-commands)
7. [Contacts & Escalation](#7-contacts--escalation)

---

## 1. Overview

### What is AeroAssist?

AeroAssist is an AI-powered airport concierge chatbot accessible via **WhatsApp**. It provides real-time flight information, restaurant recommendations, hotel bookings, transport options, and shopping guidance for CDG and ORLY airports in Paris. The system uses **Groq AI** for natural language processing and a **RAG pipeline** for knowledge retrieval.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AeroAssist Architecture                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐     ┌──────────────┐     ┌──────────────────────────┐ │
│  │ WhatsApp │────▶│  Meta Cloud  │────▶│   Nginx (port 80/443)   │ │
│  │  Users   │     │    API       │     │   Reverse Proxy + TLS    │ │
│  └──────────┘     └──────────────┘     └────────────┬─────────────┘ │
│                                                      │               │
│  ┌──────────┐     ┌──────────────┐     ┌────────────▼─────────────┐ │
│  │  Web App │────▶│   Next.js    │────▶│   Backend (port 3000)    │ │
│  │  Dashboard│     │   Frontend   │     │   - Chat API (/api/chat) │ │
│  └──────────┘     └──────────────┘     │   - Webhooks             │ │
│                                       │   - Stripe Payments      │ │
│                                       └────────────┬─────────────┘ │
│                                                    │                │
│  ┌──────────┐     ┌──────────────┐     ┌────────────▼─────────────┐ │
│  │ Grafana  │────▶│  Prometheus  │────▶│   Services               │ │
│  │ (3002)   │     │   (9090)     │     │   - Groq AI (LLM)       │ │
│  └──────────┘     └──────────────┘     │   - Stripe API          │ │
│                                       │   - OpenBSP (3001)       │ │
│  ┌──────────┐     ┌──────────────┐     └────────────┬─────────────┘ │
│  │AlertMgr  │────▶│    Redis     │                    │               │
│  │ (9093)   │     │   (6379)     │     ┌────────────▼─────────────┐ │
│  └──────────┘     └──────────────┘     │   PostgreSQL (5432)      │ │
│                                       │   - Users, Flights       │ │
│                                       │   - Messages, Payments   │ │
│                                       │   - Knowledge Base       │ │
│                                       └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Port | Purpose |
|-----------|------|---------|
| Next.js Backend | 3000 | REST API, webhook handlers, business logic |
| OpenBSP Bridge | 3001 | WhatsApp Business API bridge (legacy/fallback) |
| Grafana | 3002 | Monitoring dashboards |
| PostgreSQL | 5432 | Primary database (users, flights, messages, payments) |
| Redis | 6379 | Cache, session store, rate limiting |
| Prometheus | 9090 | Metrics collection and alerting |
| AlertManager | 9093 | Alert routing and notification |
| Nginx | 80/443 | Reverse proxy, TLS termination, rate limiting |

---

## 2. Monitoring Stack

### Accessing the Monitoring Dashboard

```bash
# Start monitoring stack
docker compose -f docker-compose.monitoring.yml up -d
```

| Tool | URL | Credentials | Purpose |
|------|-----|-------------|---------|
| **Grafana** | http://localhost:3002 | `admin` / `aeroassist_grafana_2024` | Visual dashboards, alerts UI |
| **Prometheus** | http://localhost:9090 | None (local only) | Raw metrics, PromQL queries |
| **AlertManager** | http://localhost:9093 | None (local only) | Alert silencing, routing rules |
| **Node Exporter** | http://localhost:9100 | None | Host-level system metrics |

### Key Grafana Dashboards

- **AeroAssist Overview** — Request rate, error rate, latency percentiles
- **WhatsApp Metrics** — Messages in/out, delivery rate, webhook latency
- **Database Health** — Connection pool, query latency, lock contention
- **AI Pipeline** — Groq API latency, token usage, cache hit rate
- **Infrastructure** — CPU, memory, disk, network per container

### Key Alerts

| Alert | Severity | Threshold | Action |
|-------|----------|-----------|--------|
| Error Rate > 1% | Warning | 5xx responses > 1% of total | Check logs, restart if needed |
| Error Rate > 5% | Critical | 5xx responses > 5% of total | Immediate investigation |
| P95 Latency > 2s | Warning | Chat endpoint response time | Check Groq, DB queries |
| WhatsApp Webhook Down | Critical | No webhook events for 5 min | See §3.1 |
| Database Connection Pool Exhausted | Warning | Active connections > 90% of max | See §3.4 |
| Memory Usage > 85% | Warning | Container memory near limit | See §3.5 |
| Stripe Webhook Failure | Critical | Payment webhook returns non-200 | See §3.3 |
| Disk Usage > 80% | Warning | Docker volume usage | Clean logs, prune images |

### Health Check Endpoint

```bash
curl -sf http://localhost:3000/api/health | jq .
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "groq": "available",
    "whatsapp": "connected"
  },
  "uptime": 86400
}
```

---

## 3. Common Incidents & Resolution

### 3.1 WhatsApp Webhook Down

**Symptoms:** Users report not receiving responses; no incoming messages in logs; Grafana shows 0 webhook events.

**Diagnosis:**
```bash
# 1. Check Meta status page
open https://developers.facebook.com/status/

# 2. Check OpenBSP bridge health
curl -sf http://localhost:3001/health | jq .

# 3. Check webhook verification
curl -v "http://localhost:3000/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=aeroassist_verify_2024&hub.challenge=test"

# 4. Check recent webhook logs
docker compose logs backend --since=30m | grep -i "whatsapp\|webhook"
```

**Resolution Steps:**
1. **Verify Meta status** — Check https://developers.facebook.com/status/ for WhatsApp API outages
2. **Verify webhook signature** — Ensure `META_WEBHOOK_VERIFY_TOKEN` matches Meta config exactly
3. **Check access token** — Verify `META_WHATSAPP_ACCESS_TOKEN` hasn't expired in Meta Developer Portal
4. **Restart bridge service:**
   ```bash
   docker compose restart openbsp
   sleep 40
   curl -sf http://localhost:3001/health | jq .
   ```
5. **Test with a WhatsApp message** — Send a test message to the business number
6. **Check Redis session store:**
   ```bash
   docker exec aeroassist_redis redis-cli -a "$REDIS_PASSWORD" DBSIZE
   ```

---

### 3.2 Groq AI Timeout

**Symptoms:** Chat responses take > 10s or return errors; "AI service unavailable" messages to users.

**Diagnosis:**
```bash
# Check Groq API latency in logs
docker compose logs backend --since=15m | grep -i "groq\|timeout\|AI"

# Check API quota usage
curl -sf http://localhost:3000/api/health | jq '.services.groq'
```

**Resolution Steps:**
1. **Check Groq status page** — https://groq.com/ for any service degradation
2. **Verify API quota** — Check Groq dashboard for rate limit / token usage
3. **Check retry configuration** — In `.env`:
   ```bash
   GROQ_MAX_RETRIES=3
   GROQ_TIMEOUT_MS=15000
   ```
4. **Fallback behavior** — The system automatically falls back to:
   - Cached responses from previous similar queries
   - Pre-built knowledge base answers (RAG only, no AI generation)
   - Graceful error message: "Notre assistant IA est temporairement indisponible. Veuillez réessayer dans quelques instants."
5. **If persistent:**
   ```bash
   docker compose restart backend
   # Monitor for 5 minutes
   docker compose logs backend -f --since=5m | grep -i "groq"
   ```

---

### 3.3 Stripe Payment Failures

**Symptoms:** Users report payment errors; Stripe Dashboard shows failed webhooks; payment intent stuck in `requires_payment_method`.

**Diagnosis:**
```bash
# 1. Check Stripe status
open https://status.stripe.com/

# 2. Check webhook endpoint
docker compose logs backend --since=1h | grep -i "stripe\|payment\|webhook"

# 3. Test webhook endpoint manually
curl -v -X POST http://localhost:3000/api/stripe/webhook \
  -H "Stripe-Signature: t=1234,v1=test" \
  -d '{}'

# 4. Verify API key
grep STRIPE_SECRET_KEY .env
```

**Resolution Steps:**
1. **Verify webhook secret** — `STRIPE_WEBHOOK_SECRET` in `.env` must match Stripe Dashboard signing secret
2. **Check payment intent status** — In Stripe Dashboard → Payments:
   - `requires_payment_method` → Customer issue, no action needed
   - `requires_confirmation` → Server didn't confirm; check logs
   - `requires_action` → SCA/3DS authentication needed
   - `processing` → Normal bank processing; wait
   - `succeeded` → Payment completed
3. **Retry failed webhooks** — Stripe Dashboard → Developers → Webhooks → Send test webhook
4. **If secret needs rotation:**
   ```bash
   # Update in .env
   STRIPE_WEBHOOK_SECRET=whsec_new_secret_value
   # Restart backend
   docker compose restart backend
   ```
5. **Common error codes:**
   - `card_declined` → Customer's card issue
   - `rate_limit` → Too many API calls; implement backoff
   - `api_connection_error` → Network/firewall issue

---

### 3.4 Database Connection Issues

**Symptoms:** 5xx errors on all endpoints; "PrismaClientInitializationError" in logs; health check shows `database: disconnected`.

**Diagnosis:**
```bash
# 1. Check PostgreSQL status
docker exec aeroassist_postgres pg_isready -U aeroassist -d aeroassist_db

# 2. Check active connections
docker exec aeroassist_postgres psql -U aeroassist -d aeroassist_db -c \
  "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# 3. Check long-running queries
docker exec aeroassist_postgres psql -U aeroassist -d aeroassist_db -c \
  "SELECT pid, now()-query_start AS duration, query FROM pg_stat_activity \
   WHERE state != 'idle' ORDER BY duration DESC LIMIT 10;"

# 4. Check connection pool settings
grep DATABASE_URL .env
```

**Resolution Steps:**
1. **Restart PostgreSQL:**
   ```bash
   docker compose restart postgres
   sleep 10
   docker exec aeroassist_postgres pg_isready -U aeroassist -d aeroassist_db
   ```
2. **Kill long-running idle connections:**
   ```bash
   docker exec aeroassist_postgres psql -U aeroassist -d aeroassist_db -c \
     "SELECT pg_terminate_backend(pid) FROM pg_stat_activity \
      WHERE state = 'idle' AND query_start < now() - interval '1 hour';"
   ```
3. **Increase connection pool** — In `DATABASE_URL`:
   ```
   DATABASE_URL="postgresql://aeroassist:password@postgres:5432/aeroassist_db?connection_limit=20&pool_timeout=30"
   ```
4. **Restart backend** to reset Prisma client connections:
   ```bash
   docker compose restart backend
   ```
5. **Check Prisma logs:**
   ```bash
   docker compose logs backend --since=10m | grep -i "prisma\|database\|connection"
   ```

---

### 3.5 High Memory Usage

**Symptoms:** Container OOM kills; Grafana memory alert > 85%; slow response times.

**Diagnosis:**
```bash
# Check per-container memory usage
docker stats --no-stream

# Check Node.js heap (if heapdump is available)
docker exec aeroassist_backend node -e "console.log(process.memoryUsage())"
```

**Resolution Steps:**
1. **Immediate — restart the memory-heavy container:**
   ```bash
   docker compose restart backend
   docker compose restart openbsp
   ```
2. **Check for memory leaks in logs:**
   ```bash
   docker compose logs backend --since=1h | grep -i "heap\|memory\|GC\|allocation"
   ```
3. **Common causes:**
   - Session data accumulating in Redis (check `DBSIZE`)
   - Large knowledge base chunks loaded into memory
   - Unreleased database connections
   - WebSocket connections not being cleaned up
4. **Cleanup Redis sessions:**
   ```bash
   docker exec aeroassist_redis redis-cli -a "$REDIS_PASSWORD" FLUSHDB
   ```
5. **If persistent** — Capture heap snapshot for analysis:
   ```bash
   docker exec aeroassist_backend node -e "
     const fs = require('fs');
     const { performance } = require('perf_hooks');
     // Requires heapdump or v8 module
   "
   ```

---

### 3.6 RAG Pipeline Degraded

**Symptoms:** AI responses are generic or incorrect; knowledge base returns no results; slow retrieval times.

**Diagnosis:**
```bash
# 1. Check embedding cache status
curl -sf http://localhost:3000/api/health | jq '.embedding'

# 2. Test RAG retrieval quality
curl -s -X POST http://localhost:3000/api/rag/test \
  -H "Content-Type: application/json" \
  -d '{"query": "Où manger au terminal 2E CDG ?", "maxResults": 3}' | jq .

# 3. Check knowledge base entry count
docker exec aeroassist_postgres psql -U aeroassist -d aeroassist_db -c \
  "SELECT count(*) FROM \"KnowledgeDocument\";"
```

**Resolution Steps:**
1. **Check embedding cache** — Redis should have cached embeddings:
   ```bash
   docker exec aeroassist_redis redis-cli -a "$REDIS_PASSWORD" KEYS "embedding:*" | wc -l
   ```
2. **Reindex knowledge base:**
   ```bash
   curl -X POST http://localhost:3000/api/knowledge/reindex \
     -H "Authorization: Bearer $ADMIN_API_KEY" \
     -H "Content-Type: application/json"
   ```
3. **Reimport individual documents:**
   ```bash
   curl -X POST http://localhost:3000/api/knowledge/import-url \
     -H "Authorization: Bearer $ADMIN_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://example.com/airport-info"}'
   ```
4. **Check embedding service** — Groq or OpenAI embedding endpoint must be reachable:
   ```bash
   docker compose logs backend --since=15m | grep -i "embedding\|vector\|chunk"
   ```
5. **Verify vector similarity search:**
   ```bash
   docker exec aeroassist_postgres psql -U aeroassist -d aeroassist_db -c \
     "SELECT count(*) FROM pg_extension WHERE extname = 'vector';"
   ```

---

## 4. Emergency Procedures

### 4.1 Rollback Steps

```bash
# 1. Identify the previous working image/tag
docker images | grep aeroassist_backend

# 2. Stop current version
docker compose stop backend

# 3. Roll back to previous version (update docker-compose.yml or tag)
docker tag aeroassist_backend:previous aeroassist_backend:latest
docker compose up -d backend

# 4. Verify health
sleep 30
curl -sf http://localhost:3000/api/health | jq .

# 5. If database schema changed, rollback migrations
docker exec aeroassist_backend npx prisma migrate reset --force
# Then restore backup (see §5)
```

### 4.2 Force Restart All Services

```bash
# Full stop and clean start
docker compose down
docker compose -f docker-compose.monitoring.yml down
docker compose up -d
docker compose -f docker-compose.monitoring.yml up -d

# Verify everything is healthy
sleep 30
docker compose ps
curl -sf http://localhost:3000/api/health | jq .
```

### 4.3 Maintenance Mode

```bash
# Enable maintenance mode (responds with 503 to all chat requests)
curl -X POST http://localhost:3000/api/admin/maintenance \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "message": "Service en maintenance. Nous serons de retour sous 30 minutes."}'

# Disable maintenance mode
curl -X POST http://localhost:3000/api/admin/maintenance \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

### 4.4 Incident Severity Matrix

| Severity | Response Time | Examples |
|----------|--------------|----------|
| **P1 — Critical** | 15 minutes | Service down, data loss, payment failure |
| **P2 — High** | 30 minutes | Partial outage, degraded AI, slow responses |
| **P3 — Medium** | 2 hours | Non-critical feature broken, UI glitch |
| **P4 — Low** | 24 hours | Minor bug, cosmetic issue, documentation |

---

## 5. Backup & Recovery

### 5.1 PostgreSQL Backup Schedule

| Schedule | Type | Retention |
|----------|------|-----------|
| **Daily at 02:00 UTC** | Full backup (pg_dump custom) | 30 days |
| **Hourly** | WAL archiving (if enabled) | 7 days |
| **On-demand** | Manual backup before deployments | Until next deployment |

### 5.2 Create a Backup

```bash
# Full database backup
docker exec aeroassist_postgres pg_dump -U aeroassist -d aeroassist_db \
  --format=custom \
  --file=/var/lib/postgresql/data/backup_$(date +%Y%m%d_%H%M%S).dump

# Copy backup to host
BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S).dump"
docker exec aeroassist_postgres pg_dump -U aeroassist -d aeroassist_db \
  --format=custom --file=/tmp/$BACKUP_NAME
docker cp aeroassist_postgres:/tmp/$BACKUP_NAME ./backups/
```

### 5.3 Restore from Backup

```bash
# 1. Stop backend to prevent writes during restore
docker compose stop backend

# 2. Restore from backup (adjust filename)
docker exec -i aeroassist_postgres pg_restore -U aeroassist -d aeroassist_db \
  --clean --if-exists --verbose < ./backups/backup_YYYYMMDD_HHMMSS.dump

# 3. Run pending Prisma migrations
docker compose up -d backend
docker exec aeroassist_backend npx prisma migrate deploy

# 4. Verify data integrity
docker exec aeroassist_postgres psql -U aeroassist -d aeroassist_db -c \
  "SELECT count(*) FROM \"User\"; SELECT count(*) FROM \"Flight\"; SELECT count(*) FROM \"KnowledgeDocument\";"

# 5. Verify health
curl -sf http://localhost:3000/api/health | jq .
```

### 5.4 Redis Backup

```bash
# Trigger RDB snapshot
docker exec aeroassist_redis redis-cli -a "$REDIS_PASSWORD" BGSAVE

# Copy to host
docker cp aeroassist_redis:/data/dump.rdb ./backups/redis_dump_$(date +%Y%m%d).rdb
```

### 5.5 Configuration Backup

```bash
tar czf ./backups/config_$(date +%Y%m%d).tar.gz \
  .env \
  docker-compose.yml \
  docker-compose.monitoring.yml \
  monitoring/ \
  docker/nginx/nginx.conf \
  prisma/schema.prisma \
  src/data/templates.json
```

---

## 6. Useful Commands

### Docker Commands

```bash
# All services status
docker compose ps

# Container resource usage
docker stats --no-stream

# Restart a single service
docker compose restart backend

# Full stop and start
docker compose down && docker compose up -d

# View logs (last 100 lines, follow mode)
docker compose logs --tail=100 -f backend

# Logs since specific time
docker compose logs --since=1h backend

# Filter error logs
docker compose logs backend 2>&1 | grep -iE "error|fatal|exception"

# Prune unused resources (disk cleanup)
docker system prune -af --volumes
```

### Health Check Commands

```bash
# Application health
curl -sf http://localhost:3000/api/health | jq .

# WhatsApp bridge health
curl -sf http://localhost:3001/health | jq .

# PostgreSQL status
docker exec aeroassist_postgres pg_isready -U aeroassist -d aeroassist_db

# Redis ping
docker exec aeroassist_redis redis-cli -a "$REDIS_PASSWORD" ping

# Nginx status
curl -sf -o /dev/null -w "%{http_code}" http://localhost/

# Full system status (one-liner)
docker compose ps && echo "---" && curl -sf http://localhost:3000/api/health | jq .
```

### Log Locations

| Log Source | Location | Command |
|-----------|----------|---------|
| Docker container logs | Docker daemon | `docker compose logs -f backend` |
| Application combined | `logs/combined.log` | `tail -f logs/combined.log` |
| Application errors | `logs/error.log` | `tail -f logs/error.log` |
| Nginx access | `logs/nginx/access.log` | `tail -f logs/nginx/access.log` |
| Nginx errors | `logs/nginx/error.log` | `tail -f logs/nginx/error.log` |
| Grafana | Docker daemon | `docker compose logs grafana` |

---

## 7. Contacts & Escalation

### Escalation Matrix

| Level | Response Time | Contact Method | When to Escalate |
|-------|--------------|----------------|-----------------|
| **L1 — On-call** | 15 minutes | Slack `#incidents` | All alerts and incidents |
| **L2 — Senior Engineer** | 30 minutes | Phone call | Critical unresolved after 15 min |
| **L3 — Engineering Lead** | 1 hour | Phone call | Service-wide outage, data loss risk |
| **L4 — CTO** | 2 hours | Phone call | Prolonged outage, customer impact |

### Team Contacts

| Role | Name | Slack | Phone |
|------|------|-------|-------|
| Platform Lead | — | `@platform-lead` | — |
| Backend Engineer | — | `@backend-oncall` | — |
| DevOps Engineer | — | `@devops-oncall` | — |
| Product Owner | — | `@product-owner` | — |

### External Vendor Support

| Vendor | Purpose | Status Page | Support |
|--------|---------|-------------|---------|
| **Meta / WhatsApp** | WhatsApp Business API | https://developers.facebook.com/status/ | Meta Developer Support |
| **Stripe** | Payments & Billing | https://status.stripe.com/ | https://support.stripe.com/ |
| **Groq** | AI/LLM Inference | https://groq.com/ | Groq Support |
| **Cloud Provider** | Infrastructure | Provider dashboard | Provider support portal |

### Incident Communication Template

```
🔴 INCIDENT: [Service] — [Brief Description]

**Severity:** P1 Critical / P2 High / P3 Medium
**Start Time:** YYYY-MM-DD HH:MM UTC
**Impact:** [What users are experiencing]
**Status:** Investigating / Identified / Mitigated / Resolved

**Actions Taken:**
1. [Action 1]
2. [Action 2]

**Next Steps:**
- [Planned next action]
- ETA for resolution: [estimate]

**Runbook:** docs/README-RUNBOOK.md#section
```

---

*This runbook is a living document. Update it after every incident with lessons learned and new resolution procedures.*
