import React, { useEffect, useState } from 'react'
import * as api from '../../components/admin/adminApi'

export default function ProductDetail({ store, productId }) {
  const [product, setProduct] = useState(null)
  const [storePage, setStorePage] = useState(null)
  const [activeImage, setActiveImage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    async function load(){
      try{
        const p = await api.getProduct(productId)
        if (!mounted) return
        if (!p || !p.ok) { setError(p && p.message ? p.message : 'Producto no encontrado'); setLoading(false); return }
        setProduct(p.product)
        if (store) {
          try {
            const sp = await fetch(`http://localhost/LinkTiendas/Link%20Tienda/backend/api/pages.php?slug=${encodeURIComponent(store)}`)
            if (sp.ok){ const dd = await sp.json(); setStorePage(dd.page || null) }
          } catch(e) {}
        }
      }catch(e){ setError('Error de red') }
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [store, productId])

  if (loading) return <div style={{ padding: 20 }}>Cargando...</div>
  if (error) return <div style={{ padding: 20, color: '#c55' }}>{error}</div>
  if (!product) return <div style={{ padding: 20 }}>Producto no encontrado</div>

  const resolvePublicUrl = (u) => {
    if (!u) return null
    if (/^https?:\/\//.test(u)) return u
    const base = 'http://localhost/LinkTiendas/Link%20Tienda'
    if (u.startsWith('/')) return base + u
    return base + '/' + u
  }

  const img = resolvePublicUrl(product.image_url) || (storePage && resolvePublicUrl(storePage.logo_url)) || 'http://localhost/LinkTiendas/Link%20Tienda/backend/uploads/placeholder.png'
  const price = product.on_sale && product.sale_price ? product.sale_price : product.price

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

  const storeRoot = store || (storePage && (storePage.slug || storePage.id))

  return (
    <div className="public-product-page" style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
      <header className="public-product-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <a href={`/${storeRoot || ''}`} style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
          {storePage && storePage.logo_url && <img src={resolvePublicUrl(storePage.logo_url)} alt="logo" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }} />}
          <div style={{ marginLeft: 8 }}>
            <h2 style={{ margin: 0 }}>{product.name}</h2>
            <div style={{ color: '#666' }}>{product.category || 'Sin categoría'}</div>
          </div>
        </a>
      </header>

      <main style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, marginTop: 16 }}>
        <div>
          {/* Gallery: use images_json array if present, otherwise fallback to image_url */}
          {(() => {
            const imgs = Array.isArray(product.images_json) && product.images_json.length > 0 ? product.images_json : (product.image_url ? [product.image_url] : [])
            const resolved = imgs.map(u => resolvePublicUrl(u))
            const main = resolved[activeImage] || resolved[0] || 'http://localhost/LinkTiendas/Link%20Tienda/backend/uploads/placeholder.png'
            return (
              <div className="public-gallery">
                <img src={main} alt={product.name} className="public-gallery-image" style={{ width: '100%', height: 420, objectFit: 'cover', borderRadius: 8 }} />
                {resolved.length > 1 && (
                  <div className="public-gallery-thumbs" style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    {resolved.map((s, i) => (
                      <img key={i} src={s} alt={`thumb-${i}`} className={`public-gallery-thumb ${i === activeImage ? 'active' : ''}`} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', border: i === activeImage ? '2px solid #2a9d8f' : '1px solid #eee' }} onClick={() => setActiveImage(i)} />
                    ))}
                  </div>
                )}
              </div>
            )
          })()}
          <div style={{ marginTop: 12 }}>
            <h3>Descripción</h3>
            <div className="public-description" style={{ color: '#333' }}>{product.description || 'Sin descripción disponible.'}</div>
          </div>
        </div>
        <aside className="public-product-aside" style={{ border: '1px solid #eee', padding: 12, borderRadius: 8 }}>
          <div className="public-product-price" style={{ fontSize: 18, fontWeight: 'bold' }}>{formatPrice(price)}</div>
          {product.on_sale && product.sale_price ? <div style={{ color: '#c55' }}>Oferta: {formatPrice(product.sale_price)}</div> : null}
          <div style={{ marginTop: 12 }}>
            <a href={storePage && storePage.contact_info && storePage.contact_info.whatsapp ? `https://wa.me/${storePage.contact_info.whatsapp}?text=${encodeURIComponent('Quiero comprar: ' + product.name)}` : '#'}>
              <button style={{ width: '100%', padding: '10px 12px', background: '#2a9d8f', color: '#fff', borderRadius: 6, border: 'none' }}>Comprar / WhatsApp</button>
            </a>
          </div>
        </aside>
      </main>
    </div>
  )
}
