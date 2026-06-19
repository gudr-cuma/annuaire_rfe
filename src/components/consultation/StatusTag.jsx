const VARIANTS = {
  oui: { bg: '#E8F5E0', color: '#268E00', label: 'Oui' },
  non: { bg: '#FEF2F2', color: '#E53935', label: 'Non' },
  na:  { bg: '#F8FAFB', color: '#718096', label: '—' },
}

/** Portage direct de tagHtml() du prototype : Oui (vert) / Non (rouge) / vide (gris, "—") / autre valeur affichée telle quelle. */
export function StatusTag({ value }) {
  const normalized = (value || '').toString().trim().toLowerCase()
  let variant = null
  if (normalized === 'oui') variant = VARIANTS.oui
  else if (normalized === 'non') variant = VARIANTS.non
  else if (!normalized) variant = VARIANTS.na

  if (!variant) return <>{value}</>

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: '14px',
        fontSize: '12.5px',
        fontWeight: 600,
        backgroundColor: variant.bg,
        color: variant.color,
        whiteSpace: 'nowrap',
      }}
    >
      {variant.label}
    </span>
  )
}

export default StatusTag
