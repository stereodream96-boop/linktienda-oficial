import React, { useState, useEffect } from 'react'
import AdminLayout from './components/admin/AdminLayout'
import ModifyPages from './components/admin/ModifyPages'
import ManagePage from './components/admin/ManagePage'
import * as api from './components/admin/adminApi'

export default function Admin() {
  // estado para el formulario de creación (mantengo la implementación previa)
  const [title, setTitle] = useState('')
  const [promo, setPromo] = useState('')
  const [images, setImages] = useState([])
  const [categories, setCategories] = useState([])
  const [catInput, setCatInput] = useState('')
  const [sections, setSections] = useState([]) // array of { type: 'offers'|'category', value: 'Hogar' }
  const [pageType, setPageType] = useState('Producto')
  const [openTime, setOpenTime] = useState('')
  const [closeTime, setCloseTime] = useState('')
  const [contact, setContact] = useState({ whatsapp: '', address: '', instagram: '', store_name: '' })
  const [msg, setMsg] = useState('')
  const [logoFile, setLogoFile] = useState(null)
  const [hash, setHash] = useState(typeof window !== 'undefined' ? window.location.hash : '')

  useEffect(() => {
    function onHash() { setHash(window.location.hash || '') }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  function handleFiles(e) { setImages(Array.from(e.target.files)) }
  function handleLogoFile(e){ setLogoFile(e.target.files && e.target.files[0] ? e.target.files[0] : null) }
  function addSection() { setSections(s=>[...s,{ value: 'Ofertas destacadas' }]) }
  function updateSection(idx, val) { setSections(s=>{ const copy = [...s]; copy[idx] = { value: val }; return copy }) }
  function removeSection(idx) { setSections(s=>{ const copy = [...s]; copy.splice(idx,1); return copy }) }
  function addCategory() { const v = catInput.trim(); if (v && !categories.includes(v)) { setCategories([...categories, v]); setCatInput('') } }
  function removeCategory(idx) { const copy = categories.slice(); copy.splice(idx,1); setCategories(copy) }

  async function uploadImages() {
    if (!images || images.length === 0) return []
    const fd = new FormData(); images.forEach((f,i)=>fd.append('file'+i,f))
    const res = await fetch('http://localhost/LinkTiendas/Link%20Tienda/backend/api/upload_images.php',{ method:'POST', body: fd })
    if (!res.ok) throw new Error('Upload failed')
    const data = await res.json(); return data.uploaded || []
  }

  async function handleSubmit(e){
    e.preventDefault(); setMsg('Enviando...')
    try {
      const uploaded = await uploadImages()
      const payload = { title, promo_message: promo, images: uploaded, categories, sections_json: sections, page_type: pageType, open_time: openTime || null, close_time: closeTime || null, contact_info: contact }
      const res = await fetch('http://localhost/LinkTiendas/Link%20Tienda/backend/api/pages.php',{ method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (res.ok) {
        const newId = data.id
        // If logo selected, upload after creation
        if (logoFile && newId) {
          try {
            const upl = await api.uploadLogo(newId, logoFile)
            if (upl && upl.ok) {
              // update logo_url on server already performed by upload endpoint
            }
          } catch(e) {
            console.warn('Logo upload failed', e)
          }
        }
        setMsg('Página creada')
        setTitle(''); setPromo(''); setImages([]); setCategories([]); setContact({ whatsapp:'', address:'', instagram:'', store_name:'' }); setPageType('Producto'); setOpenTime(''); setCloseTime(''); setSections([]); setLogoFile(null)
      } else setMsg(data.error || 'Error')
    } catch(err) { setMsg('Error de red o subida') }
  }

  // si el hash indica modificar contenido, mostrar ModifyPages dentro del layout
  const showModify = hash === '#modificar-contenido'
  const showManage = hash === '#gestion' || hash === '#gestion-inventario'

  return (
    <AdminLayout>
      {showModify ? (
        <ModifyPages />
      ) : showManage ? (
        <ManagePage />
      ) : (
        <section id="crear-paginas" style={{ padding: 16 }}>
          <h2>Admin — Crear página</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 8 }}>
              <input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', padding: 8 }} />
            </div>

            <div style={{ marginBottom: 8 }}>
              <input placeholder="Mensaje promocional (promo)" value={promo} onChange={(e) => setPromo(e.target.value)} style={{ width: '100%', padding: 8 }} />
            </div>

            <div style={{ marginBottom: 8 }}>
              <label>Imágenes (múltiples)</label>
              <br />
              <input type="file" multiple accept="image/*" onChange={handleFiles} />
              <div style={{ marginTop: 6 }}>
                {images.map((f, i) => (<span key={i} style={{ marginRight: 8 }}>{f.name}</span>))}
              </div>
            </div>

            <div style={{ marginBottom: 8 }}>
              <label>Categorías</label>
              <br />
              <input value={catInput} onChange={(e) => setCatInput(e.target.value)} placeholder="Agregar categoría" style={{ padding: 6 }} />
              <button type="button" onClick={addCategory} style={{ marginLeft: 8 }}>Agregar</button>
              <div style={{ marginTop: 8 }}>
                {categories.map((c, i) => (<button key={i} type="button" onClick={() => removeCategory(i)} style={{ marginRight: 6 }}>{c} ✕</button>))}
              </div>
            </div>

            <div style={{ marginBottom: 8 }}>
              <label>Secciones de Home</label>
              <div style={{ marginTop: 6 }}>
                {sections.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <select value={s.value} onChange={e => updateSection(i, e.target.value)}>
                      <option>Ofertas destacadas</option>
                      {categories.map((c, idx) => (<option key={idx}>{c}</option>))}
                    </select>
                    <button type="button" onClick={() => removeSection(i)}>Eliminar sección</button>
                  </div>
                ))}
                <div>
                  <button type="button" onClick={addSection}>Agregar sección nueva</button>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 8 }}>
              <label>Logo de la página (opcional)</label>
              <br />
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoFile} />
              {logoFile && <div style={{ marginTop: 6 }}>{logoFile.name}</div>}
            </div>

            <div style={{ marginBottom: 8 }}>
              <label>Tipo de página</label>
              <br />
              <select value={pageType} onChange={(e) => setPageType(e.target.value)}>
                <option>Producto</option>
                <option>Servicio</option>
              </select>
            </div>

            <div style={{ marginBottom: 8 }}>
              <label>Horario de atención</label>
              <br />
              <input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} style={{ marginRight: 8 }} />
              <input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} />
            </div>

            {/* Contenido eliminado del formulario de creación */}

            <fieldset style={{ marginBottom: 8 }}>
              <legend>Información de contacto (footer)</legend>
              <div style={{ marginBottom: 6 }}>
                <input placeholder="WhatsApp" value={contact.whatsapp} onChange={(e) => setContact({...contact, whatsapp: e.target.value})} style={{ width: '100%', padding: 6 }} />
              </div>
              <div style={{ marginBottom: 6 }}>
                <input placeholder="Dirección" value={contact.address} onChange={(e) => setContact({...contact, address: e.target.value})} style={{ width: '100%', padding: 6 }} />
              </div>
              <div style={{ marginBottom: 6 }}>
                <input placeholder="Instagram" value={contact.instagram} onChange={(e) => setContact({...contact, instagram: e.target.value})} style={{ width: '100%', padding: 6 }} />
              </div>
              <div>
                <input placeholder="Nombre de la tienda" value={contact.store_name} onChange={(e) => setContact({...contact, store_name: e.target.value})} style={{ width: '100%', padding: 6 }} />
              </div>
            </fieldset>

            <div>
              <button type="submit">Guardar plantilla</button>
            </div>
            {msg && <p style={{ marginTop: 8 }}>{msg}</p>}
          </form>
        </section>
      )}
    </AdminLayout>
  )
}
