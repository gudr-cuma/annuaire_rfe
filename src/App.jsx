import { useEffect, useState } from 'react'
import AppHeader from './components/layout/AppHeader.jsx'
import MainTabs from './components/layout/MainTabs.jsx'
import ImportPage from './components/import/ImportPage.jsx'
import AdminPage from './components/admin/AdminPage.jsx'
import useImportAuthStore from './store/useImportAuthStore.js'
import useAuthStore from './store/useAuthStore.js'

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
  const initImportAuth = useImportAuthStore(s => s.init)
  const initAuth = useAuthStore(s => s.init)
  const user = useAuthStore(s => s.user)

  useEffect(() => {
    initImportAuth()
    initAuth()
  }, [initImportAuth, initAuth])

  if (path === '/import') return <><AppHeader /><ImportPage /></>
  if (path === '/admin') {
    if (user && user.role === 'admin') return <><AppHeader /><AdminPage /></>
    return (
      <>
        <AppHeader />
        <div style={{ padding: '48px', textAlign: 'center', color: '#718096' }}>
          Accès réservé aux administrateurs.
        </div>
      </>
    )
  }

  return <><AppHeader /><MainTabs /></>
}

export default App
