import React, { useEffect, useState } from 'react'
import * as api from './adminApi'

export default function AdminHome(){
  const [pages, setPages] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(()=>{ let mounted = true; (async ()=>{
    try{
      setLoading(true)
      const data = await api.getPages()
      if (!mounted) return
      setPages(Array.isArray(data.pages) ? data.pages : [])
    }catch(e){ if (mounted) setError('Error cargando páginas') }
    finally{ if (mounted) setLoading(false) }
  })(); return ()=>{ mounted = false } }, [])

  const filtered = (pages || []).filter(p => !q || (p.title||'').toLowerCase().includes(q.toLowerCase()))

  return (
    <section style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <input placeholder="Buscar por título..." value={q} onChange={e=>setQ(e.target.value)} style={{ padding: 8, flex: 1 }} />
        <div style={{ marginLeft: 12, color: '#333' }}>{loading ? 'Cargando...' : `${filtered.length} resultados`}</div>
      </div>

      {error ? <div style={{ color: '#c55' }}>{error}</div> : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {filtered.map(p => (
          <div key={p.id} style={{ border: '1px solid #eee', padding: 12, borderRadius: 8, background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontWeight: 'bold' }}>{p.title || '(sin título)'}</div>
              <div style={{ color: '#666', fontSize: 12 }}>{p.slug || p.id}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href={`/${p.slug || p.id}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                <button style={{ padding: '8px 10px', background: '#2a9d8f', color: '#fff', border: 'none', borderRadius: 6 }}>Abrir pública</button>
              </a>
              <button onClick={()=>{ window.location.hash = '#modificar-contenido'; setTimeout(()=>{ const el = document.querySelector(`[data-page-id="${p.id}"]`); if(el) el.click() }, 100) }} style={{ padding: '8px 10px', border: '1px solid #ddd', background: '#fff', borderRadius: 6 }}>Editar</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
