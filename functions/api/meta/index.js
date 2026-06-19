import { json, error, methodNotAllowed } from '../../_lib/responses.js'

export async function onRequest(context) {
  const { request, env } = context
  if (request.method !== 'GET') return methodNotAllowed()

  try {
    const result = await env.DB.prepare(
      'SELECT dataset, imported_at, row_count, filename FROM import_meta'
    ).all()
    const meta = { dossiers: null, facturation: null, agc: null, federation: null }
    for (const r of result.results) {
      meta[r.dataset] = { imported_at: r.imported_at, row_count: r.row_count, filename: r.filename }
    }
    return json(meta, 200, { 'Cache-Control': 'public, max-age=30' })
  } catch (err) {
    return error('Erreur de lecture des métadonnées : ' + err.message, 500)
  }
}
