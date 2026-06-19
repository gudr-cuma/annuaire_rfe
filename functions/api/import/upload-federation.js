import { json, error, methodNotAllowed } from '../../_lib/responses.js';
import { chunk, readCodeLabelCsv, requireImportSession, upsertImportMeta } from '../../_lib/importHandlers.js';

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
  if (!file) return error('Le fichier Fédération est requis.', 400);

  const entries = (await readCodeLabelCsv(file)).filter(e => e.code);
  if (entries.length === 0) {
    return error('Fichier Fédération : aucune ligne valide (attendu : code;nom, une par ligne).', 400);
  }

  const importedAt = new Date().toISOString();
  const rows = entries.map(e => [e.code, e.nom, importedAt]);

  const db = env.DB;
  try {
    await db.prepare('DELETE FROM federation_ref').run();
    const stmt = db.prepare('INSERT INTO federation_ref (code, nom, imported_at) VALUES (?, ?, ?)');
    for (const batch of chunk(rows, BATCH_CHUNK_SIZE)) {
      await db.batch(batch.map(row => stmt.bind(...row)));
    }
    await upsertImportMeta(db, 'federation', importedAt, rows.length, file.name);
  } catch (err) {
    return error(
      `Erreur pendant l'import du fichier Fédération : ${err.message}. La table peut être partiellement vidée — relancez un import complet.`,
      500
    );
  }

  return json({ ok: true, row_count: rows.length, imported_at: importedAt });
}
