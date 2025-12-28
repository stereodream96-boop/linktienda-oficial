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

  const visiblePages = (pages || []).filter(p => !(p.title && /^\d+$/.test(String(p.title))))

  return (
    <div style={{ padding: 0 }}>
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
