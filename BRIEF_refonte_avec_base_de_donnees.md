# Brief — Refonte de l'annuaire « Fusion Dossiers / Facturation » avec base de données

## Contexte

Un premier prototype existe déjà : `fusion_dossiers_facturation.html`, un fichier HTML autonome (tout en JavaScript côté navigateur, sans backend) qui :
- permet d'uploader deux fichiers CSV directement dans la page,
- les fusionne par SIREN,
- affiche le résultat dans un tableau triable, filtrable et regroupable,
- stocke les données dans le `localStorage` du navigateur (donc pas de vraie persistance partagée, pas d'accès multi-utilisateurs, pas de mise à jour à distance).

Objectif de cette refonte : remplacer ce prototype par une vraie petite application web avec **base de données**, déployée sur l'infra habituelle (**repo GitHub + Cloudflare**), accessible publiquement en lecture, avec une mise à jour des données pilotée par moi (Guillaume) via un import dans l'app — pas par le grand public.

## Décisions déjà prises

- **Accès public** : la page de consultation (tableau, recherche, filtres, regroupements) est ouverte à tous, sans authentification.
- **Mise à jour réservée** : seul moi dois pouvoir déclencher un ré-import des CSV. Comme la consultation est publique, **il faut protéger la route/page d'import** (ex : simple token secret en variable d'environnement Cloudflare, vérifié côté serveur, ou un mot de passe basique uniquement sur cette page — pas sur le reste de l'app). À toi de proposer la solution la plus simple et de me la signaler clairement dans le README.
- **Hébergement** : repo GitHub + Cloudflare (Pages + Functions/Workers, intégration Git habituelle).
- **Stockage** : à toi d'évaluer si une base Cloudflare D1 (SQLite serverless) est nécessaire, ou si un simple fichier (CSV/JSON fusionné, régénéré à chaque import et committé ou stocké en KV/R2) suffit. Vu qu'on me demande explicitement une « base de données » et que les fonctionnalités (recherche, tri, filtres, regroupements) sont plus simples à exprimer en SQL sur des volumes de ~9 000 lignes, **D1 est recommandé par défaut**, mais documente ton choix et les alternatives envisagées.

## Données sources

Deux fichiers CSV, à fusionner par la colonne SIREN.

### Fichier 1 — « Dossiers »
- Séparateur `;`, encodage UTF-8, fins de ligne CRLF.
- En-tête et ordre des colonnes (fixe) : `SIREN;NOM;CPOSTAL;VIL;UN_GESDOSNO;DOSSIER;FEDERATION;AGC`
- ~8 600 lignes dans le jeu de données actuel.
- Tous les champs texte sont potentiellement paddés avec des espaces (champs à largeur fixe à l'export) → **trim systématique de chaque valeur**.
- `SIREN` peut être en doublon : **ce n'est pas une erreur**. Une même entreprise peut avoir plusieurs dossiers (ex. années ou exploitations différentes). La clé d'unicité réelle d'une ligne est `DOSSIER` (ou le couple `UN_GESDOSNO`/`DOSSIER`), pas `SIREN`. Ne jamais dédupliquer par SIREN sur ce fichier.
- Cas limites observés à gérer proprement (ne pas planter, juste afficher vide/N.D.) :
  - `SIREN = "000000000"` avec `CPOSTAL = "CPXXXXX"` → valeur placeholder/invalide, à conserver telle quelle (pas de filtrage automatique sans me le signaler).
  - Quelques lignes (~8 dans le jeu actuel) avec `CPOSTAL` et `VIL` vides.
- `AGC` est vide sur une partie des lignes (normal).
- `DEPARTEMENT` est une colonne **calculée**, pas présente dans le fichier source : 2 premiers caractères de `CPOSTAL` (trimé) si ce sont bien 2 chiffres, sinon `"N/D"`.

### Fichier 2 — « Facturation »
- Séparateur `,`, encodage UTF-8.
- En-tête et ordre des colonnes (fixe) : `SIREN,Présent dans l'annuaire de la facturation électronique,Plateforme agréée rattachée,Adresse de facturation,Adresse de facturation active`
- ~9 500 lignes.
- Valeurs des colonnes 2, 3 et 5 : `Oui` / `Non` / parfois vide.
- `SIREN` peut aussi être en doublon ici. En cas de doublon, prendre la **première occurrence rencontrée** (comportement du prototype actuel) — pas de règle métier connue pour trancher autrement.
- La colonne « Adresse de facturation » contient parfois le SIREN lui-même (valeur par défaut), parfois une autre valeur — ne pas chercher à l'interpréter, l'afficher telle quelle.

### Logique de fusion
- Table pivot = fichier Dossiers (1 ligne = 1 dossier).
- Pour chaque dossier, on rattache les infos de facturation du fichier 2 via une recherche par SIREN (jointure gauche : si aucune correspondance, les colonnes de facturation restent vides, ce n'est pas une erreur).
- Ne pas se fier aux noms d'en-têtes du fichier 2 pour le mapping (accents/apostrophes fragiles selon l'encodage) : mapper **par position de colonne**, dans l'ordre décrit ci-dessus.
- Identifier la base CSV/format en détectant le séparateur (`;` vs `,`) sur la première ligne plutôt que de le coder en dur, pour rester tolérant si un futur export change légèrement.

## Modèle de données suggéré (si D1)

Deux tables brutes + vue ou requête de jointure, par exemple :

```sql
CREATE TABLE dossiers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  siren TEXT NOT NULL,
  nom TEXT,
  cpostal TEXT,
  departement TEXT,
  ville TEXT,
  un_gesdosno TEXT,
  dossier TEXT,
  federation TEXT,
  agc TEXT,
  imported_at TEXT
);

CREATE TABLE facturation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  siren TEXT NOT NULL,
  annuaire TEXT,
  plateforme TEXT,
  adresse_facturation TEXT,
  adresse_active TEXT,
  imported_at TEXT
);
```

À chaque import : vider et recharger entièrement les deux tables (les fichiers source sont des exports complets, pas des deltas — pas besoin d'upsert ligne à ligne, un remplacement total est plus simple et plus sûr). La jointure dossiers ⟕ facturation (par SIREN, première correspondance) peut être faite à la lecture, en SQL ou en vue.

## Fonctionnalités attendues côté consultation (à reproduire et conserver)

Colonnes affichées (ordre suggéré) : SIREN, Nom, Département, Code postal, Ville, AGC, Fédération, N° gestion dossier, Dossier, Annuaire fact. électronique, Plateforme agréée rattachée, Adresse de facturation, Adresse fact. active.

- **Recherche globale** : un champ qui filtre sur toutes les colonnes en même temps (insensible aux accents et à la casse).
- **Filtre par colonne** : un filtre dédié pour chaque colonne.
  - Pour les 3 colonnes de statut (Annuaire fact. électronique, Plateforme agréée rattachée, Adresse fact. active) : un sélecteur **Tous / Oui / Non / Non renseigné** (pas un champ texte libre).
  - Pour les autres colonnes : filtre texte « contient ».
- **Tri** : clic sur un en-tête de colonne pour trier (asc/desc), avec indicateur visuel du tri actif.
- **Regroupement sur 3 niveaux**, sélectionnables indépendamment parmi AGC / Fédération / Département (ou « aucun »), affichés en arborescence repliable avec le nombre de dossiers par groupe à chaque niveau. Boutons « tout déplier / tout replier ».
- **Compteur** : nombre de lignes affichées / nombre total après filtres.
- Tags visuels distincts pour Oui (vert) / Non (rouge) / vide (gris, affiché « — ») sur les 3 colonnes de statut.

Cette logique de filtrage/tri/regroupement existe déjà et fonctionne dans le prototype HTML (voir le fichier `fusion_dossiers_facturation.html` du même dossier) : tu peux t'en inspirer directement pour la partie front, en la reconnectant à une API au lieu de tout faire en mémoire navigateur. Si le volume de lignes le permet (~9 000), il est probablement plus simple de continuer à filtrer/trier/grouper **côté client** après avoir chargé le jeu de données fusionné une fois via l'API, plutôt que de tout pousser côté SQL — mais évalue selon la taille réelle des réponses.

## Import / mise à jour des données

- Une page (protégée, cf. plus haut) avec deux champs d'upload (un par fichier), comme dans le prototype.
- Au moment de l'import : parsing des deux CSV, validation basique (nombre de colonnes attendu, sinon message d'erreur clair), remplacement complet des données en base, horodatage de l'import.
- Afficher après import : nombre de lignes importées par fichier, date du dernier import — ces infos doivent aussi être visibles (en lecture) sur la page publique, pour savoir si les données sont à jour.

## Livrables attendus

- Repo GitHub prêt à connecter à Cloudflare Pages (déploiement Git habituel).
- README expliquant : la stack choisie et pourquoi, comment configurer le secret d'import, comment lancer en local, comment déployer.
- Un mécanisme de migration/initialisation de la base D1 (script ou commande `wrangler d1 execute` documentée) si D1 est retenu.

## Questions ouvertes à trancher pendant le développement (me solliciter si besoin)

- Mécanisme exact de protection de la page d'import (token en query param, header, ou mini-formulaire mot de passe) — proposer le plus simple à opérer pour moi au quotidien.
- D1 vs fichier fusionné statique : trancher selon la simplicité de mise à jour et le coût de maintenance, documenter le choix.
- Faut-il conserver un export/téléchargement CSV du résultat fusionné depuis la page publique ? (non demandé explicitement, mais facile à ajouter et probablement utile — à proposer, pas obligatoire).
