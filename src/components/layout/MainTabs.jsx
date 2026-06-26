import { useState } from 'react'
import ConsultationPage from '../consultation/ConsultationPage.jsx'
import StatisticsPage from '../stats/StatisticsPage.jsx'

const TABS = [
  { id: 'consultation', label: 'Consultation' },
  { id: 'statistiques', label: 'Statistiques' },
]

function tabStyle(active) {
  return {
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 600,
    color: active ? '#1A202C' : '#718096',
    background: 'none',
    border: 'none',
    borderBottom: active ? '2px solid #FF8200' : '2px solid transparent',
    marginBottom: '-1px',
    cursor: 'pointer',
  }
}

/** Bascule in-page entre la consultation (existant) et les statistiques (nouveau). */
export function MainTabs() {
  const [tab, setTab] = useState('consultation')

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E2E8F0' }}>
        {TABS.map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} style={tabStyle(tab === t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'consultation' ? <ConsultationPage /> : <StatisticsPage />}
    </div>
  )
}

export default MainTabs
