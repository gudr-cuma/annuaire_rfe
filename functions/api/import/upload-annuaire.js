import { json, error, methodNotAllowed } from '../../_lib/responses.js';
import { chunk, readCsvFile, requireImportSession, upsertImportMeta } from '../../_lib/importHandlers.js';

const FACTURATION_EXPECTED_COLS = 5;
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
  if (!file) return error('Le fichier Annuaire est requis.', 400);

  const parsed = await readCsvFile(file);
  if (parsed.headers.length < FACTURATION_EXPECTED_COLS) {
    return error(
      `Fichier Annuaire : format inattendu (${parsed.headers.length} colonnes au lieu de ${FACTURATION_EXPECTED_COLS}).`,
      400
    );
  }

  const importedAt = new Date().toISOString();
  const rows = parsed.rows.map(r => [
    (r[0] || '').trim(),
    (r[1] || '').trim(),
    (r[2] || '').trim(),
    (r[3] || '').trim(),
    (r[4] || '').trim(),
    importedAt,
  ]);

  const db = env.DB;
  try {
    await db.prepare('DELETE FROM facturation').run();
    const stmt = db.prepare(
      'INSERT INTO facturation (siren, annuaire, plateforme, adresse_facturation, adresse_active, imported_at) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const batch of chunk(rows, BATCH_CHUNK_SIZE)) {
      await db.batch(batch.map(row => stmt.bind(...row)));
    }
    await upsertImportMeta(db, 'facturation', importedAt, rows.length, file.name);
  } catch (err) {
    return error(
      `Erreur pendant l'import du fichier Annuaire : ${err.message}. La table peut être partiellement vidée — relancez un import complet.`,
      500
    );
  }

  return json({ ok: true, row_count: rows.length, imported_at: importedAt });
}
