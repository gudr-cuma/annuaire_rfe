import { downloadCsv } from '../../engine/exportCsv.js'
import useAuthStore from '../../store/useAuthStore.js'

export function ExportCsvButton({ rows }) {
  const user = useAuthStore(s => s.user)
  return (
    <button
      type="button"
      onClick={() => downloadCsv(rows, `annuaire_rfe_${new Date().toISOString().slice(0, 10)}.csv`, user)}
      style={{
        padding: '7px 14px',
        borderRadius: '6px',
        border: '1px solid #31B700',
        background: '#FFFFFF',
        color: '#268E00',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      Exporter CSV ({rows.length})
    </button>
  )
}

export default ExportCsvButton
