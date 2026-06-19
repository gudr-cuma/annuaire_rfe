import { json, error, methodNotAllowed } from '../../_lib/responses.js';
import { requireImportSession } from '../../_lib/importHandlers.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') return methodNotAllowed();

  const authError = await requireImportSession(request, env);
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return error('Corps de requête JSON invalide.', 400);
  }
  const dossierCode = (body.dossier_code || '').trim();
  if (!dossierCode) return error('dossier_code est requis.', 400);

  try {
    await env.DB.prepare('DELETE FROM excluded_dossiers WHERE dossier_code = ?').bind(dossierCode).run();
    return json({ ok: true });
  } catch (err) {
    return error('Erreur lors de la réinclusion : ' + err.message, 500);
  }
}
