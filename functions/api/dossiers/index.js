import { json, error, methodNotAllowed } from '../../_lib/responses.js'

// Jointure gauche dossiers ⟕ facturation par SIREN, "première occurrence" = MIN(id)
// (équivalent à la Map du prototype, car l'ordre d'insertion à l'import suit l'ordre du fichier source).
// + jointure des référentiels agc_ref/federation_ref par code exact : un code non vide sans
//   correspondance est masqué (agc/federation vides, pas de nom_agc/nom_federation), mais la
//   ligne reste affichée — seul le code invalide disparaît, pas le dossier.
// + exclusion des dossiers marqués dans excluded_dossiers (clé stable = colonne `dossier`,
//   qui survit à un ré-import complet de la table `dossiers`).
const QUERY = `
  SELECT d.siren, d.nom, d.cpostal, d.departement, d.ville,
         d.un_gesdosno, d.dossier,
         CASE WHEN d.federation <> '' AND fr.code IS NULL THEN '' ELSE d.federation END AS federation,
         CASE WHEN d.federation <> '' AND fr.code IS NOT NULL THEN fr.nom ELSE '' END AS nom_federation,
         CASE WHEN d.agc <> '' AND ar.code IS NULL THEN '' ELSE d.agc END AS agc,
         CASE WHEN d.agc <> '' AND ar.code IS NOT NULL THEN ar.nom ELSE '' END AS nom_agc,
         f.annuaire, f.plateforme, f.adresse_facturation, f.adresse_active
  FROM dossiers d
  LEFT JOIN (
    SELECT f1.* FROM facturation f1
    WHERE f1.id = (SELECT MIN(f2.id) FROM facturation f2 WHERE f2.siren = f1.siren)
  ) f ON f.siren = d.siren
  LEFT JOIN agc_ref ar ON ar.code = d.agc AND d.agc <> ''
  LEFT JOIN federation_ref fr ON fr.code = d.federation AND d.federation <> ''
  LEFT JOIN excluded_dossiers ex ON ex.dossier_code = d.dossier
  WHERE ex.dossier_code IS NULL
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
