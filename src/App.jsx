import { useEffect, useState } from 'react'
import AppHeader from './components/layout/AppHeader.jsx'
import ConsultationPage from './components/consultation/ConsultationPage.jsx'
import ImportPage from './components/import/ImportPage.jsx'

/** Routage minimal par pathname — 2 pages seulement, pas de dépendance react-router. */
function useRoute() {
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])
  return path
}

export function App() {
  const path = useRoute()

  return (
    <>
      <AppHeader />
      {path === '/import' ? <ImportPage /> : <ConsultationPage />}
    </>
  )
}

export default App
