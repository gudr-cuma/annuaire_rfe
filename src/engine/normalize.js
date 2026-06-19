/** Normalisation accent-insensible et casse-insensible, pour recherche/filtres. */
export function normalize(s) {
  return (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}
