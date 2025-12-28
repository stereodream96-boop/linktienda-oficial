import React, { useEffect, useState, useRef } from 'react'
import * as api from './components/admin/adminApi'
import { Link } from 'react-router-dom'
import StoreHeader from './components/public/StoreHeader'

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
  const [searchTerm, setSearchTerm] = useState('')
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

  function resolvePublicUrl(u){
    if (!u) return null
    if (/^https?:\/\//.test(u)) return u
    const base = 'http://localhost/LinkTiendas/Link%20Tienda'
    if (u.startsWith('/')) return base + u
    return base + '/' + u
  }

  function parseToIntPublic(v){
    if (v === undefined || v === null) return 0
    if (typeof v === 'number') return Math.round(v)
    const s = String(v).trim()
    if (!s) return 0
    const lastDot = s.lastIndexOf('.')
    const lastComma = s.lastIndexOf(',')
    const decPos = Math.max(lastDot, lastComma)
    if (decPos !== -1 && s.length - decPos - 1 <= 2) {
      let cleaned = ''
      for (let i = 0; i < s.length; i++) {
        const ch = s[i]
        if (i === decPos) cleaned += '.'
        else if (ch >= '0' && ch <= '9') cleaned += ch
      }
      const num = parseFloat(cleaned)
      return isNaN(num) ? 0 : Math.round(num)
    }
    const digits = s.replace(/\D/g,'')
    return digits ? parseInt(digits,10) : 0
  }

  function formatPrice(val){
    const n = parseToIntPublic(val)
    return '$' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

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

  const imgs = Array.isArray(page && page.images) ? page.images : []
  const catsRaw = Array.isArray(page && page.categories) ? page.categories : []
  const cats = catsRaw.map(c => (typeof c === 'string' ? c : (c && c.name ? c.name : ''))).filter(Boolean)
  const contact = (page && page.contact_info) || {}

  // carousel mechanics: duplicate first slide to enable forward-only loop
  const trackRef = useRef(null)
  const [trackTransitionEnabled, setTrackTransitionEnabled] = useState(true)

  useEffect(() => {
    // reset when imgs change
    setImgIndex(0)
    setTrackTransitionEnabled(true)
  }, [imgs])

  // autoplay: advance every ~5s; allow reaching the duplicated final slide (index === imgs.length)
  useEffect(() => {
    if (!imgs || imgs.length <= 1) return
    const t = setInterval(() => {
      setImgIndex(i => {
        if (i >= imgs.length) return i
        return i + 1
      })
    }, 5000)
    return () => clearInterval(t)
  }, [imgs])

  // when transition ends on the duplicated slide, jump to the real first slide without transition
  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    function onTransitionEnd() {
      if (imgIndex === imgs.length) {
        setTrackTransitionEnabled(false)
        setImgIndex(0)
        // re-enable transition on next frame
        requestAnimationFrame(() => requestAnimationFrame(() => setTrackTransitionEnabled(true)))
      }
    }
    el.addEventListener('transitionend', onTransitionEnd)
    return () => el.removeEventListener('transitionend', onTransitionEnd)
  }, [imgIndex, imgs])

  if (!page) return <div style={{ padding: 20 }}>Cargando contenido...</div>

  return (
    <div style={{ ['--promo-height']: '24px' }}>
      {/* Promo banner (discrete) placed above header */}
      {page && page.promo_message ? (
        <div className="public-promo-banner" role="region" aria-label="Mensaje promocional" style={{ marginBottom: 0 }}>
          <div className="public-promo-inner">{page.promo_message}</div>
        </div>
      ) : null}

      {/* Header: header now outside the public container */}
      <header>
        <StoreHeader page={page} storeSlug={slug} onSearch={setSearchTerm} />
      </header>

      {/* Hero / cover: prefer page.images (hero) first, otherwise use cover_url */}
      {imgs && imgs.length > 0 ? (
        <div className="public-hero" style={{ position: 'relative', marginTop: 0, marginBottom: 12 }}>
          <div
            ref={trackRef}
            className="public-hero-track"
            style={{
              transform: `translateX(-${imgIndex * 100}%)`,
              transition: trackTransitionEnabled ? 'transform 600ms ease' : 'none'
            }}
          >
            {/* render slides + duplicate first slide at end for seamless forward loop */}
            {imgs.map((u, i) => (
              <div key={i} className="public-hero-slide" role="img" aria-label={page && page.title ? `${page.title} - hero ${i+1}` : `Hero image ${i+1}`} style={{ backgroundImage: `url(${resolvePublicUrl(u)})` }} />
            ))}
            {imgs.length > 1 ? (
              <div key="dup" className="public-hero-slide" role="img" aria-hidden style={{ backgroundImage: `url(${resolvePublicUrl(imgs[0])})` }} />
            ) : null}
          </div>
        </div>
      ) : (page.cover_url ? (
        <div className="public-hero" style={{ position: 'relative', marginTop: 0, marginBottom: 12 }}>
          <div className="public-hero-bg" role="img" aria-label={page && page.title ? `${page.title} - cover` : 'Cover image'} style={{ backgroundImage: `url(${resolvePublicUrl(page.cover_url)})`, height: 280 }} />
        </div>
      ) : null)}

      <div className="public-container public-page">
     

        {/* Categories */}
        <div className="public-categories" style={{ marginBottom: 12 }}>
        {catsRaw && catsRaw.length > 0 ? (
          <div className="public-categories-list" style={{ display: 'flex', gap: 16, flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 8 }}>
            {catsRaw.map((c, i) => {
              const name = (typeof c === 'string') ? c : (c && c.name ? c.name : '')
              const img = (typeof c === 'object' && c && c.image_url) ? resolvePublicUrl(c.image_url) : null
              return (
                <button key={i} className="public-category-chip" onClick={() => {}} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}>
                  <div className="public-category-avatar-wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {img ? (
                      <img src={img} alt={name} className="public-category-avatar" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }} />
                    ) : (
                      <div className="public-category-avatar placeholder" style={{ width: 72, height: 72, borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>{(name && name.substr(0,1)) || '?'}</div>
                    )}
                    <div className="public-category-label" style={{ marginTop: 8, fontSize: 12, textAlign: 'center', whiteSpace: 'nowrap' }}>{name}</div>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div style={{ color: '#666' }}>Sin categorías</div>
        )}
      </div>

      {/* Sections dinámicas */}
      {page.page_type && page.page_type.toLowerCase().includes('serv') ? (
        <section className="public-section" data-section="services" style={{ marginBottom: 20 }}>
          <h3>Página de servicios</h3>
          {services.length === 0 ? <div>No hay servicios publicados.</div> : (
            <div className="card-grid services-grid public-section-grid">
                  {services.filter(s => {
                if (!searchTerm) return true
                const q = searchTerm.toLowerCase()
                return (s.name && s.name.toLowerCase().includes(q)) || (s.description && s.description.toLowerCase().includes(q))
              }).map(s => {
                const to = `/${page.slug || page.id}/service/${s.id}`
                return (
                  <Link key={s.id} to={to} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div className="card public-card public-service-card">
                      <div className="card-title">{s.name}</div>
                      <div className="card-meta">{s.duration_minutes} min - {formatPrice(s.price)}</div>
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
            <section key={key} className="public-section" data-section={val} style={{ marginBottom: 20 }}>
              <h3>{title}</h3>
              {loading ? <div>Cargando productos...</div> : error ? <div style={{ color: '#c55' }}>Error cargando productos</div> : (
                items.length === 0 ? <div style={{ color: '#666' }}>No hay productos para mostrar.</div> : (
                  <div className="card-grid public-section-grid">
                    {items.filter(p => {
                      if (!searchTerm) return true
                      const q = searchTerm.toLowerCase()
                      return (p.name && p.name.toLowerCase().includes(q)) || (p.category && p.category.toLowerCase().includes(q))
                    }).map(p => {
                      const to = `/${page.slug || page.id}/product/${p.id}`
                      return (
                        <Link key={p.id} to={to} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                          <div className="card public-card public-product-card">
                            <div className="card-title">{p.name}</div>
                            <div className="card-meta">{p.on_sale && p.sale_price ? (
                              <span><span style={{ textDecoration: 'line-through', marginRight: 6 }}>{formatPrice(p.price)}</span><strong>{formatPrice(p.sale_price)}</strong></span>
                            ) : (<span>{formatPrice(p.price)}</span>)}</div>
                            <div className="card-labels">
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
      <article className="public-content" style={{ marginBottom: 30 }} dangerouslySetInnerHTML={{ __html: page.content }} />

      {/* Footer contact info */}
      <footer className="public-footer" style={{ borderTop: '1px solid #eee', paddingTop: 12 }}>
        <div style={{ fontWeight: 'bold' }}>{contact.store_name || ''}</div>
        <div style={{ marginTop: 6 }}>
          {contact.whatsapp && <div>WhatsApp: <a href={`https://wa.me/${contact.whatsapp}`}>{contact.whatsapp}</a></div>}
          {contact.address && <div>Dirección: {contact.address}</div>}
          {contact.instagram && <div>Instagram: <a href={`https://instagram.com/${contact.instagram.replace(/^@/, '')}`}>{contact.instagram}</a></div>}
        </div>
      </footer>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="mobile-bottom-nav" role="navigation" aria-label="Navegación móvil">
        <a className="nav-item" href={`/${page && (page.slug || page.id) || ''}`}>
          <svg viewBox="0 0 24 24" aria-hidden><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
          <div className="nav-item-label">Inicio</div>
        </a>
        <a className="nav-item" href={`/${page && (page.slug || page.id) || ''}?search=1`}> 
          <svg viewBox="0 0 24 24" aria-hidden><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zM9.5 14C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
          <div className="nav-item-label">Buscar</div>
        </a>
        <div className="nav-cart-wrapper">
          <a className="nav-cart" href={`/${page && (page.slug || page.id) || ''}/cart`}>
            <svg viewBox="0 0 24 24" aria-hidden><path d="M7 4h-2l-1 2h2l3.6 7.59-1.35 2.44C8.52 16.37 8 17.16 8 18a2 2 0 104 0 2 2 0 104 0c0-.84-.52-1.63-1.25-2.96L20 6H6.21l-.94-2z"/></svg>
          </a>
        </div>
        <a className="nav-item" href={`/${page && (page.slug || page.id) || ''}/account`}>
          <svg viewBox="0 0 24 24" aria-hidden><path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z"/></svg>
          <div className="nav-item-label">Cuenta</div>
        </a>
        <a className="nav-item" href="#menu" onClick={(e)=>{ e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
          <svg viewBox="0 0 24 24" aria-hidden><path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"/></svg>
          <div className="nav-item-label">Menu</div>
        </a>
      </nav>
    </div>
  )
}
