import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const COLOR_OUI = '#31B700'
const COLOR_RESTE = '#E53935'

function pct(part, total) {
  return total === 0 ? 0 : Math.round((part / total) * 100)
}

/** Camembert binaire Oui / (Non + vide) pour une colonne de statut. */
export function StatusPieChart({ title, distribution }) {
  const { oui, reste, total } = distribution
  const data = [
    { name: 'Oui', value: oui, color: COLOR_OUI },
    { name: 'Non / non renseigné', value: reste, color: COLOR_RESTE },
  ]

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        minWidth: '260px',
      }}
    >
      <div style={{ fontSize: '14px', fontWeight: 700, color: '#1A202C' }}>{title}</div>

      {total === 0 ? (
        <div style={{ height: 180, display: 'flex', alignItems: 'center', color: '#718096', fontSize: '13px' }}>
          Aucune donnée
        </div>
      ) : (
        <>
          <div style={{ width: '100%', height: 180 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={1}>
                  {data.map(d => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} (${pct(value, total)} %)`, name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', width: '100%' }}>
            {data.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                <span style={{ color: '#1A202C' }}>{d.name}</span>
                <span style={{ marginLeft: 'auto', color: '#718096', fontVariantNumeric: 'tabular-nums' }}>
                  {d.value} · {pct(d.value, total)} %
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default StatusPieChart
