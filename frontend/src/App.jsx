import React, { useEffect, useState } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import Admin from './Admin'
import PageViewer from './PageViewer'
import ProductDetail from './components/public/ProductDetail'
import ServiceDetail from './components/public/ServiceDetail'
import { useParams } from 'react-router-dom'

export default function App(){
  const [pages, setPages] = useState([])

  useEffect(()=>{
    async function load(){
      try{ const res = await fetch('http://localhost/LinkTiendas/Link%20Tienda/backend/api/pages.php'); if(!res.ok) return; const data = await res.json(); setPages(data.pages || []) }catch(e){}
    }
    load()
  },[])

  return (
    <div style={{ padding: 20 }}>
      <header style={{ marginBottom: 16 }}>
        {pages && pages.length > 0 ? (
          <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {pages.map(p => (
              <Link key={p.id} to={`/${p.slug}`} style={{ padding: '6px 10px', background: '#f0f0f0', borderRadius: 4, textDecoration: 'none', color: '#111' }}>{p.title}</Link>
            ))}
          </nav>
        ) : (
          <div style={{ color: '#666' }}>No hay páginas creadas todavía.</div>
        )}
      </header>

      <main>
        <Routes>
          <Route path="/admin/*" element={<Admin/>} />
          <Route path="/:storeSlug/service/:serviceId" element={<ServiceDetailWrapper/>} />
          <Route path="/:storeSlug/product/:productId" element={<ProductDetailWrapper/>} />
          <Route path="/:storeSlug" element={<PageViewerWrapper/>} />
          <Route path="/" element={<div>Landing — seleccione una tienda</div>} />
        </Routes>
      </main>
    </div>
  )
}

function PageViewerWrapper(){
  const { storeSlug } = useParams()
  return <PageViewer slug={storeSlug} />
}

function ProductDetailWrapper(){
  const { storeSlug, productId } = useParams()
  return <ProductDetail store={storeSlug} productId={productId} />
}

function ServiceDetailWrapper(){
  const { storeSlug, serviceId } = useParams()
  return <ServiceDetail store={storeSlug} serviceId={serviceId} />
}
