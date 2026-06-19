import { json, error, methodNotAllowed } from '../../_lib/responses.js'

export async function onRequest(context) {
  const { request, env } = context
  if (request.method !== 'GET') return methodNotAllowed()

  try {
    const meta = await env.DB.prepare(
      'SELECT imported_at, dossiers_count, facturation_count, dossiers_filename, facturation_filename FROM import_meta WHERE id = 1'
    ).first()
    return json(meta || { imported_at: null }, 200, { 'Cache-Control': 'public, max-age=30' })
  } catch (err) {
    return error('Erreur de lecture des métadonnées : ' + err.message, 500)
  }
}
