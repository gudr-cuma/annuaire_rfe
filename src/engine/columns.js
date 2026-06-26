// Clés alignées sur les champs renvoyés par GET /api/dossiers (snake_case, cf. requête SQL de migrations/0001_initial.sql)
export const COLUMNS = [
  { key: 'dossier', label: 'Dossier' },
  { key: 'siren', label: 'SIREN' },
  { key: 'nom', label: 'Nom', width: 368 },
  { key: 'annuaire', label: 'Annuaire', width: 100 },
  { key: 'plateforme', label: 'PA', width: 90 },
  { key: 'adresse_active', label: 'Adr. active', width: 110 },
  { key: 'departement', label: 'Département' },
  { key: 'cpostal', label: 'Code postal' },
  { key: 'ville', label: 'Ville' },
  { key: 'agc', label: 'AGC', refColumn: true },
  { key: 'nom_agc', label: 'Nom AGC', refColumn: true },
  { key: 'federation', label: 'Fédération', refColumn: true },
  { key: 'nom_federation', label: 'Nom Fédération', width: 320, refColumn: true },
  { key: 'un_gesdosno', label: 'N° gestion dossier' },
  { key: 'adresse_facturation', label: 'Adresse de facturation' },
  // Colonnes statut — affichées uniquement si authentifié
  { key: 'formulaire_rempli', label: 'Formulaire', statusColumn: true },
  { key: 'justificatifs_envoyes', label: 'Justificatifs', statusColumn: true },
  { key: 'commentaire', label: 'Commentaire', statusColumn: true },
]

export const GROUP_FIELDS = [
  { key: '', label: 'Aucun regroupement' },
  { key: 'agc', label: 'AGC', refColumn: true },
  { key: 'federation', label: 'Fédération', refColumn: true },
  { key: 'departement', label: 'Département' },
]

export const BOOL_COLUMNS = {
  annuaire: 1,
  plateforme: 1,
  adresse_active: 1,
  formulaire_rempli: 1,
  justificatifs_envoyes: 1,
}

export const EMPTY_FILTER = '__EMPTY__'

export function fieldLabel(key) {
  const f = GROUP_FIELDS.find(g => g.key === key)
  return f ? f.label : key
}
