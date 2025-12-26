import React, { useMemo, useState, useEffect } from 'react'
import PagesCarousel from './PagesCarousel'
import './ModifyPages.css'

// Mock pages data
const mockPages = [
  { id: 1, title: 'Página A', content: '<p>Contenido A</p>', promo_message: 'Promo A', images: [], categories: ['cat1'], section_type: 'Ofertas', contact_info: { whatsapp: '549112233' }, slug: 'pagina-a' },
  { id: 2, title: 'Página B', content: '<p>Contenido B</p>', promo_message: 'Promo B', images: [], categories: ['cat2'], section_type: 'Ropa', contact_info: {}, slug: 'pagina-b' },
  { id: 3, title: 'Página C', content: '<p>Contenido C</p>', promo_message: '', images: [], categories: [], section_type: 'Hogar', contact_info: {}, slug: 'pagina-c' },
]

export default function ModifyPages() {
  const [pages, setPages] = useState(mockPages)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(null)
  const [msg, setMsg] = useState('')

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return pages
    return pages.filter(p => (p.title || '').toLowerCase().includes(s))
  }, [pages, search])

  useEffect(() => {
    if (selectedId == null) return
    const p = pages.find(x => x.id === selectedId)
    if (p) setForm({ ...p, categories: (p.categories || []).join(', '), images: Array.isArray(p.images) ? p.images : [] })
  }, [selectedId, pages])

  // Fetch pages from backend on mount
  useEffect(() => {
    fetchPages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchPages() {
    try {
      const res = await fetch('http://localhost/LinkTiendas/Link%20Tienda/backend/api/pages.php')
      if (!res.ok) return
      const data = await res.json()
      let serverPages = data.pages || []
      // normalize fields
      serverPages = serverPages.map(p => ({
        ...p,
        images: p.images ? (Array.isArray(p.images) ? p.images : tryParseJSON(p.images) || []) : [],
        categories: p.categories ? (Array.isArray(p.categories) ? p.categories : tryParseJSON(p.categories) || []) : [],
        contact_info: p.contact_info ? (typeof p.contact_info === 'object' ? p.contact_info : tryParseJSON(p.contact_info) || {}) : {},
      }))
      setPages(serverPages)
    } catch (e) {
      // keep mockPages if fetch fails
      console.error('Failed loading pages', e)
    }
  }

  function handleSelect(page) {
    setSelectedId(page.id)
    setMsg('')
  }

  function handleFormChange(k, v) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  async function uploadImagesLocal(files) {
    if (!files || files.length === 0) return []
    const fd = new FormData()
    Array.from(files).forEach((f, i) => fd.append('file' + i, f))
    try {
      const res = await fetch('http://localhost/LinkTiendas/Link%20Tienda/backend/api/upload_images.php', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      return data.uploaded || []
    } catch (e) {
      console.error('upload error', e)
      return []
    }
  }

  async function handleImageFiles(e) {
    const files = e.target.files
    const urls = await uploadImagesLocal(files)
    if (urls.length > 0) {
      setForm(prev => ({ ...prev, images: Array.isArray(prev.images) ? [...prev.images, ...urls] : urls }))
    }
  }

  function removeImage(idx) {
    setForm(prev => ({ ...prev, images: (prev.images || []).filter((_, i) => i !== idx) }))
  }

  async function saveMock() {
    if (!form) return

    // Build payload: include id and only fields that changed and are non-empty
    const original = pages.find(p => p.id === form.id) || {}
    const payload = { id: form.id }
    const allowed = ['title','content','promo_message','images','categories','section_type','contact_info','slug']

    for (const key of allowed) {
      const newVal = form[key]
      let origVal = original[key]
      // normalize categories (string in form -> array)
      if (key === 'categories') {
        const arr = typeof newVal === 'string' ? newVal.split(',').map(s=>s.trim()).filter(Boolean) : (Array.isArray(newVal) ? newVal : [])
        if (arr.length > 0) {
          // compare to original
          const origArr = Array.isArray(origVal) ? origVal : []
          if (JSON.stringify(arr) !== JSON.stringify(origArr)) payload[key] = arr
        }
        continue
      }

      if (key === 'images') {
        const imgs = Array.isArray(newVal) ? newVal : []
        if (imgs.length > 0) {
          const origImgs = Array.isArray(origVal) ? origVal : []
          if (JSON.stringify(imgs) !== JSON.stringify(origImgs)) payload[key] = imgs
        }
        continue
      }

      if (key === 'contact_info') {
        const info = typeof newVal === 'object' && newVal !== null ? newVal : (typeof newVal === 'string' && newVal.trim() ? tryParseJSON(newVal) : null)
        if (info && JSON.stringify(info) !== JSON.stringify(origVal || {})) payload[key] = info
        continue
      }

      // simple string fields
      if (typeof newVal === 'string') {
        if (newVal.trim() !== '' && newVal !== (origVal || '')) payload[key] = newVal
      } else if (newVal !== undefined && newVal !== null && newVal !== '') {
        // other non-empty values
        if (JSON.stringify(newVal) !== JSON.stringify(origVal)) payload[key] = newVal
      }
    }

    // If no fields to update, show message and skip server call
    const keys = Object.keys(payload).filter(k => k !== 'id')
    if (keys.length === 0) {
      setMsg('No hay cambios para aplicar')
      return
    }

    setMsg('Guardando...')
    try {
      const res = await fetch('http://localhost/LinkTiendas/Link%20Tienda/backend/api/pages.php?action=update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (data && data.ok) {
        // refresh pages from server to keep in sync
        await fetchPages()
        setMsg('Cambios guardados')
      } else if (data && data.ok === false && data.message) {
        setMsg(data.message)
      } else {
        setMsg('Error al guardar')
      }
    } catch (e) {
      console.error(e)
      setMsg('Error de red al guardar')
    }
  }

  function mergeUpdatedFields(orig, payload) {
    const copy = { ...orig }
    for (const k of Object.keys(payload)) {
      if (k === 'id') continue
      copy[k] = payload[k]
    }
    return copy
  }

  function tryParseJSON(str) {
    try { return JSON.parse(str) } catch(e) { return null }
  }

  return (
    <div className="modify-pages-root">
      <div className="modify-top">
        <input className="search-input" placeholder="Buscar por título..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className="results-ind">{filtered.length} resultados</div>
      </div>

      <PagesCarousel pages={filtered} selectedId={selectedId} onSelect={handleSelect} />

      <div className="modify-form">
        {!form ? (
          <div className="no-select">Seleccioná una página para editar</div>
        ) : (
          <div>
            <div className="field">
              <label>Título</label>
              <div className="actual">Actual: {form.title}</div>
              <input placeholder="Ingresá tu nuevo título" value={form.title} onChange={e => handleFormChange('title', e.target.value)} />
            </div>

            <div className="field">
              <label>Contenido</label>
              <div className="actual">Actual: (ver abajo)</div>
              <textarea placeholder="Ingresá el nuevo contenido" rows={6} value={form.content} onChange={e => handleFormChange('content', e.target.value)} />
            </div>

            <div className="field">
              <label>Imágenes</label>
              <div className="actual">Actual:</div>
              <div className="image-list">
                {(form.images || []).map((src, i) => (
                  <div className="image-item" key={i}>
                    <img src={src} alt={`img-${i}`} />
                    <button type="button" className="img-remove" onClick={() => removeImage(i)}>✕</button>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 8 }}>
                <input type="file" multiple accept="image/*" onChange={handleImageFiles} />
              </div>
            </div>

            <div className="field">
              <label>Mensaje promocional</label>
              <div className="actual">Actual: {form.promo_message}</div>
              <input placeholder="Ingresá el nuevo mensaje" value={form.promo_message} onChange={e => handleFormChange('promo_message', e.target.value)} />
            </div>

            <div className="field">
              <label>Categorías</label>
              <div className="actual">Actual: {(form.categories || '').toString()}</div>
              <input placeholder="cat1, cat2" value={form.categories} onChange={e => handleFormChange('categories', e.target.value)} />
            </div>

            <div className="field">
              <label>Tipo de sección</label>
              <div className="actual">Actual: {form.section_type}</div>
              <select value={form.section_type} onChange={e => handleFormChange('section_type', e.target.value)}>
                <option>Ofertas</option>
                <option>Hogar</option>
                <option>Ropa</option>
                <option>Electrónica</option>
              </select>
            </div>

            <div style={{ marginTop: 12 }}>
              <button onClick={saveMock}>Guardar cambios</button>
              {msg && <span style={{ marginLeft: 12, color: '#8fd28f' }}>{msg}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
