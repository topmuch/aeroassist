# AeroAssist — Runbook d'Incident

> **Version:** 1.0.0  
> **Dernière mise à jour:** Juin 2025  
> **Classification:** Interne — Équipe Opérations & On-Call  
> **Objectif:** Guide de réponse aux incidents pour la plateforme AeroAssist en production.

---

## Table des matières

1. [Contacts d'urgence](#1-contacts-durgence)
2. [Accès aux outils](#2-accès-aux-outils)
3. [Procédures d'incident par sévérité](#3-procédures-dincident-par-sévérité)
4. [Base de données down](#4-base-de-données-down)
5. [Redis full / OOM](#5-redis-full--oom)
6. [Stripe webhook en échec](#6-stripe-webhook-en-échec)
7. [WhatsApp API timeout](#7-whatsapp-api-timeout)
8. [Nginx 502 / 503](#8-nginx-502--503)
9. [SSL expiré](#9-ssl-expiré)
10. [Memory leak](#10-memory-leak)
11. [Procédure de rollback](#11-procédure-de-rollback)
12. [Template de post-mortem](#12-template-de-post-mortem)

---

## 1. Contacts d'urgence

### 1.1 Équipe d'intervention

| Rôle | Nom | Téléphone | Slack | Disponibilité |
|------|-----|-----------|-------|---------------|
| **Responsable Plateforme** | [Nom] | +33 6 XX XX XX XX | `@platform-lead` | L-V 9h-19h |
| **Ingénieur Backend On-Call** | [Nom] | +33 6 XX XX XX XX | `@backend-oncall` | 24/7 rotation |
| **Ingénieur DevOps On-Call** | [Nom] | +33 6 XX XX XX XX | `@devops-oncall` | 24/7 rotation |
| **Chef de Projet Technique** | [Nom] | +33 6 XX XX XX XX | `@tech-lead` | L-V 10h-18h |
| **Directeur Technique (CTO)** | [Nom] | +33 6 XX XX XX XX | `@cto` | Escalade L4 |

### 1.2 Supports tiers

| Fournisseur | Service | Page de statut | Support |
|-------------|---------|---------------|---------|
| **Meta / WhatsApp** | API WhatsApp Business | https://developers.facebook.com/status/ | Meta Developer Support |
| **Stripe** | Paiements & Webhooks | https://status.stripe.com/ | https://support.stripe.com/ |
| **Groq** | IA / LLM | https://groq.com/ | Groq Support |
| **Let's Encrypt** | Certificats SSL | https://letsencrypt.status.io/ | Community Forum |
| **Hébergeur** | Infrastructure serveur | Page statut hébergeur | Support hébergeur |

### 1.3 Canaux de communication

| Canal | Usage | Lien |
|-------|-------|------|
| `#incidents-aeroassist` | Déclaration d'incidents, coordination | Slack |
| `#alerts-aeroassist` | Alertes automatiques (Prometheus) | Slack |
| `oncall@aeroassist.fr` | Notifications email critiques | Email |
| PagerDuty | Escalade P1 automatisée | PagerDuty Dashboard |

---

## 2. Accès aux outils

### 2.1 Outils de monitoring

| Outil | URL | Identifiants | Accès |
|-------|-----|-------------|-------|
| **Grafana** | `https://<IP>:3002` | `admin` / `aeroassist_grafana_2024` | VPN / réseau interne |
| **Prometheus** | `http://<IP>:9090` | Aucun (local) | Serveur uniquement |
| **AlertManager** | `http://<IP>:9093` | Aucun (local) | Serveur uniquement |
| **Node Exporter** | `http://<IP>:9100` | Aucun | Serveur uniquement |

### 2.2 Outils métier

| Outil | URL | Usage |
|-------|-----|-------|
| **Stripe Dashboard** | https://dashboard.stripe.com | Paiements, webhooks, logs |
| **Meta Business Suite** | https://business.facebook.com | WhatsApp, templates, numéros |
| **Meta Developer Portal** | https://developers.facebook.com | Configuration webhook, tokens |
| **Groq Console** | https://console.groq.com | Usage API, quotas, latence |

### 2.3 Accès serveur

```bash
# SSH vers le serveur de production
ssh deploy@<IP_SERVEUR>

# Accès aux conteneurs Docker
cd /opt/aeroassist
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=100 -f backend
```

---

## 3. Procédures d'incident par sévérité

### 3.1 Matrice de sévérité

| Sévérité | Nom | Délai de réponse | Délai de résolution | Exemples |
|-----------|-----|-----------------|--------------------|----|
| **P1** | Critique | **15 minutes** | 2 heures | Service down, perte de données, échec de paiement |
| **P2** | Élevée | **30 minutes** | 4 heures | Dégradation partielle, IA indisponible, réponses lentes |
| **P3** | Moyenne | **2 heures** | 24 heures | Fonctionnalité non critique cassée, bug UI |
| **P4** | Faible | **24 heures** | 72 heures | Bug mineur, problème cosmétique, documentation |

### 3.2 Déclaration d'incident

```
🔴 INCIDENT: [Service] — [Description courte]

**Sévérité:** P1 Critique / P2 Élevée / P3 Moyenne / P4 Faible
**Heure de début:** YYYY-MM-DD HH:MM UTC
**Impact:** [Ce que les utilisateurs observent]
**Statut:** En investigation / Identifié / Atténué / Résolu
**Runbook:** docs/RUNBOOK-INCIDENT.md#section
```

Poster dans `#incidents-aeroassist` sur Slack.

### 3.3 P1 — Critique (réponse immédiate)

1. **Annoncer** l'incident dans `#incidents-aeroassist` (format ci-dessus)
2. **Appeler** l'ingénieur on-call si pas de réponse Slack en 5 min
3. **Isoler** le problème : `curl -sf https://aeroassist.fr/api/health | jq .`
4. **Diagnostics rapides** :
   ```bash
   docker compose -f docker-compose.prod.yml ps
   docker stats --no-stream
   docker compose -f docker-compose.prod.yml logs --tail=50 backend | grep -i "error\|fatal"
   ```
5. **Décision** : rollback, restart, ou correctif
6. **Communication** : mise à jour toutes les 15 min dans le canal Slack
7. **Escalade** vers CTO si non résolu en 1h

### 3.4 P2 — Élevée

1. **Annoncer** dans `#incidents-aeroassist`
2. **Diagnostic** : vérifier les alertes Grafana, logs récents
3. **Contournement** si possible (ex: basculer vers un mode dégradé)
4. **Correctif** dans les 4 heures
5. **Mise à jour** dans le canal toutes les 30 min

### 3.5 P3 — Moyenne

1. **Ticket** dans le système de suivi (Jira/GitHub Issues)
2. **Planification** du correctif dans le sprint courant
3. **Workaround** documenté si applicable

### 3.6 P4 — Faible

1. **Ticket** de backlog
2. **Correction** lors du prochain cycle de maintenance

---

## 4. Base de données down

### 4.1 Symptômes

- Erreurs 5xx sur toutes les routes API
- `PrismaClientInitializationError` dans les logs
- Health check retourne `status: "DOWN"`, `database: { status: "down" }`
- Alerte Prometheus `InstanceDown` ou `HighErrorRate`

### 4.2 Diagnostic

```bash
# 1. Vérifier le statut du conteneur PostgreSQL
docker compose -f docker-compose.prod.yml ps postgres

# 2. Vérifier la connectivité PostgreSQL
docker exec aeroassist_postgres pg_isready -U aeroassist -d aeroassist_db

# 3. Vérifier les logs PostgreSQL
docker compose -f docker-compose.prod.yml logs --tail=100 postgres | tail -50

# 4. Vérifier l'utilisation disque
docker exec aeroassist_postgres df -h /var/lib/postgresql/data

# 5. Vérifier les connexions actives
docker exec aeroassist_postgres psql -U aeroassist -d aeroassist_db -c \
  "SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active';"

# 6. Vérifier les requêtes longues
docker exec aeroassist_postgres psql -U aeroassist -d aeroassist_db -c \
  "SELECT pid, now()-query_start AS duration, query FROM pg_stat_activity \
   WHERE state != 'idle' ORDER BY duration DESC LIMIT 10;"

# 7. Vérifier les verrous bloquants
docker exec aeroassist_postgres psql -U aeroassist -d aeroassist_db -c \
  "SELECT blocked_locks.pid AS blocked_pid, blocking_locks.pid AS blocking_pid, \
   blocked_activity.query AS blocked_query, blocking_activity.query AS blocking_query \
   FROM pg_catalog.pg_locks blocked_locks \
   JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid \
   JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype \
   AND blocking_locks.DATABASE IS NOT DISTINCT FROM blocked_locks.DATABASE \
   AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation \
   AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page \
   AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple \
   AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid \
   AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid \
   AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid \
   AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid \
   AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid \
   AND blocking_locks.pid != blocked_locks.pid \
   JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid \
   WHERE NOT blocked_locks.GRANTED;"
```

### 4.3 Actions de résolution

**Résolution 1 — Restart PostgreSQL :**
```bash
docker compose -f docker-compose.prod.yml restart postgres
sleep 10
docker exec aeroassist_postgres pg_isready -U aeroassist -d aeroassist_db
```

**Résolution 2 — Tuer les connexions idle longues :**
```bash
docker exec aeroassist_postgres psql -U aeroassist -d aeroassist_db -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity \
   WHERE state = 'idle' AND query_start < now() - interval '1 hour' AND pid <> pg_backend_pid();"
```

**Résolution 3 — Restart complet :**
```bash
docker compose -f docker-compose.prod.yml restart postgres redis backend
sleep 30
curl -sf https://aeroassist.fr/api/health | jq .
```

### 4.4 Restauration depuis backup

```bash
# 1. Arrêter le backend
docker compose -f docker-compose.prod.yml stop backend

# 2. Identifier la sauvegarde la plus récente
ls -lht /opt/aeroassist/backups/aeroassist_backup_*.sql.gz | head -5

# 3. Restaurer (remplacer le nom de fichier)
BACKUP_FILE="/opt/aeroassist/backups/aeroassist_backup_YYYYMMDD_HHMMSS.sql.gz"
gunzip < "$BACKUP_FILE" | \
  docker exec -i aeroassist_postgres pg_restore \
    -U aeroassist \
    -d aeroassist_db \
    --clean --if-exists --verbose

# 4. Appliquer les migrations éventuelles
docker compose -f docker-compose.prod.yml up -d backend
sleep 15
docker exec aeroassist_backend npx prisma migrate deploy

# 5. Vérifier
curl -sf https://aeroassist.fr/api/health | jq .
docker exec aeroassist_postgres psql -U aeroassist -d aeroassist_db -c \
  "SELECT 'users' as tbl, count(*) FROM users UNION ALL SELECT 'conversations', count(*) FROM conversations;"
```

---

## 5. Redis full / OOM

### 5.1 Symptômes

- Erreurs `OOM command not allowed when used memory > 'maxmemory'`
- Lenteurs généralisées (cache ne fonctionne plus)
- Sessions utilisateur perdues
- Alerte `HighMemoryUsage` sur le conteneur Redis

### 5.2 Diagnostic

```bash
# 1. Vérifier l'utilisation mémoire de Redis
docker exec aeroassist_redis redis-cli -a "$REDIS_PASSWORD" INFO memory | grep -E "used_memory_human|maxmemory_human|used_memory_peak_human"

# 2. Vérifier le nombre de clés
docker exec aeroassist_redis redis-cli -a "$REDIS_PASSWORD" DBSIZE

# 3. Lister les plus grosses clés
docker exec aeroassist_redis redis-cli -a "$REDIS_PASSWORD" --bigkeys

# 4. Vérifier la politique d'éviction
docker exec aeroassist_redis redis-cli -a "$REDIS_PASSWORD" CONFIG GET maxmemory-policy

# 5. Logs Redis
docker compose -f docker-compose.prod.yml logs --tail=50 redis
```

### 5.3 Actions de résolution

**Résolution 1 — Vérifier la politique d'éviction :**
```bash
# Doit retourner allkeys-lru
docker exec aeroassist_redis redis-cli -a "$REDIS_PASSWORD" CONFIG GET maxmemory-policy

# Si incorrect, corriger :
docker exec aeroassist_redis redis-cli -a "$REDIS_PASSWORD" CONFIG SET maxmemory-policy allkeys-lru
```

**Résolution 2 — Flush de la base (dernier recours) :**
```bash
# ⚠️ ATTENTION : Ceci effacera TOUT le cache et les sessions
docker exec aeroassist_redis redis-cli -a "$REDIS_PASSWORD" FLUSHDB

# Vérifier que la mémoire est libérée
docker exec aeroassist_redis redis-cli -a "$REDIS_PASSWORD" INFO memory | grep used_memory_human
```

**Résolution 3 — Restart Redis :**
```bash
docker compose -f docker-compose.prod.yml restart redis
sleep 5
docker exec aeroassist_redis redis-cli -a "$REDIS_PASSWORD" ping
```

**Résolution 4 — Augmenter la limite mémoire :**
```bash
# Modifier docker-compose.prod.yml : redis → command → --maxmemory 512mb
# Puis :
docker compose -f docker-compose.prod.yml up -d redis
```

---

## 6. Stripe webhook en échec

### 6.1 Symptômes

- Paiements effectués mais non enregistrés dans la base
- Alerte Prometheus `StripeWebhookFailure`
- Clients se plaignent de paiements non validés
- Stripe Dashboard montre des webhooks échoués (rouge)

### 6.2 Diagnostic

```bash
# 1. Vérifier les logs Stripe récents
docker compose -f docker-compose.prod.yml logs --since=1h backend | grep -i "stripe\|webhook\|payment"

# 2. Vérifier le compteur d'erreurs webhook
curl -sf https://aeroassist.fr/api/metrics | grep stripe_webhook_errors_total

# 3. Vérifier la configuration Stripe
docker compose -f docker-compose.prod.yml exec backend printenv STRIPE_WEBHOOK_SECRET | head -c 20
echo "..."

# 4. Tester le endpoint webhook
curl -v -X POST https://aeroassist.fr/api/stripe/webhook \
  -H "Stripe-Signature: t=$(date +%s),v1=invalid_signature" \
  -H "Content-Type: application/json" \
  -d '{"type":"test"}'
```

### 6.3 Actions de résolution

**Résolution 1 — Vérifier le webhook secret :**
```bash
# Comparer le secret dans .env avec Stripe Dashboard
# Stripe Dashboard → Developers → Webhooks → [votre endpoint] → Signing secret
grep STRIPE_WEBHOOK_SECRET .env
```

**Résolution 2 — Rejouer les webhooks échoués depuis Stripe :**
1. Aller sur [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Cliquer sur le webhook échoué
3. Cliquer sur "Send test webhook" ou "Replay failed events"

**Résolution 3 — Vérifier la connectivité :**
```bash
# Vérifier que le endpoint est joignable depuis l'extérieur
curl -v https://aeroassist.fr/api/stripe/webhook

# Vérifier les rate limits Nginx
docker compose -f docker-compose.prod.yml logs nginx --since=30m | grep -i "429\|limit_req"
```

**Résolution 4 — Restart backend :**
```bash
docker compose -f docker-compose.prod.yml restart backend
sleep 30
curl -sf https://aeroassist.fr/api/health | jq .
```

---

## 7. WhatsApp API timeout

### 7.1 Symptômes

- Les utilisateurs ne reçoivent pas de réponses
- Messages envoyés mais pas délivrés
- Alerte `WhatsAppDeliveryFailure`
- Logs montrent des erreurs `ETIMEDOUT` ou `ECONNREFUSED` vers Meta API

### 7.2 Diagnostic

```bash
# 1. Vérifier le statut de l'API Meta
open https://developers.facebook.com/status/

# 2. Vérifier les logs WhatsApp récents
docker compose -f docker-compose.prod.yml logs --since=30m backend | grep -i "whatsapp\|meta\|graph.facebook"

# 3. Vérifier le token d'accès
curl -sf "https://graph.facebook.com/${WHATSAPP_API_VERSION}/${META_WHATSAPP_PHONE_NUMBER_ID}" \
  -H "Authorization: Bearer ${META_WHATSAPP_ACCESS_TOKEN}" | jq .

# 4. Vérifier les rate limits
docker compose -f docker-compose.prod.yml logs --since=1h backend | grep -i "rate.limit\|429\|throttle"

# 5. Compter les échecs d'envoi
curl -sf https://aeroassist.fr/api/metrics | grep whatsapp_send_failures_total
```

### 7.3 Actions de résolution

**Résolution 1 — Vérifier le statut Meta :**
- Ouvrir https://developers.facebook.com/status/
- Si incident Meta en cours : attendre la résolution, communiquer sur `#incidents-aeroassist`

**Résolution 2 — Vérifier le token d'accès :**
```bash
# Le token a peut-être expiré ou été révoqué
# Vérifier dans Meta Developer Portal → WhatsApp API → Tokens
# Si expiré, générer un nouveau token et mettre à jour .env
```

**Résolution 3 — Vérifier les rate limits Meta :**
- WhatsApp Business API : 80 messages/seconde par numéro
- Si limite atteinte : implémenter un backoff dans l'envoi
- Vérifier les logs pour les erreurs 429

**Résolution 4 — Fallback et restart :**
```bash
docker compose -f docker-compose.prod.yml restart backend
sleep 30

# Envoyer un message test via WhatsApp
# Vérifier la réception dans les logs
docker compose -f docker-compose.prod.yml logs --tail=20 backend | grep -i "message_sent\|delivered"
```

**Résolution 5 — Message de maintenance aux utilisateurs :**
Si l'incident dure > 15 min, configurer un message automatique de maintenance via Meta Business Suite.

---

## 8. Nginx 502 / 503

### 8.1 Symptômes

- Page d'erreur Nginx "502 Bad Gateway" ou "503 Service Unavailable"
- Tous les endpoints retournent 502/503
- Le site est inaccessible

### 8.2 Diagnostic

```bash
# 1. Vérifier le statut de Nginx
docker compose -f docker-compose.prod.yml ps nginx

# 2. Vérifier le statut du backend
docker compose -f docker-compose.prod.yml ps backend

# 3. Health check direct du backend
docker exec aeroassist_nginx wget -qO- http://backend:3000/api/health | head -5

# 4. Vérifier les logs Nginx
docker compose -f docker-compose.prod.yml logs --tail=50 nginx

# 5. Vérifier les erreurs Nginx
docker exec aeroassist_nginx cat /var/log/nginx/error.log | tail -20

# 6. Vérifier la configuration Nginx
docker exec aeroassist_nginx nginx -t
```

### 8.3 Actions de résolution

**Résolution 1 — Restart Nginx :**
```bash
docker compose -f docker-compose.prod.yml restart nginx
sleep 5
curl -sI https://aeroassist.fr | head -5
```

**Résolution 2 — Restart backend (si 502) :**
```bash
docker compose -f docker-compose.prod.yml restart backend
sleep 30
curl -sf https://aeroassist.fr/api/health | jq .
```

**Résolution 3 — Vérifier la configuration SSL :**
```bash
# Vérifier que les certificats existent
docker exec aeroassist_nginx ls -la /etc/letsencrypt/live/aeroassist.fr/

# Tester le certificat
echo | openssl s_client -connect aeroassist.fr:443 2>/dev/null | openssl x509 -noout -dates
```

**Résolution 4 — Restart complet :**
```bash
docker compose -f docker-compose.prod.yml restart nginx backend
sleep 15
curl -sf https://aeroassist.fr/api/health | jq .
```

---

## 9. SSL expiré

### 9.1 Symptômes

- Navigateurs affichent "Votre connexion n'est pas sécurisée"
- Erreurs `SSL_ERROR_EXPIRED_CERT_KEY` ou `CERT_HAS_EXPIRED`
- Let's Encrypt alerts (si configurées)

### 9.2 Diagnostic

```bash
# 1. Vérifier la date d'expiration du certificat
echo | openssl s_client -connect aeroassist.fr:443 -servername aeroassist.fr 2>/dev/null | \
  openssl x509 -noout -dates

# 2. Vérifier les fichiers de certificat
docker exec aeroassist_nginx ls -la /etc/letsencrypt/live/aeroassist.fr/

# 3. Vérifier le log du certbot
docker compose -f docker-compose.prod.yml logs --tail=50 certbot
```

### 9.3 Actions de résolution

**Résolution 1 — Renouvellement manuel :**
```bash
# Arrêter temporairement Nginx
docker compose -f docker-compose.prod.yml stop nginx

# Renouveler le certificat
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  -d aeroassist.fr \
  -d www.aeroassist.fr \
  --force-renewal

# Redémarrer Nginx
docker compose -f docker-compose.prod.yml start nginx

# Vérifier
echo | openssl s_client -connect aeroassist.fr:443 2>/dev/null | openssl x509 -noout -dates
```

**Résolution 2 — Mode standalone (si webroot échoue) :**
```bash
# Arrêter Nginx pour libérer le port 80
docker compose -f docker-compose.prod.yml stop nginx

# Obtenir un nouveau certificat via standalone
docker compose -f docker-compose.prod.yml run --rm -p 80:80 certbot certonly \
  --standalone \
  -d aeroassist.fr \
  -d www.aeroassist.fr

# Relancer Nginx
docker compose -f docker-compose.prod.yml up -d nginx
```

**Résolution 3 — Vérifier le renouvellement automatique :**
```bash
# Tester le renouvellement (dry run)
docker compose -f docker-compose.prod.yml exec certbot certbot renew --dry-run

# Si échec, vérifier le port 80 est accessible depuis le conteneur
docker compose -f docker-compose.prod.yml exec certbot curl -sf http://aeroassist.fr/.well-known/acme-challenge/test
```

---

## 10. Memory leak

### 10.1 Symptômes

- Le conteneur backend utilise de plus en plus de RAM au fil du temps
- L'application ralentit progressivement
- OOM Kills dans les logs Docker
- Alerte Prometheus `HighMemoryUsage`

### 10.2 Diagnostic

```bash
# 1. Suivre l'utilisation mémoire en temps réel
docker stats aeroassist_backend --no-stream

# 2. Historique mémoire (via Grafana)
# → Grafana → Dashboard AeroAssist → Panneau "Mémoire RSS"

# 3. Vérifier le heap Node.js
docker exec aeroassist_backend node -e "console.log(JSON.stringify(process.memoryUsage(), null, 2))"

# 4. Vérifier les OOM kills
dmesg | grep -i "oom\|killed" | tail -10

# 5. Compter les connexions WebSocket ouvertes
docker exec aeroassist_backend node -e "
  // Si expose un endpoint de debug
  console.log('Vérifier les connexions actives via /api/health');
"

# 6. Vérifier les logs pour les patterns de leak
docker compose -f docker-compose.prod.yml logs --since=1h backend | grep -i "memory\|heap\|GC\|allocation"
```

### 10.3 Actions de résolution

**Résolution 1 — Restart du conteneur (immédiat) :**
```bash
docker compose -f docker-compose.prod.yml restart backend
docker stats aeroassist_backend --no-stream
```

**Résolution 2 — Capturer un heap snapshot :**
```bash
# Si le module heapdump est disponible
docker exec aeroassist_backend node -e "
  const heapdump = require('heapdump');
  heapdump.writeSnapshot('/app/logs/heapdump-' + Date.now() + '.heapsnapshot', (err, filename) => {
    console.log('Heap snapshot:', filename);
  });
"

# Copier le snapshot hors du conteneur
docker cp aeroassist_backend:/app/logs/heapdump-*.heapsnapshot /tmp/
```

**Résolution 3 — Analyser les sources potentielles :**

| Source possible | Vérification |
|----------------|-------------|
| Sessions Redis non nettoyées | `DBSIZE` dans Redis |
| Embeddings en cache mémoire | Logs `embedding\|vector` |
| Connexions WebSocket non fermées | Compter les sockets actives |
| File d'attente de messages | Vérifier la file de processing |
| Prisma connection pool | Vérifier `DATABASE_URL` pool settings |

**Résolution 4 — Augmenter la limite mémoire :**
```bash
# Modifier docker-compose.prod.yml : backend → deploy → resources → limits → memory: 4G
# Puis :
docker compose -f docker-compose.prod.yml up -d backend
```

---

## 11. Procédure de rollback

### 11.1 Rollback applicatif (code)

```bash
cd /opt/aeroassist

# 1. Identifier la version actuelle et la cible
git log --oneline -10

# 2. Sauvegarder la base AVANT le rollback
./scripts/backup-db.sh /opt/aeroassist/backups

# 3. Revenir au commit précédent
git checkout <COMMIT_HASH_STABLE>

# 4. Rebuild l'image
docker compose -f docker-compose.prod.yml build --no-cache backend

# 5. Redémarrer le backend
docker compose -f docker-compose.prod.yml up -d backend

# 6. Appliquer les migrations (si nécessaire)
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate status

# 7. Vérifier le health check
sleep 30
curl -sf https://aeroassist.fr/api/health | jq .

# 8. Surveiller les logs pendant 10 minutes
docker compose -f docker-compose.prod.yml logs --tail=50 -f backend
```

### 11.2 Rollback avec Docker images

```bash
# 1. Lister les images disponibles
docker images | grep aeroassist

# 2. Identifier l'image précédente fonctionnelle
docker images --format "{{.Repository}}:{{.Tag}} {{.CreatedAt}}" | grep aeroassist

# 3. Si l'image de rollback existe
docker tag aeroassist_backend:rollback-<DATE> aeroassist_backend:latest
docker compose -f docker-compose.prod.yml up -d backend

# 4. Vérifier
sleep 30
curl -sf https://aeroassist.fr/api/health | jq .
```

### 11.3 Rollback complet (données + application)

```bash
# 1. Arrêter tous les services
docker compose -f docker-compose.prod.yml stop

# 2. Restaurer la base de données depuis la sauvegarde pré-update
BACKUP_FILE="/opt/aeroassist/backups/aeroassist_backup_PRE_UPDATE.sql.gz"
gunzip < "$BACKUP_FILE" | \
  docker exec -i aeroassist_postgres pg_restore \
    -U aeroassist -d aeroassist_db \
    --clean --if-exists --verbose

# 3. Revenir au code précédent
git checkout <COMMIT_HASH_STABLE>
docker compose -f docker-compose.prod.yml build --no-cache backend

# 4. Redémarrer tout
docker compose -f docker-compose.prod.yml up -d

# 5. Vérification complète
sleep 30
curl -sf https://aeroassist.fr/api/health | jq .
docker exec aeroassist_postgres pg_isready -U aeroassist -d aeroassist_db
docker exec aeroassist_redis redis-cli -a "$REDIS_PASSWORD" ping
```

---

## 12. Template de post-mortem

### 12.1 Template

```markdown
# Post-Mortem d'Incident AeroAssist

## Informations générales

| Champ | Valeur |
|-------|--------|
| **Titre** | [Titre court de l'incident] |
| **Date de l'incident** | YYYY-MM-DD |
| **Sévérité** | P1 / P2 / P3 / P4 |
| **Durée totale** | X heures Y minutes |
| **Détecté par** | [Alerte / Utilisateur / Monitoring / autre] |
| **Auteur du post-mortem** | [Nom] |

## Résumé exécutif

[2-3 phrases décrivant l'incident, son impact et la résolution.]

## Chronologie

| Heure (UTC) | Événement |
|-------------|-----------|
| HH:MM | Début de l'incident (premier signe) |
| HH:MM | Alerte déclenchée / Détection |
| HH:MM | Investigation débutée par [Nom] |
| HH:MM | Cause racine identifiée |
| HH:MM | Action de correction appliquée |
| HH:MM | Service restauré |
| HH:MM | Incident résolu / Clôturé |

## Impact

- **Utilisateurs impactés :** [Nombre ou estimation]
- **Durée d'indisponibilité :** [Durée]
- **Données perdues :** [Oui/Non — détails si oui]
- **Revenu impacté :** [Estimation si applicable]
- **Fonctionnalités impactées :** [Liste]

## Cause racine

### Description
[Description détaillée de la cause racine.]

### Facteurs contributeurs
1. [Facteur 1]
2. [Facteur 2]
3. [Facteur 3]

### Diagramme de cause à effet (5 Whys)
1. Pourquoi [incident] ? → [Raison 1]
2. Pourquoi [Raison 1] ? → [Raison 2]
3. Pourquoi [Raison 2] ? → [Raison 3]
4. Pourquoi [Raison 3] ? → [Raison 4]
5. Pourquoi [Raison 4] ? → [Cause racine]

## Actions de résolution

### Immédiates (pendant l'incident)
1. [Action 1]
2. [Action 2]

### Correctives (après l'incident)
1. [Action corrective 1] — Assigné à : [Nom] — Échéance : [Date]
2. [Action corrective 2] — Assigné à : [Nom] — Échéance : [Date]

## Actions préventives

| # | Action | Assigné à | Échéance | Statut |
|---|--------|-----------|----------|--------|
| 1 | [Action préventive 1] | [Nom] | [Date] | À faire |
| 2 | [Action préventive 2] | [Nom] | [Date] | À faire |
| 3 | [Action préventive 3] | [Nom] | [Date] | À faire |

## Leçons apprises

1. [Leçon 1]
2. [Leçon 2]
3. [Leçon 3]

## Signatures

- **Rédigé par :** [Nom], [Date]
- **Validé par :** [Responsable], [Date]
```

### 12.2 Règles de post-mortem

- **Blameless** : L'objectif est d'améliorer le système, pas de blâmer des individus
- **Délai** : Le post-mortem doit être rédigé dans les **48 heures** suivant la résolution
- **Partage** : Publier dans `#post-mortems-aeroassist` sur Slack
- **Suivi** : Les actions préventives doivent être tracées dans le backlog technique

---

*Ce runbook est un document vivant. Le mettre à jour après chaque incident avec les leçons apprises et de nouvelles procédures de résolution.*
