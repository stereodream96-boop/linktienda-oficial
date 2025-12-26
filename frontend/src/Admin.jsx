import React, { useState, useEffect } from 'react'
import AdminLayout from './components/admin/AdminLayout'
import ModifyPages from './components/admin/ModifyPages'

export default function Admin() {
  // estado para el formulario de creación (mantengo la implementación previa)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [promo, setPromo] = useState('')
  const [images, setImages] = useState([])
  const [categories, setCategories] = useState([])
  const [catInput, setCatInput] = useState('')
  const [sectionType, setSectionType] = useState('Ofertas destacadas')
  const [contact, setContact] = useState({ whatsapp: '', address: '', instagram: '', store_name: '' })
  const [msg, setMsg] = useState('')
  const [hash, setHash] = useState(typeof window !== 'undefined' ? window.location.hash : '')

  useEffect(() => {
    function onHash() { setHash(window.location.hash || '') }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  function handleFiles(e) { setImages(Array.from(e.target.files)) }
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
      const payload = { title, content, promo_message: promo, images: uploaded, categories, section_type: sectionType, contact_info: contact }
      const res = await fetch('http://localhost/LinkTiendas/Link%20Tienda/backend/api/pages.php',{ method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (res.ok) {
        setMsg('Página creada')
        setTitle(''); setContent(''); setPromo(''); setImages([]); setCategories([]); setContact({ whatsapp:'', address:'', instagram:'', store_name:'' })
      } else setMsg(data.error || 'Error')
    } catch(err) { setMsg('Error de red o subida') }
  }

  // si el hash indica modificar contenido, mostrar ModifyPages dentro del layout
  const showModify = hash === '#modificar-contenido'

  return (
    <AdminLayout>
      {showModify ? (
        <ModifyPages />
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
              <label>Tipo de sección</label>
              <br />
              <select value={sectionType} onChange={(e) => setSectionType(e.target.value)}>
                <option>Ofertas destacadas</option>
                <option>Hogar</option>
                <option>Ropa</option>
                <option>Electrónica</option>
              </select>
            </div>

            <div style={{ marginBottom: 8 }}>
              <label>Contenido</label>
              <br />
              <textarea placeholder="Contenido" value={content} onChange={(e) => setContent(e.target.value)} rows={6} style={{ width: '100%', padding: 8 }} />
            </div>

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
