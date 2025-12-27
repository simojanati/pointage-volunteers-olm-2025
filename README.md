# Pointage Volunteers – OLM (2025)

Application web (Google Apps Script + front statique) pour gérer les bénévoles et le **pointage** (présence) via liste, QR Code et opérations en masse.  
Le projet est conçu pour un usage **mobile-first** (scanner caméra) tout en restant confortable sur desktop.

---

## Fonctionnalités

### 1) Gestion des bénévoles (Admin & Super Admin)
- **Liste des bénévoles** avec recherche rapide (nom/prénom, badge).
- **Ajouter** un bénévole :
  - Informations : *Nom complet, Badge code, Téléphone, Groupe, QR Code (optionnel)*.
  - Option : **pointer immédiatement** au moment de l’ajout (radio button).
- **Modifier** un bénévole :
  - Mise à jour des champs (dont QR Code).
  - Contrôles d’unicité (badge et QR Code) pour éviter les doublons.
- Indicateur pour les bénévoles **sans QR Code** (icône + info-bulle).

### 2) Pointage (présence)
- Pointage manuel depuis la liste.
- Message clair :
  - **Succès** (avec heure de pointage).
  - **Déjà pointé** (avec heure du dernier pointage).
- Support du format d’affichage de date : `DD/MM/YYYY HH:mm:ss (GMT+1)`.

### 3) Scan QR Code (Admin & Super Admin)
- Page dédiée **Scan** accessible depuis Pointage.
- Lecture via la **caméra arrière** (préférence automatique).
- À la lecture d’un QR :
  - Si le QR correspond à un bénévole → pointage immédiat.
  - Si le QR est **introuvable** :
    - Le code est copié automatiquement.
    - Un popup permet de **chercher un bénévole** (Nom/Prénom/Badge) à partir d’un cache local.
    - Bouton **Associer** : lie le QR scanné au bénévole sélectionné puis relance le pointage.

### 4) Pointage par groupe (Super Admin)
- Bouton **Pointage par groupe** (à côté de Scan) visible uniquement pour le Super Admin.
- Sélection du groupe (A, B) et pointage **en masse**.

> Note : Le projet est configuré pour 2 groupes (A, B). Le groupe C a été retiré.

### 5) Rapports & PDF (Super Admin)
- **PDF Pointage** :
  - Export propre, responsive.
  - Colonnes ajustées :
    - Si *Du = Au* : la colonne Date est retirée.
    - Téléphone affiché au format `+212...`.
- **PDF Volontaires par groupes** :
  - Tables séparées par groupe (A et B).
  - Colonnes exportées : **Nom complet + Badge** (ID et Téléphone retirés).

### 6) Journal d’audit (Logs) – Page dédiée (Super Admin)
- Une feuille **Logs** (audit) enregistre les actions :
  - `PUNCH`, `DELETE_PUNCH`, `PUNCH_GROUP`, `ASSIGN_QR`, `ADD_VOLUNTEER`, `UPDATE_VOLUNTEER`.
- Page **Logs** dédiée :
  - Liste du plus récent au plus ancien (dernier log en haut).
  - Filtres : utilisateur, action, résultat.
  - Détails pro (ex : UPDATE_VOLUNTEER affiche les champs modifiés **old → new**).
- Anti-duplication :
  - Protection contre les doublons de logs en cas de retry réseau (signature + fenêtre de 5 secondes).

### 7) Viewer public (sans téléphone)
- La page Viewer est pensée pour un accès public : les **numéros de téléphone ne sont pas affichés**.

---

## Rôles & Permissions

- **Admin**
  - Gestion des bénévoles.
  - Scan QR + association QR.
  - Pointage standard.
- **Super Admin**
  - Tout ce que fait Admin.
  - Pointage en masse par groupe.
  - Rapports PDF.
  - Accès à la page Logs (audit).

---

## Structure du projet

- `admin.html` : page principale (liste bénévoles + ajout/modif).
- `scan.html` : scanner QR + popup d’association QR.
- `reports.html` : exports PDF + bouton Logs (Super Admin).
- `logs.html` : page Logs (Super Admin).
- `viewer.html` : page public (sans téléphone).
- `assets/` : JS/CSS communs
  - `app.js` : auth/session, navbar, helpers
  - `admin.js` : logique admin
  - `scan.js` : scanner + assign QR
  - `reports.js` : exports PDF
  - `logs.js` : affichage des logs
  - `styles.css` : thème + responsive
- `apps-script/Code.gs` : backend Google Apps Script (API JSONP)

---

## Pré-requis

- Un Google Sheet avec les feuilles :
  - `Volunteers` (bénévoles)
  - `Punches` (pointages)
  - `Logs` (créée automatiquement si absente)
- Google Apps Script déployé en **Web App**.
- Front hébergé (GitHub Pages, Cloudflare Pages, Netlify…) en HTTPS pour l’accès caméra.

---

## Colonnes attendues (Google Sheets)

### Volunteers
Colonnes typiques (les noms sont gérés par le script via header) :
- `id`
- `full_name`
- `badge_code`
- `phone`
- `group`
- `qr_code`

### Punches
- `timestamp` / `date` (selon version)
- `volunteer_id`
- `full_name`
- `badge_code`
- `group`

### Logs
Créée automatiquement par le script, avec notamment :
- `ts`
- `actor_username`
- `actor_role`
- `action`
- `volunteer_id`
- `volunteer_name`
- `badge_code`
- `group`
- `result`
- `details`

---

## Installation & Déploiement (résumé)

1) **Apps Script**
- Ouvrir `apps-script/Code.gs`
- Coller le contenu dans votre projet Apps Script.
- Déployer : `Deploy` → `Manage deployments` → `Edit` → `New version` → `Deploy`
- Récupérer l’URL de la Web App.

2) **Front**
- Mettre à jour `assets/config.js` avec l’URL de la Web App.
- Héberger le front en **HTTPS** (obligatoire pour la caméra).

3) **Autorisation caméra**
- Sur mobile : autoriser l’accès caméra (Chrome/Android ou Safari/iOS).
- Le scan privilégie la caméra arrière quand disponible.

---

## Bonnes pratiques
- Utiliser HTTPS (sinon les APIs caméra sont souvent bloquées).
- Garder un badge unique + QR Code unique.
- En cas de modification côté Apps Script, toujours redéployer une **New version**.

---

## Changelog (principales évolutions)
- Ajout Scan QR + association QR en cas de QR introuvable.
- Ajout pointage en masse par groupe (Super Admin).
- Ajout rapports PDF (pointage + bénévoles par groupe).
- Ajout page Logs + audit complet + anti-doublons.
- Suppression du groupe C (A et B uniquement).
- Masquage téléphone sur Viewer public.
