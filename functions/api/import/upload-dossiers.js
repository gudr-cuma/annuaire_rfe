import { json, error, methodNotAllowed } from '../../_lib/responses.js';
import { computeDepartement } from '../../_lib/merge.js';
import { chunk, readCsvFile, requireImportSession, upsertImportMeta } from '../../_lib/importHandlers.js';

const DOSSIERS_EXPECTED_COLS = 8;
const BATCH_CHUNK_SIZE = 500;

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') return methodNotAllowed();

  const authError = await requireImportSession(request, env);
  if (authError) return authError;

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return error('Corps de requête multipart invalide.', 400);
  }

  const file = formData.get('file');
  if (!file) return error('Le fichier Dossiers est requis.', 400);

  const parsed = await readCsvFile(file);
  if (parsed.headers.length < DOSSIERS_EXPECTED_COLS) {
    return error(
      `Fichier Dossiers : format inattendu (${parsed.headers.length} colonnes au lieu de ${DOSSIERS_EXPECTED_COLS}).`,
      400
    );
  }

  const importedAt = new Date().toISOString();
  const rows = parsed.rows.map(r => {
    const cpostal = (r[2] || '').trim();
    return [
      (r[0] || '').trim(),
      (r[1] || '').trim(),
      cpostal,
      computeDepartement(cpostal),
      (r[3] || '').trim(),
      (r[4] || '').trim(),
      (r[5] || '').trim(),
      (r[6] || '').trim(),
      (r[7] || '').trim(),
      importedAt,
    ];
  });

  const db = env.DB;
  try {
    await db.prepare('DELETE FROM dossiers').run();
    const stmt = db.prepare(
      'INSERT INTO dossiers (siren, nom, cpostal, departement, ville, un_gesdosno, dossier, federation, agc, imported_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const batch of chunk(rows, BATCH_CHUNK_SIZE)) {
      await db.batch(batch.map(row => stmt.bind(...row)));
    }
    await upsertImportMeta(db, 'dossiers', importedAt, rows.length, file.name);
  } catch (err) {
    return error(
      `Erreur pendant l'import du fichier Dossiers : ${err.message}. La table peut être partiellement vidée — relancez un import complet.`,
      500
    );
  }

  return json({ ok: true, row_count: rows.length, imported_at: importedAt });
}
