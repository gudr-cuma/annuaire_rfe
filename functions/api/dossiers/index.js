import { json, error, methodNotAllowed } from '../../_lib/responses.js'

// Jointure gauche dossiers ⟕ facturation par SIREN, "première occurrence" = MIN(id)
// (équivalent à la Map du prototype, car l'ordre d'insertion à l'import suit l'ordre du fichier source).
const QUERY = `
  SELECT d.siren, d.nom, d.cpostal, d.departement, d.ville,
         d.un_gesdosno, d.dossier, d.federation, d.agc,
         f.annuaire, f.plateforme, f.adresse_facturation, f.adresse_active
  FROM dossiers d
  LEFT JOIN (
    SELECT f1.* FROM facturation f1
    WHERE f1.id = (SELECT MIN(f2.id) FROM facturation f2 WHERE f2.siren = f1.siren)
  ) f ON f.siren = d.siren
  ORDER BY d.nom COLLATE NOCASE
`

export async function onRequest(context) {
  const { request, env } = context
  if (request.method !== 'GET') return methodNotAllowed()

  try {
    const result = await env.DB.prepare(QUERY).all()
    return json(
      { rows: result.results, count: result.results.length },
      200,
      { 'Cache-Control': 'public, max-age=60' }
    )
  } catch (err) {
    return error('Erreur de lecture des données : ' + err.message, 500)
  }
}
