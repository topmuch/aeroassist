# Stripe Production — Checklist de Mise en Production

> AeroAssist — Guide de passage en production pour l'intégration Stripe.
> Version 1.0 | Dernière mise à jour : 2025

---

## Table des matières

1. [Prérequis](#1-prérequis)
2. [Obtenir les clés API](#2-obtenir-les-clés-api)
3. [Configurer le webhook Stripe Dashboard](#3-configurer-le-webhook-stripe-dashboard)
4. [Variables d'environnement](#4-variables-denvironnement)
5. [Tester avec Stripe CLI](#5-tester-avec-stripe-cli)
6. [Simuler un paiement réussi](#6-simuler-un-paiement-réussi)
7. [Simuler un paiement échoué](#7-simuler-un-paiement-échoué)
8. [Tester un remboursement](#8-tester-un-remboursement)
9. [Tester l'endpoint create-checkout-session](#9-tester-ledgepoint-create-checkout-session)
10. [Vérifier la génération de facture PDF](#10-vérifier-la-génération-de-facture-pdf)
11. [Checklist pré-production](#11-checklist-pré-production)
12. [Passage en production](#12-passage-en-production)
13. [Monitoring des paiements](#13-monitoring-des-paiements)

---

## 1. Prérequis

Avant de configurer Stripe en production, assurez-vous d'avoir :

- [ ] **Compte Stripe activé** — Inscrivez-vous sur [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
- [ ] **Vérification du compte business** — Renseignez les informations légales de l'entreprise :
  - Nom légal de l'entreprise
  - SIRET / numéro d'entreprise
  - Représentant légal (nom, date de naissance, adresse)
  - IBAN du compte bancaire pour les versements
- [ ] **Compte en mode "Activated"** — Stripe doit avoir validé les documents soumis
- [ ] **Domaine de production configuré** — Le domaine final (ex: `app.aeroassist.fr`) doit être prêt
- [ ] **Certificat SSL/TLS** — Stripe exige HTTPS pour toutes les communications
- [ ] **Stripe CLI installé** — Pour les tests locaux (voir section 5)

---

## 2. Obtenir les clés API

Les clés API se trouvent dans le **Stripe Dashboard** :

1. Connectez-vous à [https://dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
2. Basculer en mode **Live** (production) — ne JAMAIS utiliser les clés de test en production
3. Récupérer les deux clés :

| Clé | Variable d'environnement | Format |
|-----|------------------------|--------|
| Clé publique | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` |
| Clé secrète | `STRIPE_SECRET_KEY` | `sk_live_...` |
| Secret webhook | `STRIPE_WEBHOOK_SECRET` | `whsec_...` |

> ⚠️ **SÉCURITÉ** : Ne communiquez JAMAIS la clé secrète (`sk_live_...`) dans le code frontend. Elle ne doit être utilisée que côté serveur.

> ⚠️ **SÉCURITÉ** : Ajoutez les clés secrètes dans les secrets de votre plateforme d'hébergement (Vercel, Railway, etc.) et non dans le code source.

---

## 3. Configurer le webhook Stripe Dashboard

Les webhooks permettent à Stripe de notifier votre application des événements de paiement.

1. Aller dans **Stripe Dashboard → Developers → Webhooks**
2. Cliquer sur **Add endpoint**
3. Configurer l'URL : `https://votre-domaine.com/api/stripe/webhook`
4. Sélectionner les événements à écouter :

```
checkout.session.completed
payment_intent.succeeded
payment_intent.payment_failed
charge.refunded
invoice.paid
invoice.payment_failed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
```

5. Après la création, copier le **Signing secret** (`whsec_...`) — il sera utilisé comme `STRIPE_WEBHOOK_SECRET`

> 💡 **Note** : En développement, utilisez `stripe listen` (voir section 5) pour obtenir un webhook secret de test temporaire.

---

## 4. Variables d'environnement

Configurez ces variables dans votre environnement de production :

```bash
# ── Stripe Production Keys ──
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# ── Application (utilisé pour les URLs de retour) ──
NEXT_PUBLIC_APP_URL=https://app.aeroassist.fr
APP_URL=https://app.aeroassist.fr

# ── Admin API Key (pour sécuriser les endpoints) ──
ADMIN_API_KEY=votre_cle_admin_secrete
```

### Vérification des clés

Pour vérifier que les clés sont bien configurées :

```bash
# Test depuis le serveur — doit retourner la configuration Stripe
curl -H "Authorization: Bearer $ADMIN_API_KEY" \
  https://votre-domaine.com/api/stripe/checkout
```

La réponse doit contenir `"configured": true`.

---

## 5. Tester avec Stripe CLI

Le Stripe CLI permet de simuler des webhooks en développement.

### Installation

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Linux / WSL
sudo apt install stripe-cli

# Ou télécharger directement depuis https://stripe.com/docs/stripe-cli
```

### Authentification

```bash
stripe login
# Saisissez votre clé API de test (sk_test_...)
```

### Forward des webhooks

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Cette commande affiche le webhook secret de test (`whsec_...`) à utiliser comme `STRIPE_WEBHOOK_SECRET` en développement.

> ⚠️ N'utilisez PAS le webhook secret de test en production.

---

## 6. Simuler un paiement réussi

```bash
# Déclencher un événement payment_intent.succeeded
stripe trigger payment_intent.succeeded
```

**Vérifications attendues :**

- [ ] Le log du serveur affiche `"Processing Stripe webhook"` avec `eventType: payment_intent.succeeded`
- [ ] La réservation correspondante passe en statut `confirmed`
- [ ] Le `paymentStatus` passe à `paid`
- [ ] Le champ `paidAt` est renseigné avec la date du paiement
- [ ] La facture HTML est générée et stockée dans les `details` de la réservation
- [ ] Le webhook répond `200 OK` avec `processed: true`

---

## 7. Simuler un paiement échoué

```bash
# Déclencher un événement payment_intent.payment_failed
stripe trigger payment_intent.payment_failed
```

**Vérifications attendues :**

- [ ] Le log affiche `"Reservation cancelled due to PaymentIntent failure"`
- [ ] La réservation correspondante passe en statut `cancelled`
- [ ] Le `paymentStatus` passe à `failed`
- [ ] Le message d'erreur Stripe est loggé (`last_payment_error.message`)
- [ ] Le webhook répond `200 OK` avec `processed: true`

### Tester les erreurs spécifiques de carte

```bash
# Carte refusée
stripe trigger payment_intent.payment_failed \
  --override 'data.object.last_payment_error.code=card_declined'

# Fonds insuffisants
stripe trigger payment_intent.payment_failed \
  --override 'data.object.last_payment_error.code=insufficient_funds'

# Carte expirée
stripe trigger payment_intent.payment_failed \
  --override 'data.object.last_payment_error.code=expired_card'
```

---

## 8. Tester un remboursement

```bash
# Déclencher un événement charge.refunded
stripe trigger charge.refunded
```

**Vérifications attendues :**

- [ ] La réservation la plus récente du user passe en `paymentStatus: refunded`
- [ ] Le statut de la réservation passe à `cancelled`
- [ ] Le montant remboursé est loggé (`amountRefunded`)
- [ ] Le webhook répond `200 OK` avec `processed: true`

---

## 9. Tester l'endpoint create-checkout-session

Cet endpoint crée un PaymentIntent direct (sans redirection Stripe Checkout).

### Requête de test

```bash
curl -X POST http://localhost:3000/api/billing/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -d '{
    "userId": "user_test_id",
    "amount": 85.00,
    "currency": "eur",
    "description": "Test Salon VIP 2h",
    "metadata": {
      "reservationType": "vip_lounge",
      "airport": "CDG"
    }
  }'
```

### Réponse attendue

```json
{
  "success": true,
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx",
  "reservationId": "clx_xxx"
}
```

**Vérifications :**

- [ ] Le `clientSecret` est retourné et peut être utilisé avec Stripe Elements côté frontend
- [ ] Une réservation en statut `pending` est créée en base de données
- [ ] Le champ `reference` est unique et au format `CS_XXXXXX`
- [ ] L'en-tête `Idempotency-Key` est envoyé à Stripe
- [ ] Le montant en cents est correct (85.00 EUR → 8500 cents)
- [ ] Les metadata sont bien stockés dans les `details` de la réservation

### Tester les erreurs de validation

```bash
# Montant manquant
curl -X POST http://localhost:3000/api/billing/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -d '{"userId": "test"}'
# → 400 Validation failed

# Devise invalide
curl -X POST http://localhost:3000/api/billing/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -d '{"userId": "test", "amount": 50, "currency": "XX"}'
# → 400 La devise doit être un code ISO à 3 lettres
```

### Tester les erreurs Stripe

Les erreurs Stripe suivantes sont mappées en messages utilisateurs :

| Code d'erreur | HTTP Status | Message utilisateur |
|--------------|-------------|-------------------|
| `card_declined` | 402 | Carte refusée |
| `insufficient_funds` | 402 | Fonds insuffisants |
| `expired_card` | 402 | Carte expirée |
| `incorrect_cvc` | 402 | Code CVC incorrect |
| `incorrect_number` | 402 | Numéro de carte incorrect |
| `processing_error` | 502 | Erreur de traitement |
| `rate_limit` | 429 | Trop de requêtes |

---

## 10. Vérifier la génération de facture PDF

Après un paiement réussi, la facture est automatiquement générée.

### Récupérer la facture

```bash
# Remplacer RESERVATION_ID par l'ID retourné par create-checkout-session
curl -o facture.html \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  "http://localhost:3000/api/billing/invoice/RESERVATION_ID/pdf"
```

**Vérifications :**

- [ ] Le fichier HTML est téléchargé (Content-Disposition: attachment)
- [ ] Le contenu HTML affiche le branding AeroAssist
- [ ] Le numéro de facture est au format `INV-CS_XXXXXX`
- [ ] Les informations client sont correctes
- [ ] Le montant TTC, HT et la TVA (20%) sont calculés correctement
- [ ] Le badge de statut affiche "PAYE" en vert
- [ ] Le bouton "Imprimer / Sauvegarder en PDF" fonctionne
- [ ] L'impression (Ctrl+P) génère un PDF correctement formaté

### Erreurs à tester

```bash
# ID inexistant
curl -H "Authorization: Bearer $ADMIN_API_KEY" \
  "http://localhost:3000/api/billing/invoice/ID_INEXISTANT/pdf"
# → 404 Facture introuvable

# Sans authentification
curl "http://localhost:3000/api/billing/invoice/RESERVATION_ID/pdf"
# → 401 Unauthorized
```

---

## 11. Checklist pré-production

Avant de basculer en production, vérifiez ces 10 points :

- [ ] **1. Clés API de production configurées** — `pk_live_...` et `sk_live_...` (jamais `pk_test_...`)
- [ ] **2. Webhook configuré sur le domaine de production** — URL HTTPS valide et accessible par Stripe
- [ ] **3. Signature du webhook activée** — `STRIPE_WEBHOOK_SECRET` correspond au secret du webhook en production
- [ ] **4. Variables d'environnement sécurisées** — Aucune clé secrète dans le code source ou le `.env` versionné
- [ ] **5. ENDPOINTS sécurisés** — `ADMIN_API_KEY` configuré et appliqué sur tous les endpoints sensibles
- [ ] **6. Gestion des erreurs Stripe** — Les erreurs `card_declined`, `insufficient_funds`, `expired_card` retournent des messages utilisateurs appropriés
- [ ] **7. Idempotency Keys** — Chaque création de PaymentIntent inclut un `Idempotency-Key` unique
- [ ] **8. Journaux structurés** — Tous les événements Stripe sont loggés avec Winston (niveaux info/warn/error)
- [ ] **9. Factures générées** — La génération de facture HTML fonctionne et le stockage en DB est opérationnel
- [ ] **10. Tests de bout en bout validés** — Paiement réussi, paiement échoué, remboursement, et génération de facture

---

## 12. Passage en production

### Étapes de bascule

1. **Sauvegarder les clés de test** — Conservez les clés `sk_test_...` et `pk_test_...` dans un fichier sécurisé
2. **Mettre à jour les variables d'environnement** :
   ```bash
   # Avant (test)
   STRIPE_SECRET_KEY=sk_test_xxx
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

   # Après (production)
   STRIPE_SECRET_KEY=sk_live_xxx
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
   ```
3. **Mettre à jour le webhook secret** — Remplacer `whsec_test_...` par `whsec_live_...` du webhook de production
4. **Déployer** — Poussez la mise à jour de l'environnement sur votre plateforme
5. **Vérifier le déploiement** :
   ```bash
   curl -s https://app.aeroassist.fr/api/stripe/checkout | jq .configured
   # → true
   ```
6. **Effectuer un paiement test en production** — Utilisez une vraie carte avec un montant minimal (ex: 1.00 EUR) puis remboursez immédiatement
7. **Valider les webhooks** — Vérifiez dans le **Stripe Dashboard → Developers → Webhooks** que les événements arrivent avec le statut `200`

### Retour en arrière (Rollback)

En cas de problème, revenir aux clés de test :

```bash
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_test_xxx
```

> ⚠️ Les paiements réels effectués avec les clés `sk_live_` ne peuvent pas être annulés automatiquement par un rollback.

---

## 13. Monitoring des paiements

### Stripe Dashboard

Surveillez ces métriques dans le **Stripe Dashboard** :

| Métrique | Emplacement | Fréquence de vérification |
|----------|------------|--------------------------|
| Volume de paiements | Dashboard → Payments | Quotidien |
| Taux de réussite | Dashboard → Payments → Success rate | Hebdomadaire |
| Paiements échoués | Dashboard → Payments → Failed | Quotidien |
| Remboursements | Dashboard → Payments → Refunds | Hebdomadaire |
| Disputes (chargebacks) | Dashboard → Disputes | Quotidien |
| Webhooks (erreurs) | Dashboard → Developers → Webhooks | Quotidien |
| Versements (payouts) | Dashboard → Balance → Payouts | Hebdomadaire |

### Alertes recommandées

Configurez ces alertes dans Stripe :

1. **Taux d'échec > 5%** sur une heure → Notification email immédiate
2. **Dispute reçue** → Notification immédiate (+ alerte Slack)
3. **Webhook en échec** (> 3 échecs consécutifs) → Notification immédiate
4. **Paiement > 10 000 EUR** → Validation manuelle requise
5. **Versement échoué** → Notification immédiate

### Logs applicatifs

Les logs Winston (dossier `logs/`) contiennent :

- `combined.log` — Tous les événements Stripe
- `error.log` — Erreurs et échecs de paiement uniquement
- `webhook.log` — Journal d'audit des webhooks reçus

**Recherche utile :**

```bash
# Derniers paiements échoués
rg "PaymentIntent.*failed" logs/error.log

# Webhooks reçus
rg "Processing Stripe webhook" logs/combined.log

# Factures générées
rg "Invoice.*generated" logs/combined.log

# Erreurs de carte
rg "card_declined|insufficient_funds|expired_card" logs/error.log
```

### Grafana (optionnel)

Si Grafana est configuré, créez un dashboard avec :

- **Nombre de paiements par heure** (séparés réussis/échoués)
- **Montant total traité** par jour/semaine/mois
- **Taux de conversion** (PaymentIntent créés → PaymentIntent réussis)
- **Latence des webhooks** (temps entre l'événement Stripe et le traitement)
- **Erreurs par code** (card_declined, insufficient_funds, etc.)

---

## Résumé rapide

```
✅ Compte Stripe vérifié et activé
✅ Clés pk_live_ / sk_live_ obtenues
✅ Webhook configuré avec whsec_live_
✅ Variables d'environnement sécurisées
✅ Paiement réussi testé (stripe trigger)
✅ Paiement échoué testé (card_declined, insufficient_funds)
✅ Remboursement testé (charge.refunded)
✅ Endpoint create-checkout-session fonctionnel
✅ Génération de facture PDF vérifiée
✅ 10 points de checklist validés
✅ Monitoring configuré (Dashboard + Logs + Alertes)
```

---

> Pour toute question, contactez l'équipe technique : tech@aeroassist.fr
