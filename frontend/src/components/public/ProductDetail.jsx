import React, { useEffect, useState } from 'react'
import * as api from '../../components/admin/adminApi'

export default function ProductDetail({ store, productId }) {
  const [product, setProduct] = useState(null)
  const [storePage, setStorePage] = useState(null)
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

  const img = product.image_url || (storePage && storePage.logo_url) || '/backend/uploads/placeholder.png'
  const price = product.on_sale && product.sale_price ? product.sale_price : product.price

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {storePage && storePage.logo_url && <img src={storePage.logo_url} alt="logo" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }} />}
        <div>
          <h2 style={{ margin: 0 }}>{product.name}</h2>
          <div style={{ color: '#666' }}>{product.category || 'Sin categoría'}</div>
        </div>
      </header>

      <main style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, marginTop: 16 }}>
        <div>
          <img src={img} alt={product.name} style={{ width: '100%', height: 420, objectFit: 'cover', borderRadius: 8 }} />
          <div style={{ marginTop: 12 }}>
            <h3>Descripción</h3>
            <div style={{ color: '#333' }}>{product.description || 'Sin descripción disponible.'}</div>
          </div>
        </div>
        <aside style={{ border: '1px solid #eee', padding: 12, borderRadius: 8 }}>
          <div style={{ fontSize: 18, fontWeight: 'bold' }}>${price}</div>
          {product.on_sale && product.sale_price ? <div style={{ color: '#c55' }}>Oferta: ${product.sale_price}</div> : null}
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
