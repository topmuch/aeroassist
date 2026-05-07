# AeroAssist — Guide de Déploiement en Production

> **Version:** 1.0.0  
> **Dernière mise à jour:** Juin 2025  
> **Classification:** Interne — Équipe Opérations & DevOps

---

## Table des matières

1. [Prérequis](#1-prérequis)
2. [Configuration de l'environnement (.env)](#2-configuration-de-lenvironnement-env)
3. [Build et démarrage](#3-build-et-démarrage)
4. [Initialisation SSL (Let's Encrypt)](#4-initialisation-ssl-lets-encrypt)
5. [Seed de la base de données](#5-seed-de-la-base-de-données)
6. [Configuration WhatsApp Meta](#6-configuration-whatsapp-meta)
7. [Configuration Stripe](#7-configuration-stripe)
8. [Monitoring (Grafana + Prometheus)](#8-monitoring-grafana--prometheus)
9. [Sauvegarde automatisée (cron)](#9-sauvegarde-automatisée-cron)
10. [Mise à jour de l'application](#10-mise-à-jour-de-lapplication)
11. [Procédure de Rollback](#11-procédure-de-rollback)
12. [Checklist pré-production](#12-checklist-pré-production)

---

## 1. Prérequis

### 1.1 Infrastructure serveur

| Composant | Version minimum | Requis |
|-----------|----------------|--------|
| Docker Engine | 24.0+ | Oui |
| Docker Compose | 2.20+ (plugin) | Oui |
| curl | 7.x | Oui |
| git | 2.x | Oui |
| Espace disque | 20 Go (recommandé) | Oui |
| RAM serveur | 4 Go minimum, 8 Go recommandé | Oui |
| vCPU | 2 minimum, 4 recommandé | Oui |

### 1.2 Installation de Docker

```bash
# Sur Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
# Reconnexion nécessaire pour prendre effet

# Vérifier l'installation
docker --version
docker compose version
```

### 1.3 Nom de domaine et DNS

- Un nom de domaine enregistré (ex: `aeroassist.fr`)
- Enregistrement DNS A pointant vers l'IP du serveur :
  ```
  aeroassist.fr       IN  A   <IP_DU_SERVEUR>
  www.aeroassist.fr   IN  A   <IP_DU_SERVEUR>
  ```
- Temps de propagation DNS : 5 min à 48 h

### 1.4 Ports réseau ouverts

| Port | Protocole | Service |
|------|-----------|---------|
| 80 | TCP | HTTP (redirect → HTTPS) |
| 443 | TCP | HTTPS (Nginx TLS) |
| 3002 | TCP | Grafana (monitoring, optionnel) |
| 9090 | TCP | Prometheus (monitoring, optionnel) |

> **Sécurité :** Ne jamais exposer les ports 3000, 5432, 6379 sur Internet.

---

## 2. Configuration de l'environnement (.env)

### 2.1 Création du fichier .env

```bash
cd /opt/aeroassist  # ou votre répertoire de déploiement
cp .env.example .env
chmod 600 .env      # Lecture/écriture propriétaire uniquement
```

### 2.2 Variables obligatoires

```bash
# ── Application ──────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://aeroassist.fr
ADMIN_API_KEY=<clé_aléatoire_64_caractères>   # openssl rand -hex 32

# ── Base de données PostgreSQL ───────────────────────────────────
POSTGRES_DB=aeroassist_db
POSTGRES_USER=aeroassist
POSTGRES_PASSWORD=<mot_de_passe_fort_postgres>  # openssl rand -hex 24

# ── Redis ────────────────────────────────────────────────────────
REDIS_PASSWORD=<mot_de_passe_fort_redis>        # openssl rand -hex 24

# ── Sécurité ─────────────────────────────────────────────────────
JWT_SECRET=<secret_jwt_64_caractères>           # openssl rand -hex 32
ENCRYPTION_KEY=<clé_encryption_32_caractères>   # openssl rand -hex 16

# ── WhatsApp Meta API ────────────────────────────────────────────
META_WEBHOOK_VERIFY_TOKEN=<token_de_vérification_webhook>
META_WHATSAPP_ACCESS_TOKEN=<token_daccès_meta_api>
META_WHATSAPP_PHONE_NUMBER_ID=<id_du_numéro_whatsapp>
WHATSAPP_API_VERSION=v21.0

# ── Stripe Paiements ────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_live_<votre_clé_secrète_stripe>
STRIPE_WEBHOOK_SECRET=whsec_<votre_secret_webhook>
STRIPE_SUCCESS_URL=https://aeroassist.fr/success
STRIPE_CANCEL_URL=https://aeroassist.fr/cancel
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_<votre_clé_publique>

# ── IA / LLM (Groq) ─────────────────────────────────────────────
GROQ_API_KEY=<votre_clé_api_groq>
GROQ_MODEL=llama-3.3-70b-versatile

# ── Logging ─────────────────────────────────────────────────────
LOG_LEVEL=info
```

### 2.3 Génération des secrets

```bash
# Générer tous les secrets nécessaires
echo "ADMIN_API_KEY=$(openssl rand -hex 32)"
echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)"
echo "REDIS_PASSWORD=$(openssl rand -hex 24)"
echo "JWT_SECRET=$(openssl rand -hex 32)"
echo "ENCRYPTION_KEY=$(openssl rand -hex 16)"
echo "META_WEBHOOK_VERIFY_TOKEN=$(openssl rand -hex 16)"
```

### 2.4 Variables optionnelles

```bash
# CORS (par défaut : le domaine de l'app)
CORS_ORIGINS=https://aeroassist.fr,https://www.aeroassist.fr

# Groq configuration avancée
GROQ_MAX_RETRIES=3
GROQ_TIMEOUT_MS=15000

# Version API WhatsApp
WHATSAPP_API_VERSION=v21.0
```

---

## 3. Build et démarrage

### 3.1 Cloner le dépôt

```bash
git clone git@github.com:aeroassist/aeroassist.git /opt/aeroassist
cd /opt/aeroassist
git checkout production   # ou la branche cible
```

### 3.2 Build des images Docker

```bash
# Build de l'image backend (multi-stage)
docker compose -f docker-compose.prod.yml build backend

# Suivi de la progression
docker compose -f docker-compose.prod.yml build --progress=plain backend
```

### 3.3 Démarrage des services

```bash
# Démarrage complet (base de données + cache + backend + nginx + certbot)
docker compose -f docker-compose.prod.yml up -d

# Vérifier que tous les conteneurs sont up
docker compose -f docker-compose.prod.yml ps
```

### 3.4 Vérification de l'état de santé

```bash
# Health check de l'application
curl -sf https://aeroassist.fr/api/health | jq .

# Attendu :
# {
#   "status": "UP",
#   "timestamp": "2025-06-...",
#   "uptime": ...,
#   "services": { ... }
# }

# Vérifier le statut de chaque service
docker compose -f docker-compose.prod.yml logs --tail=20 postgres
docker compose -f docker-compose.prod.yml logs --tail=20 redis
docker compose -f docker-compose.prod.yml logs --tail=20 backend
docker compose -f docker-compose.prod.yml logs --tail=20 nginx
```

### 3.5 Démarrage du monitoring (optionnel mais recommandé)

```bash
# Démarrer la stack de monitoring
docker compose -f docker-compose.monitoring.yml up -d

# Vérifier Prometheus scrape l'application
curl -sf http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'
```

---

## 4. Initialisation SSL (Let's Encrypt)

### 4.1 Première obtention du certificat

```bash
# Obtenir le certificat initial (mode standalone)
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  -d aeroassist.fr \
  -d www.aeroassist.fr \
  --email admin@aeroassist.fr \
  --agree-tos \
  --no-eff-email

# Le certificat est stocké dans le volume nginx-certs
# Chemin dans le conteneur : /etc/letsencrypt/live/aeroassist.fr/
```

### 4.2 Vérification du certificat

```bash
# Vérifier que les fichiers de certificat existent
docker compose -f docker-compose.prod.yml exec nginx ls -la /etc/letsencrypt/live/aeroassist.fr/

# Tester la connexion HTTPS
curl -vI https://aeroassist.fr 2>&1 | head -20
```

### 4.3 Renouvellement automatique

Le conteneur `certbot` est configuré pour tenter un renouvellement toutes les 12 heures. Le renouvellement n'a lieu que si le certificat expire dans moins de 30 jours.

Pour un renouvellement manuel :

```bash
docker compose -f docker-compose.prod.yml exec certbot certbot renew
docker compose -f docker-compose.prod.yml restart nginx
```

### 4.4 Cron de renouvellement (redondance)

```bash
# Ajouter au crontab système (en plus du conteneur)
echo "0 3 * * * docker compose -f /opt/aeroassist/docker-compose.prod.yml exec -T certbot certbot renew --quiet && docker compose -f /opt/aeroassist/docker-compose.prod.yml restart nginx" | sudo tee -a /etc/cron.d/aeroassist-certbot
```

---

## 5. Seed de la base de données

### 5.1 Exécuter les migrations Prisma

```bash
# Appliquer les migrations au schéma de production
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Vérifier l'état des migrations
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate status
```

### 5.2 Peuplement initial des données

```bash
# Seed des données de base (templates, config, etc.)
curl -X POST https://aeroassist.fr/api/seed \
  -H "Authorization: Bearer ${ADMIN_API_KEY}" \
  -H "Content-Type: application/json"
```

### 5.3 Vérification des données

```bash
# Compter les entrées dans chaque table
docker compose -f docker-compose.prod.yml exec postgres psql -U aeroassist -d aeroassist_db -c \
  "SELECT 'users' as tbl, count(*) FROM \"User\"
   UNION ALL SELECT 'conversations', count(*) FROM \"Conversation\"
   UNION ALL SELECT 'messages', count(*) FROM \"Message\"
   UNION ALL SELECT 'flights', count(*) FROM \"Flight\"
   UNION ALL SELECT 'reservations', count(*) FROM \"Reservation\"
   UNION ALL SELECT 'knowledge_base_entries', count(*) FROM \"KnowledgeBaseEntry\";"
```

---

## 6. Configuration WhatsApp Meta

> **Référence complète :** Voir `docs/META_PRODUCTION_SETUP.md`

### 6.1 Étapes rapides

1. **Meta Developer Portal** → Créer une app WhatsApp Business
2. **Configurer le Webhook** :
   - URL : `https://aeroassist.fr/api/webhook/whatsapp`
   - Verify Token : `META_WEBHOOK_VERIFY_TOKEN` (de votre `.env`)
   - Abonnements : `messages`
3. **Numéro de téléphone** : Configurer le WhatsApp Phone Number ID
4. **Templates** : Créer et soumettre les templates dans Meta Manager

### 6.2 Vérification du webhook

```bash
# Tester la vérification du webhook
curl -v "https://aeroassist.fr/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=${META_WEBHOOK_VERIFY_TOKEN}&hub.challenge=test_challenge_123"
```

---

## 7. Configuration Stripe

> **Référence complète :** Voir `docs/STRIPE_PRODUCTION_CHECKLIST.md`

### 7.1 Étapes rapides

1. **Stripe Dashboard** → Basculer en mode Live
2. **Configurer le webhook** :
   - URL : `https://aeroassist.fr/api/stripe/webhook`
   - Événements : `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.*`
3. **Copier le Signing Secret** → Configurer `STRIPE_WEBHOOK_SECRET`
4. **Configurer les prix et plans** dans Stripe Dashboard

### 7.2 Test du webhook Stripe

```bash
# Vérifier que le endpoint répond (avec signature invalide → erreur attendue)
curl -X POST https://aeroassist.fr/api/stripe/webhook \
  -H "Stripe-Signature: t=1234,v1=test" \
  -d '{}'
```

---

## 8. Monitoring (Grafana + Prometheus)

### 8.1 Démarrage

```bash
docker compose -f docker-compose.monitoring.yml up -d
```

### 8.2 Accès aux outils de monitoring

| Outil | URL | Identifiants | Usage |
|-------|-----|-------------|-------|
| **Grafana** | `https://aeroassist.fr:3002` | `admin` / `aeroassist_grafana_2024` | Dashboards visuels |
| **Prometheus** | `http://localhost:9090` | Aucun (local uniquement) | Requêtes PromQL |
| **AlertManager** | `http://localhost:9093` | Aucun (local uniquement) | Gestion des alertes |
| **Node Exporter** | `http://localhost:9100` | Aucun | Métriques système |

### 8.3 Dashboard Grafana

Le dashboard **AeroAssist — Tableau de Bord Production** est provisionné automatiquement avec :

- **Vue d'ensemble Système** : CPU, Mémoire RSS, Uptime, Statut instance
- **Métriques HTTP** : Taux de requêtes, Taux d'erreur, Latence P50/P95/P99
- **Statistiques Application** : Conversations, Messages, Réservations, Contacts
- **Facturation** : Total réservations, Erreurs webhook Stripe

### 8.4 Alertes configurées

| Alerte | Sévérité | Seuil | Notification |
|--------|----------|-------|-------------|
| Instance Down | Critical | `up == 0` pendant 1 min | PagerDuty + Email + Slack |
| High Error Rate | Critical | 5xx > 5% pendant 5 min | PagerDuty + Email + Slack |
| P95 Latency | Warning | > 2s pendant 5 min | Email + Slack |
| High Memory | Warning | > 80% pendant 5 min | Email + Slack |
| Disk Space | Warning | < 20% libre | Email + Slack |
| Stripe Webhook Failure | Critical | > 3 erreurs / 5 min | PagerDuty + Email + Slack |
| WhatsApp Delivery Failure | Critical | > 5 échecs / 5 min | PagerDuty + Email + Slack |

---

## 9. Sauvegarde automatisée (cron)

### 9.1 Configuration du cron

```bash
# Éditer le crontab
sudo crontab -e

# Ajouter la ligne suivante (sauvegarde quotidienne à 02:00 UTC)
0 2 * * * /opt/aeroassist/scripts/backup-db.sh /opt/aeroassist/backups >> /opt/aeroassist/backups/backup.log 2>&1

# Créer le répertoire de sauvegarde
mkdir -p /opt/aeroassist/backups
```

### 9.2 Test manuel de la sauvegarde

```bash
# Exécuter une sauvegarde manuelle
./scripts/backup-db.sh /opt/aeroassist/backups

# Vérifier le fichier créé
ls -lh /opt/aeroassist/backups/
```

### 9.3 Restauration depuis une sauvegarde

```bash
# 1. Identifier la sauvegarde à restaurer
ls -lh /opt/aeroassist/backups/

# 2. Arrêter le backend
docker compose -f docker-compose.prod.yml stop backend

# 3. Restaurer la base de données
gunzip < /opt/aeroassist/backups/aeroassist_backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i aeroassist_postgres pg_restore \
    -U aeroassist \
    -d aeroassist_db \
    --clean --if-exists --verbose

# 4. Redémarrer le backend
docker compose -f docker-compose.prod.yml up -d backend

# 5. Vérifier
curl -sf https://aeroassist.fr/api/health | jq .
```

---

## 10. Mise à jour de l'application

### 10.1 Procédure standard

```bash
cd /opt/aeroassist

# 1. Sauvegarder la base de données AVANT la mise à jour
./scripts/backup-db.sh /opt/aeroassist/backups

# 2. Récupérer la dernière version
git fetch origin production
git pull origin production

# 3. Mettre à jour les dépendances (si nécessaire)
docker compose -f docker-compose.prod.yml build --pull --no-cache backend

# 4. Redémarrer les services
docker compose -f docker-compose.prod.yml up -d backend

# 5. Appliquer les migrations de base de données
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# 6. Vérifier le health check
sleep 30
curl -sf https://aeroassist.fr/api/health | jq .

# 7. Vérifier les logs pour toute erreur
docker compose -f docker-compose.prod.yml logs --tail=50 backend
```

### 10.2 Mise à jour sans interruption (blue-green)

```bash
# 1. Build de la nouvelle image
docker compose -f docker-compose.prod.yml build backend

# 2. Taguer l'image actuelle pour rollback
docker tag aeroassist_backend:latest aeroassist_backend:rollback-$(date +%Y%m%d-%H%M%S)

# 3. Redémarrer avec la nouvelle image
docker compose -f docker-compose.prod.yml up -d --no-deps backend

# 4. Vérifier le health check avant de continuer
sleep 30
curl -sf https://aeroassist.fr/api/health | jq '.status'
```

---

## 11. Procédure de Rollback

### 11.1 Rollback rapide (version précédente)

```bash
# 1. Identifier l'image de rollback
docker images | grep aeroassist_backend

# 2. Revenir au commit précédent
git log --oneline -5
git checkout <commit_hash_ou_tag>

# 3. Rebuild et restart
docker compose -f docker-compose.prod.yml build --no-cache backend
docker compose -f docker-compose.prod.yml up -d backend

# 4. Restaurer la base de données (si le schéma a changé)
docker compose -f docker-compose.prod.yml stop backend
gunzip < /opt/aeroassist/backups/aeroassist_backup_PRE_UPDATE.sql.gz | \
  docker exec -i aeroassist_postgres pg_restore \
    -U aeroassist -d aeroassist_db --clean --if-exists
docker compose -f docker-compose.prod.yml up -d backend
```

### 11.2 Rollback complet (database + application)

```bash
# Voir docs/RUNBOOK-INCIDENT.md pour la procédure complète
```

---

## 12. Checklist pré-production

### 12.1 Checklist complète (15 items)

| # | Item | Statut | Notes |
|---|------|--------|-------|
| 1 | `POSTGRES_PASSWORD` est un mot de passe fort (≥24 chars) | ☐ | |
| 2 | `REDIS_PASSWORD` est un mot de passe fort (≥24 chars) | ☐ | |
| 3 | `ADMIN_API_KEY` est une clé aléatoire (≥64 chars) | ☐ | |
| 4 | `JWT_SECRET` est un secret aléatoire (≥64 chars) | ☐ | |
| 5 | `STRIPE_SECRET_KEY` utilise la clé **live** (pas test) | ☐ | |
| 6 | `META_WHATSAPP_ACCESS_TOKEN` est configuré avec le token live | ☐ | |
| 7 | Le certificat SSL est actif et valide (>60 jours) | ☐ | `openssl s_client -connect aeroassist.fr:443` |
| 8 | Le redirect HTTP → HTTPS fonctionne (301) | ☐ | `curl -I http://aeroassist.fr` |
| 9 | Le health check `/api/health` retourne `UP` | ☐ | `curl -sf https://aeroassist.fr/api/health` |
| 10 | Le webhook WhatsApp reçoit les événements Meta | ☐ | Envoyer un message test |
| 11 | Le webhook Stripe reçoit les événements de paiement | ☐ | Créer un paiement test |
| 12 | La sauvegarde automatique (cron) est configurée | ☐ | `crontab -l` |
| 13 | Grafana et Prometheus sont opérationnels | ☐ | `http://ip:3002` et `http://ip:9090` |
| 14 | Les alertes Slack/Email sont configurées et testées | ☐ | Vérifier `alertmanager.yml` |
| 15 | Les ports sensibles (3000, 5432, 6379) sont **non exposés** sur Internet | ☐ | `nmap -p 3000,5432,6379 <IP>` |

### 12.2 Commande de vérification complète

```bash
#!/bin/bash
echo "=== AeroAssist — Vérification Pré-Production ==="
echo ""

echo "[1/7] DNS..."
dig +short aeroassist.fr

echo "[2/7] SSL..."
echo | openssl s_client -connect aeroassist.fr:443 2>/dev/null | openssl x509 -noout -dates

echo "[3/7] HTTP → HTTPS redirect..."
curl -sI http://aeroassist.fr 2>/dev/null | head -5

echo "[4/7] Health check..."
curl -sf https://aeroassist.fr/api/health | jq '.status'

echo "[5/7] Headers sécurité..."
curl -sI https://aeroassist.fr 2>/dev/null | grep -i "strict-transport\|x-frame\|x-content-type"

echo "[6/7] Docker containers..."
docker compose -f docker-compose.prod.yml ps --format "table {{.Name}}\t{{.Status}}"

echo "[7/7] Monitoring..."
docker compose -f docker-compose.monitoring.yml ps --format "table {{.Name}}\t{{.Status}}"

echo ""
echo "=== Vérification terminée ==="
```

---

*Document maintenu par l'équipe DevOps. Mettre à jour après chaque déploiement en production.*
