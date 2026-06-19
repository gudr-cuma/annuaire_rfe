export function AppHeader() {
  return (
    <header
      style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <a href="/" style={{ textDecoration: 'none' }}>
        <span style={{ fontSize: '18px', fontWeight: 800, color: '#31B700', letterSpacing: '-0.5px' }}>
          Annuaire RFE
        </span>
        <span style={{ fontSize: '13px', color: '#718096', marginLeft: '10px' }}>
          Fusion Dossiers / Facturation
        </span>
      </a>
      <a
        href="/import"
        style={{
          fontSize: '13px',
          color: '#718096',
          textDecoration: 'none',
          border: '1px solid #E2E8F0',
          borderRadius: '6px',
          padding: '6px 12px',
        }}
      >
        Import
      </a>
    </header>
  )
}

export default AppHeader
