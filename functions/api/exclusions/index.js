import { json, error, methodNotAllowed } from '../../_lib/responses.js';
import { requireImportSession } from '../../_lib/importHandlers.js';

export async function onRequest(context) {
  const { request, env } = context;

  const authError = await requireImportSession(request, env);
  if (authError) return authError;

  if (request.method === 'GET') {
    try {
      const result = await env.DB.prepare(
        `SELECT ex.dossier_code, ex.excluded_at, d.nom, d.siren, d.agc, d.federation, d.ville
         FROM excluded_dossiers ex
         LEFT JOIN dossiers d ON d.dossier = ex.dossier_code
         ORDER BY ex.excluded_at DESC`
      ).all();
      return json({ rows: result.results });
    } catch (err) {
      return error('Erreur de lecture des exclusions : ' + err.message, 500);
    }
  }

  if (request.method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      return error('Corps de requête JSON invalide.', 400);
    }
    const dossierCode = (body.dossier_code || '').trim();
    if (!dossierCode) return error('dossier_code est requis.', 400);

    try {
      await env.DB.prepare(
        'INSERT INTO excluded_dossiers (dossier_code, excluded_at) VALUES (?, ?) ON CONFLICT(dossier_code) DO NOTHING'
      ).bind(dossierCode, new Date().toISOString()).run();
      return json({ ok: true });
    } catch (err) {
      return error('Erreur lors de l\'exclusion : ' + err.message, 500);
    }
  }

  return methodNotAllowed();
}
