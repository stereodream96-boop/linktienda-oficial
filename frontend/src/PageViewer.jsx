import React, { useEffect, useState } from 'react'
import * as api from './components/admin/adminApi'
import { Link } from 'react-router-dom'

export default function PageViewer({ slug = null }) {
  // PageViewer ahora solo maneja la home pública de la tienda: /:storeSlug
  // `slug` viene desde el wrapper de rutas en App.jsx
  const [page, setPage] = useState(null)
  const [imgIndex, setImgIndex] = useState(0)
  const [sections, setSections] = useState([])
  const [sectionProducts, setSectionProducts] = useState({})
  const [sectionLoading, setSectionLoading] = useState({})
  const [sectionError, setSectionError] = useState({})
  const [services, setServices] = useState([])
  // Nota: este componente puede operar en dos modos:
  // - Modo público (si se le pasa `slug` o la query ?slug=...): carga UNA página y muestra sólo su contenido
  // - Modo administrador/preview (sin slug): podría listar páginas o mostrar la primera; aquí preferimos cargar la lista

  useEffect(() => {
    async function load() {
      try {
        if (slug) {
          // Cargar página individual vía API: `/api/pages.php?slug=...` -> devuelve { page: {...} }
          const res = await fetch('http://localhost/LinkTiendas/Link%20Tienda/backend/api/pages.php?slug=' + encodeURIComponent(slug))
          if (!res.ok) {
            // no encontrada
            setPage(null)
            return
          }
          const data = await res.json()
          setPage(data.page || null)
        } else {
          // Sin slug: cargar lista y tomar la primera (modo no público)
          const res = await fetch('http://localhost/LinkTiendas/Link%20Tienda/backend/api/pages.php')
          if (!res.ok) return
          const data = await res.json()
          setPage((data.pages && data.pages[0]) || null)
        }
      } catch (e) {
        // ignore
      }
    }

    load()
  }, [slug])

  // when page loads, parse sections and possibly fetch services
  useEffect(() => {
    if (!page) return
    // parse sections_json robustly
    let secs = []
    if (page.sections_json) {
      if (typeof page.sections_json === 'string') {
        try { secs = JSON.parse(page.sections_json) } catch (e) { secs = [] }
      } else if (Array.isArray(page.sections_json)) secs = page.sections_json
    }
    setSections(secs || [])

    // if page is service type, fetch services
    if (page.page_type && page.page_type.toLowerCase().includes('serv')) {
      (async () => {
        try {
          const data = await api.getServices(page.id)
          if (data && data.ok) setServices(data.services || [])
        } catch (e) { /* ignore */ }
      })()
    }
  }, [page])

  // fetch products for sections (cached)
  useEffect(() => {
    if (!page || !page.id) return
    if (!sections || sections.length === 0) return
    sections.forEach((sec, idx) => {
      const key = idx
      if (sectionProducts[key] && Array.isArray(sectionProducts[key])) return // cached
      // determine fetch URL
      let url = `http://localhost/LinkTiendas/Link%20Tienda/backend/api/inventory.php?page_id=${page.id}`
      // section may be object { value: 'Hogar' } or string
      const val = (typeof sec === 'string') ? sec : (sec.value || '')
      const vLower = (val || '').toLowerCase()
      if (vLower.includes('oferta') || vLower.includes('ofertas') || vLower.includes('destac')) {
        url += '&filter=offers'
      } else if (vLower.startsWith('category:')) {
        const cat = val.split(':').slice(1).join(':').trim()
        url += `&filter=category&category=${encodeURIComponent(cat)}`
      } else {
        // treat as category by default if matches one of page.categories
        const cats = Array.isArray(page.categories) ? page.categories : []
        if (cats.includes(val)) {
          url += `&filter=category&category=${encodeURIComponent(val)}`
        } else {
          // fallback: try category filter anyway
          url += `&filter=category&category=${encodeURIComponent(val)}`
        }
      }

      // fetch
      setSectionLoading(s => ({ ...s, [key]: true }))
      fetch(url).then(r => r.json()).then(data => {
        if (data && data.ok) {
          setSectionProducts(sp => ({ ...sp, [key]: data.products || [] }))
          setSectionError(se => ({ ...se, [key]: null }))
        } else {
          setSectionProducts(sp => ({ ...sp, [key]: [] }))
          setSectionError(se => ({ ...se, [key]: data && data.message ? data.message : 'Error cargando productos' }))
        }
      }).catch(err => {
        setSectionProducts(sp => ({ ...sp, [key]: [] }))
        setSectionError(se => ({ ...se, [key]: 'Error de red' }))
      }).finally(() => setSectionLoading(s => ({ ...s, [key]: false })))
    })
  }, [sections, page])

  if (!page) return <div style={{ padding: 20 }}>Cargando contenido...</div>

  const imgs = Array.isArray(page.images) ? page.images : []
  const cats = Array.isArray(page.categories) ? page.categories : []
  const contact = page.contact_info || {}

  function prevImg() {
    setImgIndex((i) => (i - 1 + imgs.length) % imgs.length)
  }
  function nextImg() {
    setImgIndex((i) => (i + 1) % imgs.length)
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 20 }}>
      {/* Header: title and promo */}
      <header>
        <h1 style={{ marginBottom: 6 }}>{page.title}</h1>
        {page.promo_message && (
          <div style={{ background: '#ffeedd', padding: 10, borderRadius: 6, marginBottom: 12 }}>
            <strong>{page.promo_message}</strong>
          </div>
        )}
      </header>

      {/* Carousel */}
      {imgs && imgs.length > 0 && (
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <img src={imgs[imgIndex]} alt="hero" style={{ width: '100%', height: 300, objectFit: 'cover', borderRadius: 6 }} />
          <button onClick={prevImg} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>{'‹'}</button>
          <button onClick={nextImg} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>{'›'}</button>
        </div>
      )}

      {/* Categories */}
      <div style={{ marginBottom: 12 }}>
        {cats.length > 0 ? (
          cats.map((c, i) => (
            <button
              key={i}
              onClick={() => {}}
              style={{ marginRight: 8, marginBottom: 8, padding: '6px 10px', background: '#f5f5f5' }}
            >
              {c}
            </button>
          ))
        ) : (
          <div style={{ color: '#666' }}>Sin categorías</div>
        )}
      </div>

      {/* Sections dinámicas */}
      {page.page_type && page.page_type.toLowerCase().includes('serv') ? (
        <section style={{ marginBottom: 20 }}>
          <h3>Página de servicios</h3>
          {services.length === 0 ? <div>No hay servicios publicados.</div> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
              {services.map(s => {
                const to = `/${page.slug || page.id}/service/${s.id}`
                return (
                  <Link key={s.id} to={to} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ border: '1px solid #eee', padding: 8, borderRadius: 6 }}>
                      <div style={{ fontWeight: 'bold' }}>{s.name}</div>
                      <div style={{ color: '#666' }}>{s.duration_minutes} min - ${s.price}</div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      ) : (
        sections.map((sec, idx) => {
          const key = idx
          const val = (typeof sec === 'string') ? sec : (sec.value || '')
          const title = sec.title || val || `Sección ${idx+1}`
          const items = sectionProducts[key] || []
          const loading = !!sectionLoading[key]
          const error = sectionError[key]
          return (
            <section key={key} style={{ marginBottom: 20 }}>
              <h3>{title}</h3>
              {loading ? <div>Cargando productos...</div> : error ? <div style={{ color: '#c55' }}>Error cargando productos</div> : (
                items.length === 0 ? <div style={{ color: '#666' }}>No hay productos para mostrar.</div> : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
                    {items.map(p => {
                      const to = `/${page.slug || page.id}/product/${p.id}`
                      return (
                        <Link key={p.id} to={to} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                          <div style={{ border: '1px solid #eee', padding: 8, borderRadius: 6 }}>
                            <div style={{ fontWeight: 'bold' }}>{p.name}</div>
                            <div style={{ color: '#666' }}>
                              {p.on_sale && p.sale_price ? (
                                <span><span style={{ textDecoration: 'line-through', marginRight: 6 }}>${p.price}</span><strong>${p.sale_price}</strong></span>
                              ) : (<span>${p.price}</span>)}
                            </div>
                            <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
                              {p.on_sale ? <span style={{ marginRight: 8, color: '#c55' }}>Oferta</span> : null}
                              {p.featured ? <span style={{ marginRight: 8, color: '#2a9d8f' }}>Destacado</span> : null}
                              {p.category ? <span style={{ marginRight: 8 }}>{p.category}</span> : null}
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )
              )}
            </section>
          )
        })
      )}

      {/* Content */}
      <article style={{ marginBottom: 30 }} dangerouslySetInnerHTML={{ __html: page.content }} />

      {/* Footer contact info */}
      <footer style={{ borderTop: '1px solid #eee', paddingTop: 12 }}>
        <div style={{ fontWeight: 'bold' }}>{contact.store_name || ''}</div>
        <div style={{ marginTop: 6 }}>
          {contact.whatsapp && <div>WhatsApp: <a href={`https://wa.me/${contact.whatsapp}`}>{contact.whatsapp}</a></div>}
          {contact.address && <div>Dirección: {contact.address}</div>}
          {contact.instagram && <div>Instagram: <a href={`https://instagram.com/${contact.instagram.replace(/^@/, '')}`}>{contact.instagram}</a></div>}
        </div>
      </footer>
    </div>
  )
}
