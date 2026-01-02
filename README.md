# Pointage Volunteers – OLM (Fanzone) · Guide du projet

Application web **front statique** + **Google Apps Script (Web App JSONP)** pour gérer les bénévoles et le **pointage** (présence) via liste, QR Code, et mode **offline** avec synchronisation.

> **Contexte** : utilisation terrain (mobile-first) en environnement événementiel, avec besoin de fiabilité réseau et traçabilité (logs).

---

## Sommaire
- [Fonctionnalités](#fonctionnalités)
- [Rôles et permissions](#rôles-et-permissions)
- [Mode Offline et synchronisation](#mode-offline-et-synchronisation)
- [Archives (bénévoles supprimés)](#archives-bénévoles-supprimés)
- [Données Google Sheets](#données-google-sheets)
- [Déploiement](#déploiement)
- [Scripts Google Sheets (reporting)](#scripts-google-sheets-reporting)
- [Dépannage](#dépannage)
- [Changelog](#changelog)

---

## Fonctionnalités

### ✅ Gestion des bénévoles
- Liste + recherche (nom, badge).
- Ajout / modification (contrôle d’unicité badge et QR).
- Option “pointer immédiatement” au moment de l’ajout (si activée dans l’interface).
- Indicateur pour les bénévoles **sans QR Code**.

### ✅ Pointage
- Pointage manuel depuis la liste.
- Messages clairs :
  - **Succès** (heure de pointage)
  - **Déjà pointé** (heure du dernier pointage)

### ✅ Scan QR Code + Association QR
- Scan caméra (priorité caméra arrière si dispo).
- Si QR inconnu :
  - copie automatique du code
  - popup pour rechercher un bénévole (cache local)
  - bouton **Associer** : lie QR → bénévole, puis lance le pointage

### ✅ Mode **Offline** (scan & pointage)
- Si hors connexion, le scan :
  - enregistre dans une **file offline (queue)** + feedback visuel & sonore
  - refuse un doublon (même badge + même jour) avec message **Déjà pointé**
- Au retour de connexion, bouton **Synchroniser** :
  - envoie la file offline au backend
  - supprime uniquement les éléments validés
- Contrôle de doublon **même en ligne** : si le badge est déjà dans la file offline (non synchronisée), le scan est refusé et affiche **Déjà pointé**.

### ✅ Rapports & Export PDF (Super Admin)
- Export PDF “Pointage” (colonnes adaptées, responsive).
- Export PDF “Volontaires par groupes”.

### ✅ Journal d’audit (Logs)
- Enregistrement des actions : `PUNCH`, `DELETE_PUNCH`, `PUNCH_GROUP`, `ASSIGN_QR`, `ADD_VOLUNTEER`, `UPDATE_VOLUNTEER`, etc.
- Anti-doublon en cas de retry réseau (signature + fenêtre courte).

### ✅ Viewer public (sans téléphone)
- Page Viewer : **numéros de téléphone masqués**.

---

## Rôles et permissions
- **Admin**
  - Gestion des bénévoles
  - Scan QR + association
  - Pointage standard
- **Super Admin**
  - Tout ce que fait Admin
  - Pointage de groupe (masse)
  - Rapports PDF
  - Logs (audit)
  - Accès archive (réactivation)

---

## Mode Offline et synchronisation

### Comportement
- **Offline** :
  - “Enregistré hors-ligne” + icône succès
  - doublon → “Déjà pointé” + icône ⚠️ + son d’erreur
- **Online** :
  - envoie API direct
  - doublon détecté localement (cache/queue) → “Déjà pointé”

### Stockage local (front)
- **Cache** : empêche les doublons (clé = badge + date).
- **Queue offline** : liste des scans à synchroniser.

---

## Archives (bénévoles supprimés)

Dans **Rapports**, bouton **🗃️ Archive** :
- Affiche un popup listant tous les bénévoles présents dans la feuille `ArchiveVolunteers`.
- Bouton **Réactiver** par ligne :
  - remet le bénévole dans `Volunteers`
  - supprime l’entrée correspondante dans `ArchiveVolunteers`

---

## Données Google Sheets

### Feuilles principales
- `Volunteers`
  - `id`, `full_name`, `badge_code`, `phone`, `group`, `qr_code`, …
- `Punches`
  - `volunteer_id`, `punched_at` (ou `punch_date`), `badge_code`, `full_name`, …
- `Logs`
  - `ts`, `actor_username`, `actor_role`, `action`, `result`, `details`, …
- `Users`
  - `username`, `pin`, `role`, **`nomComplet`** (nouveau : affichage UI)
- `ArchiveVolunteers`
  - mêmes champs utiles que `Volunteers` (bénévoles archivés)

> Les scripts utilisent les **headers** pour retrouver les colonnes : évitez de renommer les en-têtes sans mise à jour correspondante.

---

## Déploiement

### 1) Backend Apps Script (Web App)
1. Coller le contenu du backend dans Apps Script
2. Déployer en Web App :
   - **Execute as**: Me
   - **Who has access**: Anyone / Anyone with Google account
3. Récupérer l’URL `/exec`

### 2) Front (statique)
- Mettre à jour `assets/config.js` avec l’URL Web App.
- Héberger en **HTTPS** (obligatoire pour caméra).

---

## Scripts Google Sheets (reporting)

### A) Absences depuis une date (historique)
- Génère une feuille `absences_long` et **append** les résultats (report_at + start_date + volunteer).

### B) Statistiques de pointage par bénévole
- Crée `volunteers_pointage_count` :
  - `full_name`, `badge_code`, `group`
  - `pointage_count` (nombre de pointages)
  - `last_pointage_at` (dernière date)

---

## Dépannage

### Erreur “JSONP error / Impossible de contacter l’API”
Causes fréquentes :
- Web App non publique (access restreint)
- Mauvaise URL `/exec`
- **Erreur Apps Script au chargement** (ex : variables globales dupliquées)

✅ À vérifier :
- Une seule déclaration globale pour `TOKEN` / `doGet`
- Déployer une **New version** après changement

---

## Changelog (résumé)
- Mode Offline (queue + sync) + anti-doublon local
- Icônes & feedback unifiés (succès / ⚠️ déjà pointé)
- Ajout `Users.nomComplet` (affichage UI)
- Bouton Archive + popup + réactivation depuis `ArchiveVolunteers`
- Scripts Google Sheets : absences + stats pointage
