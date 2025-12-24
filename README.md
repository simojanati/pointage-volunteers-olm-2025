# Pointage (GitHub Pages) + Google Sheet (Apps Script)

Ce projet est **100% statique** (GitHub Pages) et utilise une **Google Sheet** comme base de données via **Google Apps Script** (API JSONP).

## 1) Google Sheet (DB)
Créez un Google Spreadsheet avec 2 feuilles :

### Feuille: `Volunteers`
Colonnes (ligne 1) :
- `id`
- `full_name`
- `badge_code`
- `phone`

### Feuille: `Punches`
Colonnes :
- `punch_date`
- `volunteer_id`
- `punched_at`
- `badge_code`
- `full_name`

## 2) Apps Script (API)
Dans la Google Sheet : Extensions → Apps Script
- Copiez le contenu de `apps-script/Code.gs`
- Modifiez la constante `TOKEN`

Puis : Deploy → New deployment → Web app
- Execute as: Me
- Who has access: Anyone
- Copiez l'URL du Web App (API_URL)

## 3) Configuration côté site (GitHub Pages)
Ouvrez `assets/config.js` et collez :
- `API_URL`: URL du Web App
- `TOKEN`: le même TOKEN que dans Apps Script

Optionnel: `ADMIN_PIN` (simple protection UI).

## 4) GitHub Pages
Dans votre repo :
- Placez ces fichiers à la racine
- Settings → Pages → Deploy from a branch → branch `main` → `/ (root)`

## Notes importantes
- GitHub Pages est public → le TOKEN est visible côté navigateur. C'est OK pour une démo.
- La règle "1 pointage par jour" est **enforced** dans Apps Script (doublon bloqué).


## Ajouts (v2)
- Popup **Ajouter un volontaire**
- Bouton **Annuler** (supprime le pointage du jour)
- Cache côté navigateur pour réduire la charge (liste chargée une seule fois)
