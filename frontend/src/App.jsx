import React, { useEffect, useState } from 'react'
import Admin from './Admin'
import PageViewer from './PageViewer'

export default function App() {
  // Detectar si la URL tiene un `slug` para visualizar una página pública.
  const [pages, setPages] = useState([])
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const viewingSlug = searchParams ? searchParams.get('slug') : null

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('http://localhost/LinkTiendas/Link%20Tienda/backend/api/pages.php')
        if (!res.ok) return
        const data = await res.json()
        setPages(data.pages || [])
      } catch (e) {
        // ignore
      }
    }
    load()
  }, [])

  return (
    <div style={{ padding: 20 }}>
      <header style={{ marginBottom: 16 }}>
        {pages && pages.length > 0 ? (
          <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {pages.map((p) => (
              <a
                key={p.id}
                href={`?slug=${encodeURIComponent(p.slug)}`}
                style={{ padding: '6px 10px', background: '#f0f0f0', borderRadius: 4, textDecoration: 'none', color: '#111' }}
              >
                {p.title}
              </a>
            ))}
          </nav>
        ) : (
          <div style={{ color: '#666' }}>No hay páginas creadas todavía.</div>
        )}
      </header>
      <main>
        {/* Modo público: si `?slug=...` está presente mostramos SOLO la página pública. */}
        {viewingSlug ? (
          <PageViewer slug={viewingSlug} />
        ) : (
          /* Modo admin: mostrar exclusivamente el panel de administración (sin PageViewer) */
          <Admin />
        )}
      </main>
    </div>
  )
}
