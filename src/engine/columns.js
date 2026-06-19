// Clés alignées sur les champs renvoyés par GET /api/dossiers (snake_case, cf. requête SQL de migrations/0001_initial.sql)
export const COLUMNS = [
  { key: 'siren', label: 'SIREN' },
  { key: 'nom', label: 'Nom' },
  { key: 'departement', label: 'Département' },
  { key: 'cpostal', label: 'Code postal' },
  { key: 'ville', label: 'Ville' },
  { key: 'agc', label: 'AGC' },
  { key: 'federation', label: 'Fédération' },
  { key: 'un_gesdosno', label: 'N° gestion dossier' },
  { key: 'dossier', label: 'Dossier' },
  { key: 'annuaire', label: 'Annuaire fact. électronique' },
  { key: 'plateforme', label: 'Plateforme agréée rattachée' },
  { key: 'adresse_facturation', label: 'Adresse de facturation' },
  { key: 'adresse_active', label: 'Adresse fact. active' },
]

export const GROUP_FIELDS = [
  { key: '', label: 'Aucun regroupement' },
  { key: 'agc', label: 'AGC' },
  { key: 'federation', label: 'Fédération' },
  { key: 'departement', label: 'Département' },
]

export const BOOL_COLUMNS = { annuaire: 1, plateforme: 1, adresse_active: 1 }

export const EMPTY_FILTER = '__EMPTY__'

export function fieldLabel(key) {
  const f = GROUP_FIELDS.find(g => g.key === key)
  return f ? f.label : key
}
