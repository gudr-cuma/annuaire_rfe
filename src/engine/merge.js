/**
 * Calcul du DEPARTEMENT — portage exact de fusion_dossiers_facturation.html.
 * Garder en synchro avec functions/_lib/merge.js si modifié.
 * (La fusion dossiers/facturation elle-même se fait désormais en SQL à la lecture, cf. migrations/0001_initial.sql.)
 */
export function computeDepartement(cpostal) {
  const cp = (cpostal || '').trim()
  return /^\d{2}/.test(cp) ? cp.slice(0, 2) : 'N/D'
}
