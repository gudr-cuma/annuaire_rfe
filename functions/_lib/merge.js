/**
 * merge.js — Duplication contrôlée de src/engine/merge.js pour l'environnement Functions.
 * Garder en synchro avec src/engine/merge.js si modifié.
 */
export function computeDepartement(cpostal) {
  const cp = (cpostal || '').trim()
  return /^\d{2}/.test(cp) ? cp.slice(0, 2) : 'N/D'
}
