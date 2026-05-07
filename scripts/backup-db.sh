#!/usr/bin/env bash
# =============================================================================
# AeroAssist — PostgreSQL Automated Backup Script
# =============================================================================
# Usage:
#   ./scripts/backup-db.sh [backup_dir] [db_host] [db_name] [db_user]
#
# Defaults:
#   backup_dir  → /backups
#   db_host     → localhost
#   db_name     → aeroassist_db
#   db_user     → aeroassist
#
# Cron example (daily at 02:00 UTC):
#   0 2 * * * /path/to/scripts/backup-db.sh >> /var/log/backup-db.log 2>&1
#
# Requires:
#   - pg_dump (PostgreSQL client tools)
#   - gzip
#   - docker (if backing up from a Docker container)
# =============================================================================

set -euo pipefail

# ── Configuration (defaults) ────────────────────────────────────────────
BACKUP_DIR="${1:-/backups}"
DB_HOST="${2:-localhost}"
DB_NAME="${3:-aeroassist_db}"
DB_USER="${4:-aeroassist}"
DB_PORT="${DB_PORT:-5432}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="aeroassist_backup_${TIMESTAMP}.sql.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"
RETENTION_COUNT=7

# ── Colors for logging ──────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ── Logging Functions ───────────────────────────────────────────────────
log_info()  { echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${GREEN}[INFO]${NC}  $*"; }
log_warn()  { echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${RED}[ERROR]${NC} $*" >&2; }

# ── Pre-flight Checks ───────────────────────────────────────────────────
log_info "Démarrage de la sauvegarde PostgreSQL"

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
    log_error "pg_dump n'est pas installé. Installez PostgreSQL client tools."
    log_error "  sudo apt-get install postgresql-client  (Debian/Ubuntu)"
    log_error "  sudo yum install postgresql              (RHEL/CentOS)"
    exit 1
fi

# Check if gzip is available
if ! command -v gzip &> /dev/null; then
    log_error "gzip n'est pas installé."
    exit 1
fi

# Ensure backup directory exists
if [[ ! -d "${BACKUP_DIR}" ]]; then
    log_info "Création du répertoire de sauvegarde: ${BACKUP_DIR}"
    mkdir -p "${BACKUP_DIR}" || {
        log_error "Impossible de créer le répertoire: ${BACKUP_DIR}"
        exit 1
    }
fi

# Check directory is writable
if [[ ! -w "${BACKUP_DIR}" ]]; then
    log_error "Le répertoire ${BACKUP_DIR} n'est pas accessible en écriture."
    exit 1
fi

# ── Check if we're running inside Docker or need docker exec ───────────
USE_DOCKER=false
if command -v docker &> /dev/null && docker ps --format '{{.Names}}' | grep -q 'aeroassist_postgres'; then
    log_info "Conteneur aeroassist_postgres détecté — utilisation de docker exec"
    USE_DOCKER=true
fi

# ── Perform Backup ──────────────────────────────────────────────────────
log_info "Base de données: ${DB_NAME}@${DB_HOST}:${DB_PORT} (utilisateur: ${DB_USER})"
log_info "Fichier de sortie: ${BACKUP_PATH}"

if [[ "${USE_DOCKER}" == "true" ]]; then
    # Backup via Docker container
    log_info "Exécution de pg_dump via le conteneur Docker..."

    docker exec aeroassist_postgres pg_dump \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -h localhost \
        -p "${DB_PORT}" \
        --format=custom \
        --no-owner \
        --no-acl \
        --verbose \
        2>/dev/null | gzip > "${BACKUP_PATH}"
else
    # Backup via local pg_dump
    log_info "Exécution de pg_dump en local..."

    PGPASSWORD="${PGPASSWORD:-}" pg_dump \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        --format=custom \
        --no-owner \
        --no-acl \
        --verbose \
        2>/dev/null | gzip > "${BACKUP_PATH}"
fi

# ── Verify Backup ───────────────────────────────────────────────────────
if [[ $? -ne 0 ]]; then
    log_error "Échec de la sauvegarde PostgreSQL."
    rm -f "${BACKUP_PATH}"
    exit 1
fi

# Check backup file size
BACKUP_SIZE=$(stat -f%z "${BACKUP_PATH}" 2>/dev/null || stat -c%s "${BACKUP_PATH}" 2>/dev/null || echo "0")
BACKUP_SIZE_HUMAN=$(numfmt --to=iec --suffix=B "${BACKUP_SIZE}" 2>/dev/null || echo "${BACKUP_SIZE} bytes")

if [[ "${BACKUP_SIZE}" -lt 100 ]]; then
    log_error "Le fichier de sauvegarde est anormalement petit (${BACKUP_SIZE_HUMAN}). La sauvegarde a probablement échoué."
    rm -f "${BACKUP_PATH}"
    exit 1
fi

log_info "Sauvegarde terminée avec succès: ${BACKUP_PATH} (${BACKUP_SIZE_HUMAN})"

# ── Rotation: Keep only the N most recent backups ──────────────────────
log_info "Rotation des sauvegardes (conservation des ${RETENTION_COUNT} plus récentes)..."

BACKUP_COUNT=$(ls -1 "${BACKUP_DIR}"/aeroassist_backup_*.sql.gz 2>/dev/null | wc -l)

if [[ "${BACKUP_COUNT}" -gt "${RETENTION_COUNT}" ]]; then
    DELETED_COUNT=0
    # List backups sorted by name (oldest first), delete extras
    ls -1t "${BACKUP_DIR}"/aeroassist_backup_*.sql.gz 2>/dev/null | tail -n +$((RETENTION_COUNT + 1)) | while read -r OLD_BACKUP; do
        rm -f "${OLD_BACKUP}"
        DELETED_COUNT=$((DELETED_COUNT + 1))
        log_info "Supprimé: $(basename "${OLD_BACKUP}")"
    done
    log_info "Rotation terminée: ${DELETED_COUNT} ancienne(s) sauvegarde(s) supprimée(s)"
else
    log_info "Rotation non nécessaire (${BACKUP_COUNT}/${RETENTION_COUNT} sauvegardes)"
fi

# ── Summary ─────────────────────────────────────────────────────────────
log_info "╔══════════════════════════════════════════════════════════════╗"
log_info "║  Sauvegarde PostgreSQL AeroAssist — Résumé                  ║"
log_info "╠══════════════════════════════════════════════════════════════╣"
log_info "║  Base:     ${DB_NAME}@${DB_HOST}"
log_info "║  Fichier:  ${BACKUP_PATH}"
log_info "║  Taille:   ${BACKUP_SIZE_HUMAN}"
log_info "║  Sauvegardes conservées: $(ls -1 "${BACKUP_DIR}"/aeroassist_backup_*.sql.gz 2>/dev/null | wc -l | tr -d ' ')"
log_info "╚══════════════════════════════════════════════════════════════╝"

exit 0
