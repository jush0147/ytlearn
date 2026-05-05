import { useEffect, useState } from 'react'
import { HomePage } from './pages/HomePage'
import { WatchPage } from './pages/WatchPage'
import { SettingsPage } from './pages/SettingsPage'

function getRoute() {
  const hash = window.location.hash || '#/'
  const [path, query = ''] = hash.replace(/^#/, '').split('?')
  return { path: path || '/', query: new URLSearchParams(query) }
}

export default function App() {
  const [route, setRoute] = useState(getRoute())

  useEffect(() => {
    const handler = () => setRoute(getRoute())
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  if (route.path === '/settings') return <SettingsPage />
  if (route.path === '/watch') return <WatchPage videoId={route.query.get('v') ?? ''} />
  return <HomePage />
}
