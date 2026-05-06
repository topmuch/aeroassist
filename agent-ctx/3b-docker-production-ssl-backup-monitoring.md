# Task 3b — Docker Production + SSL + Backup + Monitoring

## Work Summary

All 6 required files have been created successfully. The existing monitoring files were **not modified** as instructed.

## Files Created

| # | File | Lines | Description |
|---|------|-------|-------------|
| 1 | `docker-compose.prod.yml` | 212 | Production Docker Compose: PostgreSQL 16 (pgvector), Redis 7 Alpine, Next.js backend, Nginx reverse proxy, Certbot |
| 2 | `docker/nginx/prod.conf` | 258 | Nginx production config: HTTP→HTTPS redirect, SSL/TLS, HSTS, rate limiting, WebSocket proxy, security headers, gzip |
| 3 | `scripts/backup-db.sh` | 167 | PostgreSQL backup script: pg_dump custom format, gzip, 7-backup rotation, Docker-aware, colored logging |
| 4 | `monitoring/grafana/provisioning/dashboards.yml` | 12 | Grafana dashboard provisioning config |
| 5 | `monitoring/grafana/provisioning/dashboards/aeroassist.json` | 751 | Grafana dashboard: System Overview, HTTP Metrics, Application Stats, Billing panels with Prometheus datasource |
| 6 | `docs/DEPLOYMENT-PRODUCTION.md` | 578 | Production deployment guide in French: 12 sections, 15-item checklist |
| 7 | `docs/RUNBOOK-INCIDENT.md` | 836 | Incident runbook in French: 12 sections including P1-P4 procedures, post-mortem template |

## Files NOT Modified (as instructed)

- `docker-compose.monitoring.yml` — left untouched
- `monitoring/prometheus.yml` — left untouched
- `monitoring/alert_rules.yml` — left untouched
- `monitoring/alertmanager.yml` — left untouched
- `monitoring/grafana/provisioning/datasources/prometheus.yml` — left untouched

## Key Design Decisions

1. **docker-compose.prod.yml**: No OpenBSP in production (`OPENBSP_API_URL: ""`), uses Meta API directly. Resource limits enforced on all containers. Health checks with proper `start_period`.
2. **nginx/prod.conf**: Dedicated rate limit zones for API (10r/s), WhatsApp (20r/m), Stripe (5r/s). Socket.IO WebSocket support with 24h timeout. CSP header configured.
3. **backup-db.sh**: Auto-detects Docker container for `docker exec` vs local `pg_dump`. Validates backup size to catch empty dumps. Supports cron usage with `>> log 2>&1`.
4. **Grafana dashboard**: Uses actual metrics from `src/app/api/metrics/route.ts` — `aeroassist_*` gauges, `http_request_duration_seconds_bucket` histogram, `process_*` gauges.
5. **DEPLOYMENT-PRODUCTION.md**: Covers secret generation, SSL initialisation, seed, Meta/Stripe config references, monitoring, backup cron, update/rollback procedures.
6. **RUNBOOK-INCIDENT.md**: Severity matrix with response times, detailed diagnostic commands for each incident type (DB down, Redis OOM, Stripe webhook, WhatsApp timeout, Nginx 502/503, SSL expiry, memory leak), full rollback procedures, blameless post-mortem template.
