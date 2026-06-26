import { json, error, methodNotAllowed } from '../../_lib/responses.js'

// Jointure gauche dossiers ⟕ facturation par SIREN, "première occurrence" = MIN(id)
// + jointure référentiels agc_ref/federation_ref (code invalide masqué, pas la ligne)
// + exclusion des dossiers marqués dans excluded_dossiers

export function buildQuery({ withStatus = false, withRef = false, departements = [] }) {
  const refCols = withRef ? `
         CASE WHEN d.federation <> '' AND fr.code IS NULL THEN '' ELSE d.federation END AS federation,
         CASE WHEN d.federation <> '' AND fr.code IS NOT NULL THEN fr.nom ELSE '' END AS nom_federation,
         CASE WHEN d.agc <> '' AND ar.code IS NULL THEN '' ELSE d.agc END AS agc,
         CASE WHEN d.agc <> '' AND ar.code IS NOT NULL THEN ar.nom ELSE '' END AS nom_agc,` : ''

  const statusCols = withStatus ? `
    , COALESCE(ds.formulaire_rempli, 0)     AS formulaire_rempli
    , COALESCE(ds.justificatifs_envoyes, 0) AS justificatifs_envoyes
    , COALESCE(ds.commentaire, '')          AS commentaire` : ''

  const statusJoin = withStatus
    ? 'LEFT JOIN dossier_status ds ON ds.dossier_code = d.dossier'
    : ''

  const deptWhere = departements.length > 0
    ? `AND d.departement IN (${departements.map(() => '?').join(', ')})`
    : ''

  return `
  WITH fact_first AS (
    SELECT f1.* FROM facturation f1
    WHERE f1.id = (SELECT MIN(f2.id) FROM facturation f2 WHERE f2.siren = f1.siren)
  )
  SELECT d.siren, d.nom, d.cpostal, d.departement, d.ville,
         d.un_gesdosno, d.dossier,
         ${refCols}
         f.annuaire, f.plateforme, f.adresse_facturation, f.adresse_active
         ${statusCols}
  FROM dossiers d
  LEFT JOIN fact_first f ON f.siren = d.siren
  LEFT JOIN agc_ref ar ON ar.code = d.agc AND d.agc <> ''
  LEFT JOIN federation_ref fr ON fr.code = d.federation AND d.federation <> ''
  LEFT JOIN excluded_dossiers ex ON ex.dossier_code = d.dossier
  ${statusJoin}
  WHERE ex.dossier_code IS NULL ${deptWhere}
  ORDER BY d.nom COLLATE NOCASE
  `
}

export async function onRequest(context) {
  const { request, env } = context
  if (request.method !== 'GET') return methodNotAllowed()

  const user = context.data?.user
  const depts = context.data?.userDepartments ?? [] // injecté par functions/api/_middleware.js
  const filterDepts = user && user.role !== 'admin' && depts.length > 0 ? depts : []

  const authenticated = !!user
  const cacheControl = authenticated ? 'private, no-store' : 'public, max-age=60'

  try {
    const sql = buildQuery({ withStatus: authenticated, withRef: authenticated, departements: filterDepts })
    const stmt = filterDepts.length > 0
      ? env.DB.prepare(sql).bind(...filterDepts)
      : env.DB.prepare(sql)
    const result = await stmt.all()
    return json(
      { rows: result.results, count: result.results.length },
      200,
      { 'Cache-Control': cacheControl }
    )
  } catch (err) {
    return error('Erreur de lecture des données : ' + err.message, 500)
  }
}
