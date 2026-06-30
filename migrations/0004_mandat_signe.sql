-- Migration 0004 — ajout colonne mandat_signe dans dossier_status
ALTER TABLE dossier_status ADD COLUMN mandat_signe INTEGER NOT NULL DEFAULT 0;
