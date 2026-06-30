import { json, error, methodNotAllowed, forbidden, notFound } from '../../_lib/responses.js'
import { upsertDossierStatus } from '../../_lib/db.js'

export async function onRequest(context) {
  const { request, env, params } = context
  if (request.method !== 'PATCH') return methodNotAllowed()

  const dossierCode = params.dossier_code
  if (!dossierCode) return error('Code dossier requis.', 400)

  let body
  try { body = await request.json() } catch { return error('Corps JSON invalide.', 400) }

  const { user, userDepartments } = context.data

  // Vérification droits département (admin : accès total)
  if (user.role !== 'admin') {
    const dossier = await env.DB
      .prepare('SELECT departement FROM dossiers WHERE dossier = ? LIMIT 1')
      .bind(dossierCode)
      .first()
    if (!dossier) return notFound('Dossier introuvable.')
    if (!userDepartments.includes(dossier.departement)) return forbidden()
  }

  const mandatSigne =
    typeof body.mandat_signe === 'boolean' ? (body.mandat_signe ? 1 : 0) : null
  const formulaireRempli =
    typeof body.formulaire_rempli === 'boolean' ? (body.formulaire_rempli ? 1 : 0) : null
  const justificatifsEnvoyes =
    typeof body.justificatifs_envoyes === 'boolean' ? (body.justificatifs_envoyes ? 1 : 0) : null
  const commentaire =
    typeof body.commentaire === 'string' ? body.commentaire : null

  if (mandatSigne === null && formulaireRempli === null && justificatifsEnvoyes === null && commentaire === null) {
    return error('Au moins un champ requis : mandat_signe, formulaire_rempli, justificatifs_envoyes ou commentaire.', 400)
  }

  await upsertDossierStatus(env.DB, {
    dossierCode,
    mandatSigne,
    formulaireRempli,
    justificatifsEnvoyes,
    commentaire,
    updatedBy: user.id,
  })

  return json({ ok: true })
}
