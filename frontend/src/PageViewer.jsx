import React, { useEffect, useState } from 'react'

export default function PageViewer({ slug = null }) {
  const [page, setPage] = useState(null)
  const [products, setProducts] = useState([])
  const [imgIndex, setImgIndex] = useState(0)

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

    async function loadProducts() {
      try {
        const res = await fetch('http://localhost/LinkTiendas/Link%20Tienda/backend/api/products.php')
        if (!res.ok) return
        const data = await res.json()
        setProducts(data.products || [])
      } catch (e) {
        // ignore
      }
    }

    load()
    loadProducts()
  }, [slug])

  if (!page) return <div style={{ padding: 20 }}>Cargando contenido...</div>

  const imgs = Array.isArray(page.images) ? page.images : []
  const cats = Array.isArray(page.categories) ? page.categories : []
  const contact = page.contact_info || {}

  const filteredProducts = products

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

      {/* Section type and products (simple lista) */}
      <section style={{ marginBottom: 20 }}>
        <h3>{page.section_type || 'Sección'}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
          {filteredProducts.map((p) => (
            <div key={p.id} style={{ border: '1px solid #eee', padding: 8, borderRadius: 6 }}>
              <div style={{ fontWeight: 'bold' }}>{p.name}</div>
              <div style={{ color: '#666' }}>${p.price}</div>
            </div>
          ))}
          {filteredProducts.length === 0 && <div style={{ color: '#666' }}>No hay productos para mostrar.</div>}
        </div>
      </section>

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
