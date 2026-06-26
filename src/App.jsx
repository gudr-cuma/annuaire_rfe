import { useEffect, useState } from 'react'
import AppHeader from './components/layout/AppHeader.jsx'
import MainTabs from './components/layout/MainTabs.jsx'
import ImportPage from './components/import/ImportPage.jsx'
import useImportAuthStore from './store/useImportAuthStore.js'

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
  const initAuth = useImportAuthStore(s => s.init)

  useEffect(() => { initAuth() }, [initAuth])

  return (
    <>
      <AppHeader />
      {path === '/import' ? <ImportPage /> : <MainTabs />}
    </>
  )
}

export default App
