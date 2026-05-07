# Guide de Configuration Meta WhatsApp Business API — Production

> AeroAssist — Assistant Virtuel Aéroport  
> Version : 1.0 | Dernière mise à jour : Janvier 2025

---

## Table des matières

1. [Prérequis](#1-prérequis)
2. [Créer une App Meta (Business)](#2-créer-une-app-meta-business)
3. [Ajouter le produit WhatsApp Business](#3-ajouter-le-produit-whatsapp-business)
4. [Vérifier le numéro de téléphone](#4-vérifier-le-numéro-de-téléphone)
5. [Obtenir un System User Token permanent](#5-obtenir-un-system-user-token-permanent)
6. [Configurer le Webhook URL + Verify Token](#6-configurer-le-webhook-url--verify-token)
7. [Soumettre les templates pour approbation Meta](#7-soumettre-les-templates-pour-approbation-meta)
8. [Variables d'environnement requises](#8-variables-denvironnement-requises)
9. [Tester en Sandbox](#9-tester-en-sandbox)
10. [Passage en production (Meta Review)](#10-passage-en-production-meta-review)
11. [Checklist pré-lancement](#11-checklist-pré-lancement)

---

## 1. Prérequis

Avant de commencer la configuration, assurez-vous de disposer des éléments suivants :

### 1.1 Compte Meta Business

- Un compte Meta Business Manager actif ([business.facebook.com](https://business.facebook.com))
- Un rôle administrateur ou développeur sur le compte Business Manager
- Un numéro de téléphone professionnel **non enregistré** sur un autre compte WhatsApp Business API (un numéro ne peut être utilisé que sur un seul compte Business API à la fois)

### 1.2 Numéro de téléphone

- Un numéro de téléphone mobile ou fixe avec capacité à recevoir des SMS ou appels
- Le numéro doit pouvoir recevoir un code de vérification de Meta
- Format international recommandé : `+33XXXXXXXXX` (France)
- **Important** : si le numéro était déjà sur WhatsApp, il sera migré automatiquement vers la version Business lors de la vérification

### 1.3 Infrastructure technique

- Un serveur HTTPS accessible publiquement (URL de production pour le webhook)
- Un certificat SSL/TLS valide (Meta n'accepte pas les webhooks HTTP non chiffrés)
- Accès administrateur au tableau de bord AeroAssist pour configurer les variables d'environnement

### 1.4 Documents de l'API

- Documentation officielle Meta : [Cloud API for WhatsApp](https://developers.facebook.com/docs/whatsapp/cloud-api/)
- Référence des templates : [Message Templates](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates)

---

## 2. Créer une App Meta (Business)

### 2.1 Accéder au Meta for Developers

1. Connectez-vous sur [developers.facebook.com](https://developers.facebook.com)
2. Cliquez sur **« My Apps »** puis **« Create App »**
3. Sélectionnez le type **« Business »**
4. Donnez un nom à votre application, par exemple : `AeroAssist Production`
5. Sélectionnez le **Business Manager** associé
6. Cliquez sur **« Create App »**

### 2.2 Configuration de base

1. Sur la page de l'app, allez dans **« App Settings »** → **« Basic »**
2. Notez les informations suivantes :
   - **App ID** : identifiant unique de l'application
   - **App Secret** : clé secrète (cliquez sur « Show » pour la révéler, elle sera utilisée comme `WHATSAPP_APP_SECRET`)
3. Configurez les paramètres de confidentialité :
   - **Data Removal Callback URL** (optionnel mais recommandé)
   - **User Data Deletion Request Callback** (optionnel mais recommandé)

### 2.3 Mode de l'application

- En phase de développement, l'app est en **mode Développement**
- Pour passer en production, vous devrez soumettre l'app pour revue Meta (voir section 10)

---

## 3. Ajouter le produit WhatsApp Business

### 3.1 Ajout du produit

1. Dans le tableau de bord de l'app, cliquez sur **« Add Product »**
2. Recherchez et cliquez sur **« WhatsApp »** → **« Set Up »**
3. Acceptez les conditions d'utilisation de la WhatsApp Business API

### 3.2 Configuration WhatsApp

1. Dans la section WhatsApp du dashboard, vous verrez :
   - **Phone Number ID** : identifiant du numéro de téléphone (sera utilisé comme `WHATSAPP_PHONE_NUMBER_ID`)
   - **Business Account ID** : identifiant du compte Business WhatsApp
   - **Access Token** : token d'accès temporaire (nous utiliserons un System User Token plus tard)

### 3.3 Sélectionner ou ajouter un numéro

1. Dans la section **« To »** (ou « API Setup »), cliquez sur **« Add Phone Number »**
2. Choisissez votre pays et saisissez le numéro de téléphone
3. Sélectionnez la méthode de vérification : SMS ou appel vocal

---

## 4. Vérifier le numéro de téléphone

### 4.1 Processus de vérification

1. Après avoir ajouté le numéro, Meta enverra un code de vérification à 6 chiffres :
   - **Par SMS** : code envoyé au numéro configuré
   - **Par appel vocal** : un appel automatique dicte le code
2. Saisissez le code dans le champ prévu dans le dashboard
3. Si le code n'arrive pas dans les 60 secondes, demandez un renvoi

### 4.2 Résolution des problèmes courants

| Problème | Solution |
|----------|----------|
| Code non reçu (SMS) | Essayez l'appel vocal, ou attendez quelques minutes avant de réessayer |
| « Phone number already in use » | Le numéro est déjà enregistré sur un autre compte Business API. Demandez sa suppression ou utilisez un autre numéro |
| Vérification échouée | Vérifiez le format du numéro, assurez-vous qu'il est activé et peut recevoir des appels/SMS |
| Numéro porté récemment | Attendez 24-48h après le portage avant la vérification |

### 4.3 Après vérification

Une fois vérifié, le numéro apparaît avec le statut **« Verified »** dans le dashboard. Notez le **Phone Number ID** qui s'affiche à côté du numéro — il sera configuré dans `WHATSAPP_PHONE_NUMBER_ID`.

---

## 5. Obtenir un System User Token permanent

Le token d'accès généré automatiquement expire et n'est pas adapté à la production. Nous devons créer un **System User** avec un token permanent.

### 5.1 Créer un System User

1. Allez dans **Business Settings** → **« System Users »**
2. Cliquez sur **« Add »** → **« Create a system user »**
3. Nommez l'utilisateur : `aeroassist-api-user`
4. Sélectionnez le rôle : **« admin »** (nécessaire pour les templates et l'envoi de messages)
5. Cliquez sur **« Create System User »**

### 5.2 Générer un token

1. Cliquez sur le System User nouvellement créé (`aeroassist-api-user`)
2. Allez dans l'onglet **« Assets »** → **« WhatsApp Business API »**
3. Sélectionnez votre app dans la liste
4. Cliquez sur **« Generate New Token »**
5. Sélectionnez les permissions nécessaires :
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
6. Copiez et sauvegardez le token **immédiatement** — il ne sera affiché qu'une seule fois

### 5.3 Notes de sécurité sur le token

- ⚠️ **Ne partagez jamais** ce token publiquement (pas dans le code source, pas sur GitHub)
- Stockez-le dans les variables d'environnement du serveur (`WHATSAPP_ACCESS_TOKEN`)
- En production, envisagez de le stocker dans un coffre-fort de secrets (AWS Secrets Manager, HashiCorp Vault, etc.)
- Si le token est compromis, révoquez-le immédiatement et générez-en un nouveau

### 5.4 Politique de rotation des tokens

Meta recommande de ne pas utiliser de tokens de longue durée sans plan de rotation. Configurez :

- Une alerte de rappel tous les 6 mois pour auditer le token
- Un processus documenté pour la régénération
- Un test automatique régulier de la validité du token

---

## 6. Configurer le Webhook URL + Verify Token

### 6.1 Définir le Verify Token

Choisissez une chaîne aléatoire sécurisée pour le `Verify Token` :

```bash
# Générez un token sécurisé (32 caractères aléatoires)
openssl rand -hex 16
```

Exemple de token : `a3f8e2b1c9d4706f5e8a3b2c1d0f9e8a`

Ce token sera configuré dans `WHATSAPP_VERIFY_TOKEN` et devra correspondre exactement entre votre serveur et la configuration Meta.

### 6.2 Configurer le webhook dans Meta

1. Dans le dashboard WhatsApp de l'app, allez dans **« Configuration »** → **« Webhook »**
2. Cliquez sur **« Manage »** ou **« Edit »**
3. Saisissez les informations suivantes :

| Champ | Valeur |
|-------|--------|
| **Callback URL** | `https://votre-domaine.com/api/webhook/whatsapp` |
| **Verify Token** | Le token généré à l'étape 6.1 |
| **Subscribe to fields** | Cochez `messages` |

4. Cliquez sur **« Verify and Save »**

### 6.3 Comment fonctionne la vérification

Meta envoie une requête GET à votre webhook :

```
GET /api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=VOTRE_TOKEN&hub.challenge=1234567890
```

Le code dans `src/app/api/webhook/whatsapp/route.ts` vérifie que le `hub.verify_token` correspond à `WHATSAPP_VERIFY_TOKEN`, puis renvoie le `hub.challenge` tel quel.

### 6.4 Vérification de la signature HMAC (production)

En production, Meta signe chaque requête POST avec HMAC-SHA256 :

- L'en-tête `X-Hub-Signature-256` contient la signature
- La signature est calculée avec `WHATSAPP_APP_SECRET`
- Le code dans `src/lib/whatsapp.ts` (fonction `verifyWebhookSignature`) vérifie automatiquement cette signature
- ⚠️ **Sans `WHATSAPP_APP_SECRET` configuré, la vérification est désactivée** — ne jamais déployer en production sans cette variable

### 6.5 Résolution des problèmes de webhook

| Symptôme | Cause probable | Solution |
|----------|---------------|----------|
| « Verify failed » | Verify Token ne correspond pas | Vérifiez que `WHATSAPP_VERIFY_TOKEN` correspond exactement à celui configuré dans Meta |
| Timeout lors de la vérification | Serveur injoignable | Vérifiez que l'URL est publique et le serveur est démarré |
| Pas de réception de messages | Webhook non souscrit | Vérifiez que le champ `messages` est coché dans les subscriptions |
| Erreur 502/504 | Réponse trop lente | Meta exige une réponse en moins de 20 secondes |

---

## 7. Soumettre les templates pour approbation Meta

### 7.1 Présentation des 6 templates AeroAssist

Les templates sont définis dans `src/data/meta-templates.json`. Chaque template doit être soumis individuellement à Meta pour approbation.

| # | Nom | Catégorie | Paramètres |
|---|-----|-----------|------------|
| 1 | `aeroassist_flight_status_update` | UTILITY | vol, départ, arrivée, statut, porte, terminal |
| 2 | `aeroassist_booking_confirmation` | UTILITY | réf, type service, date, lieu, montant |
| 3 | `aeroassist_payment_receipt` | UTILITY | réf, montant, date, service |
| 4 | `aeroassist_vip_lounge_invite` | MARKETING | date, terminal, durée, accès |
| 5 | `aeroassist_hotel_booking_confirm` | UTILITY | hôtel, date arrivée, date départ, chambre, réf |
| 6 | `aeroassist_car_rental_confirm` | UTILITY | véhicule, date début, date fin, lieu retrait, réf |

### 7.2 Soumission via le Meta App Dashboard

1. Dans le dashboard WhatsApp de l'app, allez dans **« Messaging »** → **« Message Templates »**
2. Cliquez sur **« Create New Template »**
3. Pour chaque template, remplissez les champs :
   - **Template name** : le nom exact de `meta-templates.json` (ex: `aeroassist_flight_status_update`)
   - **Category** : UTILITY ou MARKETING (comme spécifié dans le JSON)
   - **Language** : French (`fr`)
   - **Header** : Texte d'en-tête
   - **Body** : Corps du message avec les placeholders `{{1}}`, `{{2}}`, etc.
   - **Buttons** : (pour le template VIP uniquement)
4. Cliquez sur **« Submit for Approval »**

### 7.3 Soumission via l'API (alternative)

Vous pouvez également soumettre les templates par programmation via l'API Meta. Voici un exemple de requête :

```bash
curl -X POST \
  "https://graph.facebook.com/v17.0/YOUR_PHONE_NUMBER_ID/message_templates" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "aeroassist_flight_status_update",
    "category": "UTILITY",
    "language": "fr",
    "components": [
      {
        "type": "header",
        "format": "TEXT",
        "text": "✈️ Mise à jour de vol"
      },
      {
        "type": "body",
        "text": "Bonjour,\n\nVoici les informations de votre vol :\n\n• Vol : {{1}}\n• Départ : {{2}}\n• Arrivée : {{3}}\n• Statut : {{4}}\n• Porte : {{5}}\n• Terminal : {{6}}\n\nNous vous recommandons d'\''arriver à l'\''aéroport au moins 2h avant votre départ.\n\nAeroAssist ✈️"
      }
    ]
  }'
```

### 7.4 Durée d'approbation

- Les templates **UTILITY** sont généralement approuvés en quelques minutes à quelques heures
- Les templates **MARKETING** peuvent prendre jusqu'à **48 heures**
- Meta peut rejeter un template avec un motif (ex: contenu non conforme, format incorrect)

### 7.5 Raisons de rejet courantes

| Raison | Explication | Correction |
|--------|-------------|------------|
| `INVALID_FORMAT` | Les placeholders ne sont pas au format `{{1}}` | Utilisez exactement `{{1}}`, `{{2}}`, etc. |
| `CONTENT_POLICY` | Contenu non conforme aux politiques Meta | Retirez les liens non autorisés, le contenu spam |
| `CATEGORY_MISMATCH` | Catégorie ne correspond pas au contenu | Les confirmations doivent être UTILITY |
| `DUPLICATE` | Un template avec ce nom existe déjà | Utilisez un nom unique |
| `LANGUAGE_NOT_SUPPORTED` | Langue non supportée | Le français est supporté, vérifiez le code `fr` |

### 7.6 Vérifier le statut des templates

Utilisez l'endpoint AeroAssist pour vérifier le statut :

```bash
curl -X GET "https://votre-domaine.com/api/whatsapp/templates/status" \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY"
```

Réponse attendue :

```json
{
  "success": true,
  "data": [
    {
      "name": "aeroassist_flight_status_update",
      "status": "APPROVED",
      "category": "UTILITY",
      "rejection_reason": null,
      "language": "fr"
    },
    {
      "name": "aeroassist_vip_lounge_invite",
      "status": "PENDING",
      "category": "MARKETING",
      "rejection_reason": null,
      "language": "fr"
    }
  ],
  "summary": {
    "total": 6,
    "approved": 5,
    "pending": 1,
    "rejected": 0,
    "not_found": 0
  }
}
```

---

## 8. Variables d'environnement requises

Les variables suivantes doivent être configurées dans l'environnement de production :

### 8.1 Variables WhatsApp (obligatoires)

```bash
# Token d'accès permanent à l'API Meta (System User Token)
# Obtenu à l'étape 5 : voir section « Obtenir un System User Token permanent »
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ID du numéro de téléphone WhatsApp Business
# Trouvé dans le dashboard WhatsApp de l'app Meta (section Phone Numbers)
WHATSAPP_PHONE_NUMBER_ID=123456789012345

# Secret de l'application Meta (App Secret)
# Trouvé dans App Settings → Basic → App Secret
# UTILISÉ POUR LA VÉRIFICATION HMAC DES WEBHOOKS — OBLIGATOIRE EN PRODUCTION
WHATSAPP_APP_SECRET=abcdef1234567890abcdef1234567890

# Token de vérification du webhook (chaîne aléatoire que vous définissez)
# Doit correspondre EXACTEMENT à celui configuré dans le dashboard Meta Webhook
WHATSAPP_VERIFY_TOKEN=a3f8e2b1c9d4706f5e8a3b2c1d0f9e8a

# Version de l'API Meta à utiliser
# Consultez https://developers.facebook.com/docs/graph-api/changelog/ pour les versions disponibles
WHATSAPP_API_VERSION=v17.0
```

### 8.2 Variables Stripe (production)

```bash
# Clé secrète Stripe (production)
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx

# Clé publique Stripe (utilisable côté client)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxx

# Secret du webhook Stripe pour la vérification des signatures
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
```

### 8.3 Autres variables existantes (rappel)

```bash
# Base de données
DATABASE_URL=file:./db/custom.db

# Admin
ADMIN_API_KEY=votre-cle-api-admin

# IA (Groq via z-ai-web-dev-sdk)
# Configuré via le SDK

# Serveur
PORT=3000
NODE_ENV=production
```

### 8.4 Procédure de configuration

1. Connectez-vous à votre serveur de production
2. Éditez le fichier `.env` (ou utilisez votre outil de gestion de secrets)
3. Ajoutez toutes les variables ci-dessus
4. Redémarrez l'application :

```bash
# Si vous utilisez PM2
pm2 restart aeroassist

# Si vous utilisez Docker
docker-compose restart app
```

---

## 9. Tester en Sandbox

### 9.1 Environnement de test Meta

Avant le passage en production, Meta fournit un environnement de test (sandbox) accessible depuis le dashboard de l'app.

### 9.2 Numéros de test

Meta fournit des numéros de téléphone de test pré-vérifiés :
1. Dans le dashboard WhatsApp, allez dans **« To »** (ou API Setup)
2. Cliquez sur **« Manage Phone Number »**
3. Scrollez jusqu'à **« Test Numbers »**
4. Cliquez sur **« Add Test Phone Number »** et saisissez un numéro que vous possédez
5. Envoyez un WhatsApp au numéro business depuis ce numéro de test

### 9.3 Scénarios de test

#### 9.3.1 Test de réception de messages

1. Envoyez un message WhatsApp au numéro business depuis le numéro de test
2. Vérifiez que le message est reçu dans les logs de l'application
3. Vérifiez que la réponse AI est renvoyée

```bash
# Vérifier les logs
pm2 logs aeroassist --lines 50
```

#### 9.3.2 Test de vérification du webhook

```bash
# Simuler la vérification GET de Meta
curl "https://votre-domaine.com/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=VOTRE_TOKEN&hub.challenge=test123"
# Doit renvoyer : test123
```

#### 9.3.3 Test de la signature HMAC

```bash
# Envoyer une requête POST sans signature (doit renvoyer 401)
curl -X POST "https://votre-domaine.com/api/webhook/whatsapp" \
  -H "Content-Type: application/json" \
  -d '{"object":"whatsapp_business_account","entry":[]}'

# Vérifiez que la réponse est 401 Unauthorized
```

#### 9.3.4 Test de l'envoi de messages via API

```bash
# Test avec curl (utilise le token d'accès)
curl -X POST \
  "https://graph.facebook.com/v17.0/VOTRE_PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer VOTRE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "VOTRE_NUMERO_TEST",
    "type": "text",
    "text": { "body": "Test depuis AeroAssist 🛫" }
  }'
```

#### 9.3.5 Test des templates

```bash
# Envoyer un template approuvé
curl -X POST \
  "https://graph.facebook.com/v17.0/VOTRE_PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer VOTRE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "VOTRE_NUMERO_TEST",
    "type": "template",
    "template": {
      "name": "aeroassist_flight_status_update",
      "language": { "code": "fr" },
      "components": [
        {
          "type": "body",
          "parameters": [
            { "type": "text", "text": "AF1234" },
            { "type": "text", "text": "08:30 CDG" },
            { "type": "text", "text": "10:45 MIA" },
            { "type": "text", "text": "À l'heure" },
            { "type": "text", "text": "B42" },
            { "type": "text", "text": "2E" }
          ]
        }
      ]
    }
  }'
```

---

## 10. Passage en production (Meta Review)

### 10.1 Conditions préalables

Avant de soumettre l'app pour la revue de production, assurez-vous que :

- [ ] Tous les templates sont soumis et **approuvés**
- [ ] Le webhook est vérifié et fonctionnel
- [ ] Le numéro de téléphone est vérifié
- [ ] Le System User Token est configuré et permanent
- [ ] La signature HMAC est activée (`WHATSAPP_APP_SECRET` configuré)
- [ ] Les tests en sandbox sont passés avec succès

### 10.2 Processus de soumission

1. Dans le dashboard de l'app, cliquez sur **« App Review »** → **« Permissions and Features »**
2. Trouvez la permission **« whatsapp_business_messaging »**
3. Cliquez sur **« Request Advanced Access »**
4. Remplissez le formulaire :
   - **Utilisation prévue** : décrivez comment AeroAssist utilise l'API WhatsApp (assistant virtuel pour les voyageurs)
   - **Capture d'écran** : fournissez des captures d'écran de l'application en action
   - **Vidéos** (optionnel) : démo vidéo du flux de conversation
   - **URL de test** : `https://votre-domaine.com`

### 10.3 Délais de revue

- La revue Meta prend généralement **3 à 7 jours ouvrés**
- Meta peut demander des informations supplémentaires
- Vous recevrez une notification par email une fois la revue terminée

### 10.4 Après approbation

1. L'app passe en **mode Production** automatiquement
2. Le token d'accès conserve ses permissions
3. Tous les numéros de téléphone peuvent interagir avec votre bot (plus seulement les numéros de test)
4. Les templates approuvés sont utilisables immédiatement

### 10.5 Limites de production

| Limite | Valeur |
|--------|--------|
| Messages par seconde | Jusqu'à 80/s (selon le tier) |
| Messages par jour | Configuré par Meta lors de l'approbation |
| Taille max d'un message | 4096 caractères (texte) |
| Taille max d'un média | 16 Mo (images), 100 Mo (documents) |
| Fenêtre de session | 24h après le dernier message du client |

---

## 11. Checklist pré-lancement

Utilisez cette checklist pour vérifier que tout est prêt avant le lancement en production.

### 11.1 Configuration Meta

- [ ] App Meta créée et en mode Business
- [ ] Produit WhatsApp Business ajouté
- [ ] Numéro de téléphone vérifié
- [ ] System User créé avec rôle admin
- [ ] System User Token généré et sauvegardé
- [ ] App Secret copié et sécurisé
- [ ] Webhook configuré avec la bonne URL et Verify Token
- [ ] Webhook vérifié avec succès (statut « Verified »)
- [ ] Champs `messages` et `messages.statuses` souscrits

### 11.2 Templates

- [ ] 6 templates soumis à Meta
- [ ] Tous les templates sont en statut **APPROVED**
- [ ] Aucun template rejeté (ou les rejets ont été corrigés et resoumis)
- [ ] Test d'envoi réussi pour chaque template avec des données réelles

### 11.3 Variables d'environnement

- [ ] `WHATSAPP_ACCESS_TOKEN` configuré (token permanent)
- [ ] `WHATSAPP_PHONE_NUMBER_ID` configuré (ID du numéro vérifié)
- [ ] `WHATSAPP_APP_SECRET` configuré (App Secret pour HMAC)
- [ ] `WHATSAPP_VERIFY_TOKEN` configuré (correspond au dashboard Meta)
- [ ] `WHATSAPP_API_VERSION` configuré (`v17.0` ou version actuelle)
- [ ] `STRIPE_SECRET_KEY` configuré (clé production)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` configuré (clé production)
- [ ] `STRIPE_WEBHOOK_SECRET` configuré
- [ ] Aucune variable d'environnement n'est vide

### 11.4 Sécurité

- [ ] Vérification HMAC activée (`WHATSAPP_APP_SECRET` présent)
- [ ] Signature refusée en cas d'invalide (401)
- [ ] Rate limiting configuré sur le webhook
- [ ] `ADMIN_API_KEY` configuré pour les routes protégées
- [ ] Aucun secret n'est commité dans le dépôt Git
- [ ] HTTPS activé sur toutes les routes

### 11.5 Tests fonctionnels

- [ ] Réception de messages inbound fonctionne
- [ ] Réponse AI est générée et envoyée
- [ ] Templates sont envoyés correctement avec les paramètres
- [ ] Webhook renvoie 200 pour les événements de statut
- [ ] Messages en dehors de la fenêtre 24h sont rejetés correctement
- [ ] Fallback statique fonctionne si l'IA est indisponible
- [ ] Détection de langue fonctionne pour le français et l'anglais

### 11.6 Monitoring

- [ ] Logs de l'application accessibles et surveillés
- [ ] Alertes configurées pour les erreurs webhook
- [ ] Métriques de performance surveillées (temps de réponse API)
- [ ] Health check `/api/health` fonctionnel

### 11.7 Documentation et procédures

- [ ] Procédure de régénération du token documentée
- [ ] Procédure de resoumission de templates documentée
- [ ] Procédures d'escalade en cas de panne documentées
- [ ] Contacts d'urgence Meta (support developer) identifiés

---

## Annexe A — Référence rapide des commandes

```bash
# Vérifier la validité du token d'accès
curl -X GET "https://graph.facebook.com/v17.0/me?access_token=VOTRE_TOKEN"

# Lister les templates existants
curl -X GET "https://graph.facebook.com/v17.0/VOTRE_PHONE_ID/message_templates?access_token=VOTRE_TOKEN"

# Vérifier le statut du webhook AeroAssist
curl -X GET "https://votre-domaine.com/api/whatsapp/templates/status" \
  -H "Authorization: Bearer VOTRE_ADMIN_API_KEY"

# Envoyer un message texte
curl -X POST "https://graph.facebook.com/v17.0/VOTRE_PHONE_ID/messages" \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messaging_product":"whatsapp","to":"NUMERO","type":"text","text":{"body":"Test"}}'

# Health check de l'application
curl "https://votre-domaine.com/api/health"
```

## Annexe B — Liens utiles

| Ressource | URL |
|-----------|-----|
| Meta for Developers | https://developers.facebook.com |
| WhatsApp Cloud API Docs | https://developers.facebook.com/docs/whatsapp/cloud-api/ |
| Message Templates | https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates |
| Webhook Setup | https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks |
| Rate Limits | https://developers.facebook.com/docs/whatsapp/cloud-api/reference/rate-limits |
| Business Settings | https://business.facebook.com/settings |
| Changelog API | https://developers.facebook.com/docs/graph-api/changelog/ |
