# AeroAssist Incident Runbook

> **Version:** 1.0.0  
> **Last Updated:** 2025-01  
> **Classification:** Internal — Operations Team

---

## Table of Contents

1. [System Health Check](#1-system-health-check)
2. [Restart Services](#2-restart-services)
3. [Check Logs](#3-check-logs)
4. [Reindex Knowledge Base](#4-reindex-knowledge-base)
5. [WhatsApp Provider Failover](#5-whatsapp-provider-failover)
6. [Stripe Webhook Failures](#6-stripe-webhook-failures)
7. [Backup & Restore Procedures](#7-backup--restore-procedures)
8. [Common Issues & Resolutions](#8-common-issues--resolutions)
9. [Emergency Contacts & Escalation](#9-emergency-contacts--escalation)
10. [Port Reference](#10-port-reference)

---

## 1. System Health Check

### Quick Status Dashboard

```bash
# Run all health checks in sequence
./scripts/health-check.sh
```

### Individual Service Checks

```bash
# Next.js Backend (port 3000)
curl -sf http://localhost:3000/api/health | jq .

# OpenBSP / WhatsApp Bridge (port 3001)
curl -sf http://localhost:3001/health | jq .

# PostgreSQL
docker exec aeroassist_postgres pg_isready -U aeroassist -d aeroassist_db

# Redis
docker exec aeroassist_redis redis-cli -a "$REDIS_PASSWORD" ping

# Nginx
curl -sf -o /dev/null -w "%{http_code}" http://localhost/
```

### Docker Service Status

```bash
# All services overview
docker compose ps

# Specific service health
docker inspect --format='{{.State.Health.Status}}' aeroassist_backend
docker inspect --format='{{.State.Health.Status}}' aeroassist_postgres
docker inspect --format='{{.State.Health.Status}}' aeroassist_redis
docker inspect --format='{{.State.Health.Status}}' aeroassist_openbsp
```

### Monitoring Stack

```bash
# Start monitoring stack
docker compose -f docker-compose.monitoring.yml up -d

# Grafana Dashboard: http://localhost:3002
#   Login: admin / aeroassist_grafana_2024

# Prometheus: http://localhost:9090
# AlertManager: http://localhost:9093
# Node Exporter: http://localhost:9100
```

### Database Connectivity Check

```bash
# Test database connection from app context
docker exec aeroassist_backend sh -c \
  'wget -qO- http://localhost:3000/api/health'

# Check active connections
docker exec aeroassist_postgres psql -U aeroassist -d aeroassist_db -c \
  "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# Check for long-running queries
docker exec aeroassist_postgres psql -U aeroassist -d aeroassist_db -c \
  "SELECT pid, now()-query_start AS duration, query FROM pg_stat_activity \
   WHERE state != 'idle' ORDER BY duration DESC LIMIT 10;"
```

---

## 2. Restart Services

### Restart a Single Service

```bash
# Backend (Next.js)
docker compose restart backend

# OpenBSP (WhatsApp bridge)
docker compose restart openbsp

# PostgreSQL
docker compose restart postgres

# Redis
docker compose restart redis

# Nginx
docker compose restart nginx
```

### Restart All Services

```bash
# Graceful restart (preserves data)
docker compose restart

# Full stop and start (if restart is insufficient)
docker compose down && docker compose up -d
```

### Rolling Restart (Zero Downtime)

```bash
# Restart backend with health check validation
docker compose up -d --no-deps --force-recreate backend

# Verify health after restart
sleep 30
curl -sf http://localhost:3000/api/health | jq .
```

### After Restart Checklist

- [ ] Verify `/api/health` returns `200 OK`
- [ ] Verify `/api/chat` responds to test message
- [ ] Verify OpenBSP health at `:3001/health`
- [ ] Check Grafana dashboard for error spikes
- [ ] Verify WhatsApp webhooks are receiving messages

---

## 3. Check Logs

### Docker Container Logs

```bash
# Backend logs (last 100 lines, follow)
docker compose logs --tail=100 -f backend

# OpenBSP logs
docker compose logs --tail=100 -f openbsp

# PostgreSQL logs
docker compose logs --tail=100 -f postgres

# Redis logs
docker compose logs --tail=100 -f redis

# Nginx access/error logs
docker compose logs --tail=100 -f nginx
```

### Application Log Files

```bash
# Application combined log (Winston)
tail -f logs/combined.log

# Application error log
tail -f logs/error.log

# Nginx access logs
tail -f logs/nginx/access.log

# Nginx error logs
tail -f logs/nginx/error.log
```

### Filter Logs by Level

```bash
# Show only ERROR level logs
docker compose logs backend 2>&1 | grep -i "error\|fatal\|exception"

# Show only WARN and above
docker compose logs backend 2>&1 | grep -iE "warn|error|fatal|exception"

# Find specific error patterns
docker compose logs backend 2>&1 | grep -i "unhandled\|ECONNREFUSED\|ETIMEDOUT"
```

### Search Logs by Time Range

```bash
# Last hour of backend logs
docker compose logs --since=1h backend

# Specific time range
docker compose logs --since="2025-01-15T10:00:00" --until="2025-01-15T11:00:00" backend
```

---

## 4. Reindex Knowledge Base

### Full Reindex

```bash
# Via API (recommended)
curl -X POST http://localhost:3000/api/knowledge/reindex \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json"

# Via script (direct database access)
bun run scripts/reindex-all.ts
```

### Partial Reindex (Single Document)

```bash
# Reimport a URL
curl -X POST http://localhost:3000/api/knowledge/import-url \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/airport-info"}'

# Reimport a PDF
curl -X POST http://localhost:3000/api/knowledge/import-pdf \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -F "file=@document.pdf"
```

### Check Index Status

```bash
# View current knowledge base entries
curl -s http://localhost:3000/api/knowledge \
  -H "Authorization: Bearer $ADMIN_API_KEY" | jq '.count, .categories'

# Test RAG retrieval quality
curl -s -X POST http://localhost:3000/api/rag/test \
  -H "Content-Type: application/json" \
  -d '{"query": "Où manger au terminal 2E CDG ?", "maxResults": 3}' | jq .
```

### Verify Embedding Service

```bash
# Check if the embedding service is responding
# (Depends on configured provider - Groq, OpenAI, etc.)
curl -s http://localhost:3000/api/health | jq '.embedding'
```

---

## 5. WhatsApp Provider Failover

### Detect WhatsApp Issues

```bash
# Check OpenBSP health
curl -sf http://localhost:3001/health | jq .

# Check WhatsApp-specific status
curl -sf http://localhost:3000/api/whatsapp/templates \
  -H "Authorization: Bearer $ADMIN_API_KEY" | jq .

# Monitor WhatsApp webhook logs
docker compose logs openbsp --since=30m | grep -i "whatsapp\|webhook\|error"
```

### Immediate Troubleshooting Steps

1. **Verify OpenBSP connectivity:**
   ```bash
   docker compose restart openbsp
   sleep 40  # Wait for health check start_period
   curl -sf http://localhost:3001/health | jq .
   ```

2. **Check Meta/WhatsApp API credentials:**
   - Verify `WHATSAPP_ACCESS_TOKEN` is valid and not expired
   - Verify `WHATSAPP_PHONE_NUMBER_ID` matches your Meta Business account
   - Check token rotation schedule in Meta Developer Portal

3. **Test webhook verification:**
   ```bash
   # Verify the webhook endpoint is reachable from Meta
   curl -v http://localhost:3000/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=aeroassist_verify_2024&hub.challenge=test
   ```

4. **Check Redis session store:**
   ```bash
   docker exec aeroassist_redis redis-cli -a "$REDIS_PASSWORD" DBSIZE
   ```

### Failover Procedure

If the primary WhatsApp provider (OpenBSP) is down for more than **5 minutes**:

1. **Enable maintenance mode notification** via the admin dashboard
2. **Notify the team** via Slack `#incidents` channel
3. **Check Meta for service outages:** https://developers.facebook.com/status/
4. **If Meta API is the issue:**
   - Switch to backup access token (rotate via Meta Developer Portal)
   - Update `WHATSAPP_ACCESS_TOKEN` in `.env` and restart: `docker compose up -d openbsp backend`
5. **If OpenBSP is the issue:**
   - Check Docker logs: `docker compose logs openbsp --tail=200`
   - Scale OpenBSP: `docker compose up -d --scale openbsp=2` (if supported)
6. **After recovery:**
   - Verify message delivery with a test WhatsApp message
   - Clear any queued messages from Redis
   - Update incident ticket with root cause

---

## 6. Stripe Webhook Failures

### Detect Stripe Issues

```bash
# Check recent Stripe-related logs
docker compose logs backend --since=1h | grep -i "stripe\|payment\|webhook"

# Check Stripe endpoint health
curl -s http://localhost:3000/api/stripe/portal \
  -H "Authorization: Bearer $ADMIN_API_KEY" | head -c 200

# View recent webhook failures in Stripe Dashboard
# https://dashboard.stripe.com/webhooks
```

### Immediate Troubleshooting Steps

1. **Verify webhook endpoint is reachable:**
   ```bash
   # Stripe sends to: https://yourdomain.com/api/stripe/webhook
   curl -v -X POST http://localhost:3000/api/stripe/webhook \
     -H "Stripe-Signature: t=1234,v1=test" \
     -d '{}'
   ```

2. **Verify webhook secret:**
   - The `STRIPE_WEBHOOK_SECRET` must match the signing secret from the Stripe Dashboard
   - Located in `.env` → `STRIPE_WEBHOOK_SECRET`
   - To rotate: copy new secret from Stripe Dashboard, update `.env`, restart backend

3. **Check Stripe API key validity:**
   ```bash
   # The key should start with `sk_live_` (prod) or `sk_test_` (staging)
   grep STRIPE_SECRET_KEY .env
   ```

4. **Retry failed webhooks:**
   - Go to Stripe Dashboard → Developers → Webhooks → Your endpoint
   - Click "Send test webhook" with a `checkout.session.completed` event
   - Or use Stripe CLI:
     ```bash
     stripe listen --forward-to localhost:3000/api/stripe/webhook
     stripe trigger checkout.session.completed
     ```

### Payment Failure Escalation

If multiple payment failures are detected:

1. **Check if Stripe API is degraded:** https://status.stripe.com/
2. **Review error codes** in logs for patterns:
   - `card_declined` → Customer issue, no action needed
   - `authentication_required` → SCA/3DS issue
   - `rate_limit` → Your API usage is too high
   - `api_connection_error` → Network/firewall issue
3. **Do NOT retry failed charges automatically** — Stripe handles retries with Smart Retries
4. **Contact Stripe Support** if the issue persists: https://support.stripe.com/

---

## 7. Backup & Restore Procedures

### PostgreSQL Backup

```bash
# Create a backup
docker exec aeroassist_postgres pg_dump -U aeroassist -d aeroassist_db \
  --format=custom \
  --file=/var/lib/postgresql/data/backup_$(date +%Y%m%d_%H%M%S).dump

# Copy backup to host
BACKUP_FILE=$(ls -t /var/lib/docker/volumes/aeroassist_postgres_data/_data/backup_*.dump | head -1)
docker cp aeroassist_postgres:"$(basename $BACKUP_FILE)" ./backups/

# Automated daily backup (add to crontab)
# 0 2 * * * /path/to/backup-script.sh
```

### PostgreSQL Restore

```bash
# Stop the backend to prevent writes during restore
docker compose stop backend

# Restore from backup
docker exec -i aeroassist_postgres pg_restore -U aeroassist -d aeroassist_db \
  --clean --if-exists --verbose < ./backups/backup_YYYYMMDD_HHMMSS.dump

# Restart backend
docker compose start backend

# Verify data integrity
docker exec aeroassist_postgres psql -U aeroassist -d aeroassist_db -c \
  "SELECT count(*) FROM \"User\"; SELECT count(*) FROM \"Flight\"; SELECT count(*) FROM \"KnowledgeDocument\";"
```

### Redis Backup

```bash
# Trigger Redis save (RDB snapshot)
docker exec aeroassist_redis redis-cli -a "$REDIS_PASSWORD" BGSAVE

# Copy Redis dump to host
docker cp aeroassist_redis:/data/dump.rdb ./backups/redis_dump_$(date +%Y%m%d).rdb
```

### Configuration Backup

```bash
# Backup all configuration files
tar czf ./backups/config_$(date +%Y%m%d).tar.gz \
  .env \
  docker-compose.yml \
  docker-compose.override.yml \
  docker-compose.monitoring.yml \
  monitoring/ \
  docker/nginx/nginx.conf \
  docker/backend/Dockerfile \
  docker/backend/entrypoint.sh \
  docker/openbsp/config.json
```

### Full System Restore

```bash
# 1. Stop all services
docker compose down
docker compose -f docker-compose.monitoring.yml down

# 2. Restore configuration
tar xzf ./backups/config_YYYYMMDD.tar.gz

# 3. Start infrastructure services
docker compose up -d postgres redis

# 4. Wait for healthy state
sleep 30
docker exec aeroassist_postgres pg_isready -U aeroassist -d aeroassist_db

# 5. Restore database
docker exec -i aeroassist_postgres pg_restore -U aeroassist -d aeroassist_db \
  --clean --if-exists < ./backups/backup_YYYYMMDD_HHMMSS.dump

# 6. Restore Redis
docker cp ./backups/redis_dump_YYYYMMDD.rdb aeroassist_redis:/data/dump.rdb
docker compose restart redis

# 7. Start all services
docker compose up -d

# 8. Verify
sleep 30
curl -sf http://localhost:3000/api/health | jq .
```

---

## 8. Common Issues & Resolutions

### Error Rate Above 1%

| Symptom | Likely Cause | Resolution |
|---------|-------------|------------|
| Spike in 5xx errors | Backend crash or OOM | Check `docker compose logs backend`, restart if needed |
| 429 Too Many Requests | Rate limiting triggered | Check `RATE_LIMIT_MAX_REQUESTS` in `.env`, adjust if legitimate traffic |
| 502 Bad Gateway | Nginx can't reach backend | Check backend health: `docker compose ps backend` |
| 504 Gateway Timeout | Backend slow response | Check latency in Grafana, restart backend, investigate slow queries |

### Latency P95 Above 2s

| Symptom | Likely Cause | Resolution |
|---------|-------------|------------|
| Chat endpoint slow | Groq API latency | Check Groq service status, consider fallback model |
| RAG search slow | Large knowledge base | Reindex, check PostgreSQL query performance |
| All endpoints slow | Database connection pool exhausted | Check active connections, increase pool size |
| Periodic slowness | Memory pressure | Check `docker stats`, restart services if needed |

### Database Connection Issues

```bash
# Check connection pool
docker exec aeroassist_postgres psql -U aeroassist -d aeroassist_db -c \
  "SELECT count(*) FROM pg_stat_activity;"

# Kill long-running idle connections
docker exec aeroassist_postgres psql -U aeroassist -d aeroassist_db -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity \
   WHERE state = 'idle' AND query_start < now() - interval '1 hour';"

# Reset connection pool by restarting backend
docker compose restart backend
```

### Memory Issues

```bash
# Check container memory usage
docker stats --no-stream

# Restart memory-heavy containers
docker compose restart backend openbsp

# If persistent, check for memory leaks in logs
docker compose logs backend --since=1h | grep -i "heap\|memory\|GC\|allocation"
```

### Disk Space Issues

```bash
# Check disk usage
df -h
docker system df

# Clean up Docker resources
docker system prune -af --volumes

# Clean old logs
find logs/ -name "*.log" -mtime +30 -delete
truncate -s 0 logs/combined.log
```

### Nginx Issues

```bash
# Test Nginx configuration
docker exec aeroassist_nginx nginx -t

# Reload Nginx config (no downtime)
docker exec aeroassist_nginx nginx -s reload

# Check for rate limiting
docker compose logs nginx --since=1h | grep -c "limit_req"
```

---

## 9. Emergency Contacts & Escalation

### Escalation Levels

| Level | Response Time | Contact | When |
|-------|--------------|---------|-----|
| **L1 — On-call** | 15 minutes | Platform team Slack `#incidents` | All alerts |
| **L2 — Senior Engineer** | 30 minutes | Engineering lead via phone | Critical alerts unresolved after 15min |
| **L3 — CTO / VP Eng** | 1 hour | Executive via phone | Service-wide outage, data loss risk |

### External Vendor Contacts

| Vendor | Purpose | Dashboard / Support |
|--------|---------|-------------------|
| **Meta / WhatsApp Business** | WhatsApp API | https://developers.facebook.com/status/ |
| **Stripe** | Payments & Billing | https://status.stripe.com/ |
| **Groq** | AI/LLM Inference | https://groq.com/ |
| **Vercel** | Hosting (if used) | https://www.vercel-status.com/ |
| **Cloud Provider** | Infrastructure | Provider-specific dashboard |

### Incident Communication Template

```
🔴 INCIDENT: [Service] - [Brief Description]

**Severity:** Critical / Warning
**Start Time:** YYYY-MM-DD HH:MM UTC
**Impact:** [What users are experiencing]
**Status:** Investigating / Identified / Monitoring / Resolved

**Actions Taken:**
1. [Action 1]
2. [Action 2]

**Next Steps:**
- [Planned next action]
- ETA for resolution: [estimate]

**Runbook:** Link to relevant runbook section
```

---

## 10. Port Reference

| Port | Service | Purpose |
|------|---------|---------|
| **3000** | Next.js Backend | AeroAssist application |
| **3001** | OpenBSP | WhatsApp Business API bridge |
| **3002** | Grafana | Monitoring dashboards |
| **5432** | PostgreSQL | Primary database |
| **6379** | Redis | Cache & session store |
| **80/443** | Nginx | Reverse proxy & TLS termination |
| **9090** | Prometheus | Metrics collection & alerting |
| **9093** | AlertManager | Alert routing & notification |
| **9100** | Node Exporter | Host system metrics |
| **5050** | pgAdmin | Database admin (dev only) |
| **5540** | Redis Insight | Redis admin (dev only) |

---

## Quick Reference Commands

```bash
# Full system status
docker compose ps && echo "---" && curl -sf http://localhost:3000/api/health | jq .

# Restart everything
docker compose down && docker compose up -d && sleep 30 && curl -sf http://localhost:3000/api/health | jq .

# Tail all error logs
docker compose logs -f --since=10m 2>&1 | grep -i "error\|warn\|fatal"

# Start monitoring
docker compose -f docker-compose.monitoring.yml up -d

# Run load test
cd artillery && artillery run load-test.yml

# Create database backup
docker exec aeroassist_postgres pg_dump -U aeroassist -d aeroassist_db --format=custom --file=/tmp/backup.dump && docker cp aeroassist_postgres:/tmp/backup.dump ./backups/
```
