/**
 * importHandlers.js — Helpers partagés par les routes d'import (fichiers indépendants :
 * dossiers / annuaire (facturation) / agc / federation) et les routes d'exclusion.
 */
import { unauthorized } from './responses.js';
import { getImportSessionCookie, verifySession } from './importSession.js';
import { detectDelimiter, parseCSV } from './csv.js';

const BATCH_CHUNK_SIZE = 500;

export function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function readCsvFile(file) {
  const text = await file.text();
  const firstLine = text.split(/\r\n|\n|\r/)[0] || '';
  const delimiter = detectDelimiter(firstLine);
  return parseCSV(text, delimiter);
}

/**
 * Parse les fichiers de référentiel AGC / Fédération : 2 colonnes `code;nom`,
 * SANS ligne d'en-tête (contrairement aux fichiers dossiers/annuaire), une ligne par code.
 */
export async function readCodeLabelCsv(file) {
  const rawText = await file.text();
  const text = rawText.charCodeAt(0) === 0xfeff ? rawText.slice(1) : rawText;
  const lines = text.split(/\r\n|\n|\r/).filter(l => l.trim().length > 0);
  return lines.map(line => {
    const idx = line.indexOf(';');
    if (idx === -1) return { code: line.trim(), nom: '' };
    return { code: line.slice(0, idx).trim(), nom: line.slice(idx + 1).trim() };
  });
}

/** Vérifie la session admin ; renvoie une Response 401 si invalide, sinon null. */
export async function requireImportSession(request, env) {
  if (!env.IMPORT_SECRET) {
    return unauthorized('IMPORT_SECRET non configuré côté serveur.');
  }
  const token = getImportSessionCookie(request);
  if (!(await verifySession(env.IMPORT_SECRET, token))) {
    return unauthorized('Session import expirée ou invalide. Reconnectez-vous.');
  }
  return null;
}

export async function upsertImportMeta(db, dataset, importedAt, rowCount, filename) {
  await db.prepare(
    `INSERT INTO import_meta (dataset, imported_at, row_count, filename)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(dataset) DO UPDATE SET
       imported_at = excluded.imported_at,
       row_count   = excluded.row_count,
       filename    = excluded.filename`
  ).bind(dataset, importedAt, rowCount, filename).run();
}
