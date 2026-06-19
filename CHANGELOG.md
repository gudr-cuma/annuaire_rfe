# Changelog

## 2026-06-19 — Colonnes resserrées, référentiels AGC/Fédération, imports indépendants, exclusions

Plan détaillé : [docs/PLAN_colonnes_referentiels_imports_exclusions.md](docs/PLAN_colonnes_referentiels_imports_exclusions.md)

### Colonnes

- `Annuaire fact. électronique` → **Annuaire**, `Plateforme agréée rattachée` → **PA**, `Adresse fact. active` → **Adr. active** : renommées, déplacées juste après la colonne `Nom`, et resserrées (largeurs explicites ajoutées — le tableau n'en avait aucune auparavant).
- Largeur de la colonne `Nom` réduite à 147px (~1/3 de moins).
- Nouvelles colonnes filtrables **Nom AGC** et **Nom Fédération**.

### Référentiels AGC / Fédération

- Nouvelle migration `migrations/0002_refdata_exclusions_meta.sql` : tables `agc_ref` et `federation_ref` (code → nom long), seedées directement depuis les fichiers fournis (`AGC001.csv`, `federation001.csv`, copiés à la racine du repo pour référence) — pas besoin de les réimporter à chaque mise à jour.
- La jointure dans `GET /api/dossiers` résout le nom à partir du code AGC/Fédération du dossier. Un code renseigné mais sans correspondance est masqué (code et nom vides), mais **la ligne reste affichée** — elle n'est jamais supprimée du tableau pour cette raison.

### Imports indépendants

- L'ancien formulaire unique (Dossiers + Facturation obligatoires ensemble) est remplacé par **4 imports indépendants** : Dossiers, Annuaire (anciennement « Facturation »), AGC, Fédération. Chaque import ne remplace que sa propre table et n'affecte pas les 3 autres.
- `GET /api/meta` renvoie désormais le statut (date, nombre de lignes) des 4 jeux de données séparément, affiché sur la page de consultation.

### Exclusions de lignes

- Nouvelle table `excluded_dossiers`, indexée sur le code `DOSSIER` (stable même après un ré-import complet du fichier Dossiers, contrairement à l'identifiant technique auto-incrémenté).
- En session admin : bouton **Exclure** sur chaque ligne du tableau de consultation, et panneau **Voir les exclus** listant les lignes actuellement exclues avec un bouton **Réinclure**.
- Vérifié de bout en bout : exclure une ligne la retire immédiatement, l'exclusion survit à un ré-import complet du fichier Dossiers, et la ligne réapparaît après réinclusion.

### Constat fait pendant le développement

Une ligne existante porte déjà un nom préfixé `***EXCLUE***...` dans les données — une convention manuelle utilisée avant l'existence de cette fonctionnalité. À migrer vers une vraie exclusion si pertinent.

### Vérification effectuée

- Suite Vitest existante (23 tests) : verte, aucune régression.
- `npm run lint` : propre.
- Vérification manuelle complète via l'API D1 locale et via interaction live dans un navigateur (preview) : ordre/largeur des colonnes, résolution de noms AGC/Fédération, masquage d'un code invalide sans perte de ligne, ré-import indépendant d'un seul fichier, cycle exclusion → ré-import dossiers → toujours exclu → réinclusion.
