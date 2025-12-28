import React, { useMemo, useState, useEffect } from 'react'
import PagesCarousel from './PagesCarousel'
import './ModifyPages.css'
import * as api from './adminApi'

// Mock pages data
const mockPages = [
  { id: 1, title: 'Página A', content: '<p>Contenido A</p>', promo_message: 'Promo A', images: [], categories: ['cat1'], section_type: 'Ofertas', page_type: 'Producto', contact_info: { whatsapp: '549112233' }, slug: 'pagina-a' },
  { id: 2, title: 'Página B', content: '<p>Contenido B</p>', promo_message: 'Promo B', images: [], categories: ['cat2'], section_type: 'Ropa', page_type: 'Servicio', contact_info: {}, slug: 'pagina-b' },
  { id: 3, title: 'Página C', content: '<p>Contenido C</p>', promo_message: '', images: [], categories: [], section_type: 'Hogar', page_type: 'Producto', contact_info: {}, slug: 'pagina-c' },
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
    if (p) {
      // normalize categories to array of objects {name,image_url}
      let cats = []
      if (Array.isArray(p.categories)) {
        if (p.categories.length > 0 && typeof p.categories[0] === 'string') {
          cats = p.categories.map(n => ({ name: n, image_url: null }))
        } else {
          cats = p.categories.map(c => (typeof c === 'string' ? { name: c, image_url: null } : { name: c.name || '', image_url: c.image_url || null }))
        }
      } else if (typeof p.categories === 'string') {
        const parsed = tryParseJSON(p.categories)
        if (Array.isArray(parsed)) cats = parsed.map(c => (typeof c === 'string' ? { name: c, image_url: null } : { name: c.name || '', image_url: c.image_url || null }))
        else cats = p.categories.split(',').map(s => ({ name: s.trim(), image_url: null })).filter(Boolean)
      }
      setForm({ ...p, categories: cats, images: Array.isArray(p.images) ? p.images : [], pageType: p.page_type || p.pageType || 'Producto', open_time: p.open_time || '', close_time: p.close_time || '', sections: p.sections_json || [], logo_url: p.logo_url || null, cover_url: p.cover_url || null, newCategoryName: '' })
    }
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
        logo_url: p.logo_url || null,
        cover_url: p.cover_url || null,
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
  async function handleCoverFiles(e){
    const files = e.target.files
    if (!files || files.length === 0) return
    const urls = await uploadImagesLocal(files)
    if (urls && urls.length > 0) {
      setForm(prev => ({ ...prev, cover_url: urls[0] }))
      setMsg('Cover subido')
      await fetchPages()
    }
  }

  async function handleLogoFiles(e){
    const f = e.target.files && e.target.files[0]
    if (!f || !form) return
    try {
      const data = await api.uploadLogo(form.id, f)
      if (data && data.ok) {
        setForm(prev => ({ ...prev, logo_url: data.logo_url }))
        setMsg('Logo subido')
        // refresh pages list
        await fetchPages()
      } else {
        setMsg(data && data.message ? data.message : 'Error al subir logo')
      }
    } catch (e) {
      console.error(e); setMsg('Error de red al subir logo')
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
    const allowed = ['title','promo_message','images','categories','section_type','sections_json','logo_url','cover_url','open_time','close_time','contact_info','slug']

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
    // Map sections UI -> sections_json payload if changed
    if (form.sections) {
      const newSections = Array.isArray(form.sections) ? form.sections.map(s => (typeof s === 'string' ? s : (s.value || ''))) : []
      const origSections = Array.isArray(original.sections_json) ? original.sections_json : (original.sections || [])
      if (JSON.stringify(newSections) !== JSON.stringify(origSections)) payload['sections_json'] = newSections
    }

    // Map UI `pageType` -> backend `page_type` if changed
    const newPageType = form.pageType || form.page_type || null
    const origPageType = original.page_type || original.pageType || null
    if (newPageType && newPageType !== origPageType) payload['page_type'] = newPageType

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

  const getCats = (val) => {
    if (Array.isArray(val)) {
      if (val.length === 0) return []
      // if array of strings
      if (typeof val[0] === 'string') return val
      // if array of objects {name,image_url}
      return val.map(c => (c && c.name) ? c.name : '')
    }
    if (typeof val === 'string') {
      const parsed = tryParseJSON(val)
      if (Array.isArray(parsed)) return parsed
      return val.split(',').map(s => s.trim()).filter(Boolean)
    }
    return []
  }

  function resolvePublicUrl(u){
    if (!u) return null
    if (/^https?:\/\//.test(u)) return u
    // backend files are served from Apache at http://localhost/LinkTiendas/Link%20Tienda
    const base = 'http://localhost/LinkTiendas/Link%20Tienda'
    if (u.startsWith('/')) return base + u
    return base + '/' + u
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

            {/* `content` eliminado según petición: no editar contenido desde panel */}

            <div className="field">
              <label>Hero</label>
              <div className="actual">Actual:</div>
              <div className="image-list">
                {(form.images || []).map((src, i) => (
                  <div className="image-item" key={i}>
                    <img src={resolvePublicUrl(src)} alt={`img-${i}`} />
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
              <div className="actual">Actual: {getCats(form && form.categories).join(', ')}</div>
              <div style={{ marginTop: 8 }}>
                <input placeholder="Nueva categoría" value={form.newCategoryName || ''} onChange={e => handleFormChange('newCategoryName', e.target.value)} />
                <button type="button" onClick={() => {
                  const name = (form.newCategoryName || '').trim()
                  if (!name) return
                  // avoid duplicates (case-insensitive)
                  const existing = (form.categories || []).some(c => (c.name || '').toLowerCase() === name.toLowerCase())
                  if (existing) { setMsg('Categoría existente'); return }
                  const updated = [...(form.categories || []), { name, image_url: null }]
                  setForm(prev => ({ ...prev, categories: updated, newCategoryName: '' }))
                }} style={{ marginLeft: 8 }}>Agregar</button>
              </div>
              <div style={{ marginTop: 10 }}>
                {(form.categories || []).map((c, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    {c.image_url ? <img src={resolvePublicUrl(c.image_url)} alt={c.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} /> : <div style={{ width: 48, height: 48, background: '#eee', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>No img</div>}
                    <div style={{ flex: 1 }}>{c.name}</div>
                    <input style={{ display: 'none' }} id={`catfile-${idx}`} type="file" accept="image/png,image/jpeg,image/webp" onChange={async (e) => {
                      const f = e.target.files && e.target.files[0]
                      if (!f) return
                      setMsg('Subiendo...')
                      try {
                        const data = await api.uploadCategoryImage(form.id, c.name, f)
                        if (data && data.ok) {
                          // update form categories
                          const cats = (form.categories || []).map(x => ((x.name||'').toLowerCase() === (c.name||'').toLowerCase()) ? data.category : x)
                          setForm(prev => ({ ...prev, categories: cats }))
                          setMsg('Imagen de categoría subida')
                        } else {
                          setMsg(data && data.message ? data.message : 'Error al subir imagen')
                        }
                      } catch (err) { console.error(err); setMsg('Error de red') }
                    }} />
                    <label htmlFor={`catfile-${idx}`} style={{ cursor: 'pointer', padding: '6px 8px', background: '#f5f5f5', borderRadius: 6 }}>{c.image_url ? 'Cambiar imagen' : 'Agregar imagen'}</label>
                    <button type="button" onClick={() => {
                      const copy = (form.categories || []).slice(); copy.splice(idx,1); setForm(prev => ({ ...prev, categories: copy }))
                    }}>Eliminar</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Secciones de Home</label>
              <div className="actual">Actual: {(form.sections || []).map(s=>s.value || s).join(' | ')}</div>
              <div style={{ marginTop: 6 }}>
                {(form.sections || []).map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <select value={s.value || s} onChange={e => handleFormChange('sections', (form.sections || []).map((x,idx)=> idx===i ? { value: e.target.value } : x ))}>
                      <option>Ofertas destacadas</option>
                      { getCats(form && form.categories).map((c,idx)=>{
                        const label = typeof c === 'string' ? c : (c && c.name ? c.name : '')
                        return (<option key={idx} value={label}>{label}</option>)
                      }) }
                    </select>
                    <button type="button" onClick={() => handleFormChange('sections', (form.sections || []).filter((_,idx)=>idx!==i))}>Eliminar sección</button>
                  </div>
                ))}
                <div>
                  <button type="button" onClick={() => handleFormChange('sections', [...(form.sections||[]), { value: 'Ofertas destacadas' }])}>Agregar sección nueva</button>
                </div>
              </div>
            </div>

            <div className="field">
              <label>Logo</label>
              <div className="actual">{form.logo_url ? <img src={resolvePublicUrl(form.logo_url)} alt="logo" style={{ maxHeight: 80 }} /> : 'Sin logo'}</div>
              <div style={{ marginTop: 8 }}>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoFiles} />
              </div>
            </div>

            {/* Cover / Hero removed: use 'Hero' images above as page hero */}

            <div className="field">
              <label>Tipo de página</label>
              <div className="actual">Actual: {form.pageType || form.page_type}</div>
              <select value={form.pageType || ''} onChange={e => handleFormChange('pageType', e.target.value)}>
                <option>Producto</option>
                <option>Servicio</option>
              </select>
            </div>

            <div className="field">
              <label>Horario de atención</label>
              <div className="actual">Actual: {form.open_time || ''} - {form.close_time || ''}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="time" value={form.open_time || ''} onChange={e => handleFormChange('open_time', e.target.value)} />
                <input type="time" value={form.close_time || ''} onChange={e => handleFormChange('close_time', e.target.value)} />
              </div>
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
