-- Schéma initial — annuaire_rfe
-- Remplacement complet des tables dossiers/facturation à chaque import (pas d'upsert,
-- les fichiers source sont des exports complets). La jointure se fait en lecture (voir
-- functions/api/dossiers/index.js), pas de table dénormalisée stockée.

CREATE TABLE IF NOT EXISTS dossiers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  siren         TEXT NOT NULL,
  nom           TEXT,
  cpostal       TEXT,
  departement   TEXT,
  ville         TEXT,
  un_gesdosno   TEXT,
  dossier       TEXT,
  federation    TEXT,
  agc           TEXT,
  imported_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS facturation (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  siren                 TEXT NOT NULL,
  annuaire              TEXT,
  plateforme            TEXT,
  adresse_facturation   TEXT,
  adresse_active        TEXT,
  imported_at           TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dossiers_siren    ON dossiers(siren);
CREATE INDEX IF NOT EXISTS idx_facturation_siren ON facturation(siren);

-- Métadonnées du dernier import — une seule ligne (id=1), réécrite à chaque import.
CREATE TABLE IF NOT EXISTS import_meta (
  id                    INTEGER PRIMARY KEY CHECK (id = 1),
  imported_at           TEXT NOT NULL,
  dossiers_count        INTEGER NOT NULL,
  facturation_count     INTEGER NOT NULL,
  dossiers_filename     TEXT,
  facturation_filename  TEXT
);
