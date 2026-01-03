# Pointage OLM – Fanzone (Web + Google Apps Script)

> **Dernière mise à jour : 03/01/2026**  
> Application de pointage pour volontaires (scan QR/badge), fonctionnement **online/offline**, synchronisation, reporting et administration.

---

## Fonctionnalités

### 1) Pointage (Scan)
- Scan badge/QR avec **feedback visuel + sonore**
- Détection **Déjà pointé** (online + offline) sur la même journée (anti-doublon)
- Mode **offline** :
  - enregistrement en file d’attente (queue) dans `localStorage`
  - message **« Enregistré hors‑ligne »**
- **Synchronisation** : bouton Sync + file d’attente persistée
- Amélioration UX : **prompt** quand la connexion revient (option “Synchroniser maintenant”)

### 2) Administration des volontaires
- Liste / recherche / ajout / modification
- Export (Excel / PDF) – chargement des bibliothèques **à la demande** (lazy-load) pour accélérer l’ouverture des pages

### 3) Archive (Rapports)
- Bouton **Archive** (popup) listant les volontaires archivés (sheet `ArchiveVolunteers`)
- Action **Réactiver** : renvoie le volontaire dans `Volunteers` et le retire de `ArchiveVolunteers`

### 4) Utilisateurs
- Colonne `nomComplet` dans la sheet `Users`
- Affichage : `nomComplet` (si présent) sinon `username`

### 5) Rapports & performances
- Optimisation « premier chargement » :
  - pré‑agrégation côté Apps Script (bundle lite) pour éviter de charger/traiter tout `Punches`
  - export complet uniquement à la demande
- Cartes KPI, présence par groupes, absences, tableaux et popups

### 6) Thème (Jour / Nuit)
- Toggle **Jour / Nuit** dans la barre supérieure (entre logo/titre et les boutons)
- **Jour = thème actuel (dark)**, **Nuit = thème clair**
- Auto‑détection par heure **Casablanca (GMT+1)** si aucun choix sauvegardé :
  - Nuit : 18:32 → 08:30
  - Jour : 08:33 → 18:31
- Corrections UI : inputs & popups lisibles, tables adaptées, compatibilité mobile + cache-busting

---

## Google Sheets (données)

### Sheets principales
- `Volunteers` : référentiel volontaires (id, full_name, badge_code, qr_code, phone, group, …)
- `Punches` : historique pointages (volunteer_id, punched_at / punch_date, …)
- `Users` : comptes (username, pin, rôle, **nomComplet**, …)
- `ArchiveVolunteers` : volontaires archivés

### Scripts utilitaires (Apps Script)
- Génération de statistiques : comptage des pointages par volontaire, dernier pointage, tri
- Rapport des absents depuis une date et historique dans `absences_long`

---

## Déploiement Apps Script (rappel)
1. Apps Script → **Deploy** → **Manage deployments**
2. Web App :
   - **Execute as** : Me
   - **Who has access** : Anyone (ou Anyone with Google Account)
3. Après modification : **New version** → Deploy
4. Vérifier qu’il n’existe qu’**un seul** `TOKEN` (pas de doublons dans d’anciens fichiers)

---

## Dépannage

### “JSONP error / Impossible de contacter l’API”
- Souvent causé par :
  - Web App non publique (access)
  - URL `/exec` incorrecte
  - Erreur Apps Script (ex : `TOKEN` déclaré 2 fois dans un ancien fichier)
- Vérifier le déploiement + logs Apps Script (Executions)

### PDF Export : `autoTable` introuvable
- Résolu via lazy-load robuste + fallback CDN + vérification de présence du plugin

---

## Notes
- L’application est conçue pour être robuste en environnement Fanzone (réseau instable).
- Les optimisations privilégient le **premier chargement** (Reports) et la **stabilité offline**.

---

## Derniers ajustements (UI)
- Rapports: correction d’affichage Desktop (cartes "Présence" et "Dernier pointage" alignées), suppression des boutons inutiles (Annuler/Exporter) en bas.
- Présence Groupes: formatage avec 2 chiffres (ex : 03/04).
- Thème Nuit (clair): correction des inputs dans les popups Ajouter/Modifier + options des selects, et résolution des soucis sur mobile (cache).
