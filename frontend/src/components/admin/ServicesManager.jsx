import React, { useEffect, useState } from 'react'
import * as api from './adminApi'

function parseToInt(v){
  if (v === undefined || v === null) return 0
  if (typeof v === 'number') return Math.round(v)
  const s = String(v).trim()
  if (!s) return 0
  // determine last separator (dot or comma)
  const lastDot = s.lastIndexOf('.')
  const lastComma = s.lastIndexOf(',')
  const decPos = Math.max(lastDot, lastComma)
  // if there's a separator near the end (1-2 digits after), treat it as decimal
  if (decPos !== -1 && s.length - decPos - 1 <= 2) {
    const decChar = s[decPos]
    // build cleaned string keeping digits and the decimal point at decPos
    let cleaned = ''
    for (let i = 0; i < s.length; i++) {
      const ch = s[i]
      if (i === decPos) cleaned += '.'
      else if (ch >= '0' && ch <= '9') cleaned += ch
      // ignore all other separators
    }
    const num = parseFloat(cleaned)
    return isNaN(num) ? 0 : Math.round(num)
  }
  // otherwise remove all non-digits (thousands separators) and parse integer
  const digits = s.replace(/\D/g, '')
  return digits ? parseInt(digits, 10) : 0
}

function formatNumberWithDots(v){
  const intPart = parseToInt(v)
  return intPart ? String(intPart).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''
}

export default function ServicesManager({ page, categoryOptions = [] }){
  const [services, setServices] = useState([])
  const [form, setForm] = useState({ name:'', price:'', duration_minutes:'', active:1, category: '', description: '', files: [] })
  const [msg, setMsg] = useState('')

  useEffect(()=>{ if(page && page.id) load() }, [page])
  async function load(){ setMsg(''); try{ const data = await api.getServices(page.id); if(!data.ok) setMsg(data.message||'Error'); else setServices(data.services||[]) }catch(e){ setMsg('Error de red') } }
  
  // normalize prices and images when setting services
  async function load(){
    setMsg('')
    try{
      const data = await api.getServices(page.id)
      if(!data.ok) { setMsg(data.message||'Error'); return }
      const sv = (data.services||[]).map(s=>{
        const priceInt = parseToInt(s.price)
        return { ...s, price: priceInt, images_json: Array.isArray(s.images_json) ? s.images_json : (s.images_json ? tryParseJSON(s.images_json) || [] : []) }
      })
      setServices(sv)
    }catch(e){ setMsg('Error de red') }
  }

  async function onCreate(e){
    e.preventDefault(); setMsg('')
    // validations
    if (!form.name || form.name.trim() === '') { setMsg('Nombre requerido'); return }
    const dur = parseInt(form.duration_minutes||0, 10)
    const price = parseInt(form.price||0, 10)
    if (isNaN(dur) || dur <= 0) { setMsg('Duración inválida'); return }
    if (isNaN(price) || price < 0) { setMsg('Precio inválido'); return }
    if (!form.category || form.category.trim() === '') { setMsg('Seleccioná una categoría'); return }
    try{
      const intPrice = parseInt(form.price || 0, 10) || 0
      const data = await api.createService(page.id, { name: form.name, price: intPrice, duration_minutes: dur, active: form.active?1:0, category: form.category, description: form.description || '' })
      if(!data.ok) setMsg(data.message||'Error')
      else {
        // if files attached, upload them for the created service
        const newId = data.id || (data.service && data.service.id) || null
        if (newId && form.files && form.files.length > 0) {
          setMsg('Subiendo imágenes...')
          for (let i=0;i<form.files.length;i++){
            try{
              const f = form.files[i]
              const up = await api.uploadServiceImage(newId, f)
              if (!up || !up.ok) console.warn('Upload failed', up)
            }catch(err){ console.error('Upload error', err) }
          }
        }
        setForm({ name:'', price:'', duration_minutes:'', active:1, category: '', description: '', files: [] });
        load()
      }
    }catch(e){ setMsg('Error de red') }
  }

  async function onUpdate(id, payload){ setMsg(''); try{ const data = await api.updateService(id, payload); if(!data.ok) setMsg(data.message||'Error'); else load() }catch(e){ setMsg('Error de red') } }
  async function onDelete(id){ if(!confirm('Eliminar servicio?')) return; try{ const data = await api.deleteService(id); if(!data.ok) setMsg(data.message||'Error'); else load() }catch(e){ setMsg('Error de red') } }

  return (
    <div style={{ marginTop: 12 }}>
      <h4>Servicios</h4>
      <form onSubmit={onCreate} style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Nombre</label>
          <input placeholder="Nombre" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required style={{ width: '100%', padding: 8, fontSize: 14 }} />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Precio</label>
          <input placeholder="Precio" value={formatNumberWithDots(form.price)} onChange={e=>{
            const digits = (e.target.value || '').replace(/\D/g,'')
            setForm(f=>({...f, price: digits}))
          }} style={{ width: '100%', padding: 8, fontSize: 14, marginBottom: 8 }} />
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Duración (min)</label>
          <input placeholder="Duración (min)" value={form.duration_minutes} onChange={e=>setForm(f=>({...f,duration_minutes:e.target.value.replace(/\D/g,'')}))} style={{ width: '100%', padding: 8, fontSize: 14 }} />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Descripción (opcional)</label>
          <textarea placeholder="Descripción (opcional)" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={3} style={{ width: '100%', padding: 8, fontSize: 14 }} />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Categoría</label>
          <select value={form.category || ''} onChange={e=>setForm(f=>({...f,category: e.target.value}))} required style={{ width: '100%', padding: 8, fontSize: 14 }}>
            <option value="">Seleccionar categoría...</option>
            {categoryOptions.map((c, i) => (
              <option key={i} value={typeof c === 'string' ? c : c.name}>
                {typeof c === 'string' ? c : c.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Imágenes (opcional)</label>
          <input type="file" multiple accept="image/*" onChange={e=>setForm(f=>({...f, files: Array.from(e.target.files)}))} />
          {form.files && form.files.length>0 && (
            <div style={{ marginTop:6 }}>
              {form.files.map((fl, i) => (<div key={i} style={{ marginBottom:4 }}>{fl.name}</div>))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={!!form.active} onChange={e=>setForm(f=>({...f,active: e.target.checked?1:0}))} />
            <span style={{ fontWeight: 600 }}>Activo</span>
          </label>
          <button type="submit" className="btn btn-primary">Agregar</button>
        </div>
      </form>
      {msg && <div style={{ color:'#c55' }}>{msg}</div>}
      <table className="admin-services-table" style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr>
            <th>Servicio</th>
            <th>Precio</th>
            <th>Duración</th>
            <th>Activo</th>
            <th>Categoría</th>
            <th>Descripción</th>
            <th>Imagen</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {services.map(s=> <ServiceRow key={s.id} s={s} onUpdate={onUpdate} onDelete={onDelete} onReload={load} categoryOptions={categoryOptions} />)}
        </tbody>
      </table>
    </div>
  )
}

  function ServiceRow({ s, onUpdate, onDelete, onReload, categoryOptions = [] }){
  const [edit, setEdit] = useState(false)
  const [st, setSt] = useState({ name: s.name, price: s.price, duration_minutes: s.duration_minutes, active: s.active, category: s.category || '', description: s.description || '', images_json: s.images_json || [] })
  const [localMsg, setLocalMsg] = useState('')

  useEffect(()=>{ setSt({ name: s.name, price: s.price, duration_minutes: s.duration_minutes, active: s.active, category: s.category || '', description: s.description || '', images_json: s.images_json || [] }) }, [s])

  function computeChanges(){
    const changes = {}
    if ((st.name||'').trim() !== (s.name||'').trim()) changes.name = st.name
    // compare integer price values
    const stPriceInt = parseInt((st.price||'0').toString().replace(/\D/g,''), 10) || 0
    const sPriceInt = parseInt((s.price||0).toString().replace(/\D/g,''), 10) || 0
    if (stPriceInt !== sPriceInt) changes.price = stPriceInt
    if (String(st.duration_minutes) !== String(s.duration_minutes)) changes.duration_minutes = st.duration_minutes
    if (Number(st.active) !== Number(s.active)) changes.active = st.active?1:0
    if ((st.category||'').trim() !== (s.category||'').trim()) changes.category = st.category
    if ((st.description||'').trim() !== (s.description||'').trim()) changes.description = st.description
    return changes
  }

  async function save(){
    setLocalMsg('')
    const changes = computeChanges()
    if (Object.keys(changes).length === 0) { setLocalMsg('No hay cambios para aplicar'); return }
    try{
      await onUpdate(s.id, changes)
      setEdit(false)
    }catch(e){ setLocalMsg('Error al guardar') }
  }

  async function onUploadFiles(files){
    if (!files || files.length === 0) return
    setLocalMsg('Subiendo...')
    try{
      for (let i=0;i<files.length;i++){
        const f = files[i]
        const data = await api.uploadServiceImage(s.id, f)
        if (!data || !data.ok) { setLocalMsg(data && data.message ? data.message : 'Error subiendo imagen'); return }
      }
      setLocalMsg('Imágenes subidas');
      if (typeof onReload === 'function') onReload()
    }catch(e){ setLocalMsg('Error de red') }
  }

  const [descExpanded, setDescExpanded] = useState(false)

  function shortDesc(t, n = 140){
    if (!t) return ''
    if (t.length <= n) return t
    return t.substr(0,n) + '...'
  }

  return (
    <tr style={{ borderTop:'1px solid #eee', verticalAlign: 'top' }}>
      <td style={{ padding: 8 }}>{edit ? <input value={st.name} onChange={e=>setSt(x=>({...x,name:e.target.value}))} /> : <div style={{ fontWeight:700 }}>{s.name}</div>}</td>
      <td style={{ padding: 8 }}>
        {edit ? (
          <input value={formatNumberWithDots(st.price)} onChange={e=>{
            const digits = (e.target.value||'').replace(/\D/g,'')
            setSt(x=>({...x,price: digits}))
          }} />
        ) : (
          <div>{'$' + formatNumberWithDots(s.price)}</div>
        )}
      </td>
      <td style={{ padding: 8 }}>{edit ? <input value={st.duration_minutes} onChange={e=>setSt(x=>({...x,duration_minutes:e.target.value}))} /> : <div>{s.duration_minutes}</div>}</td>
      <td style={{ padding: 8 }}>{edit ? <input type="checkbox" checked={!!st.active} onChange={e=>setSt(x=>({...x,active: e.target.checked?1:0}))} /> : (s.active? 'Sí':'No')}</td>
      <td style={{ padding: 8 }}>{edit ? (
        <select value={st.category||''} onChange={e=>setSt(x=>({...x,category:e.target.value}))}>
          <option value="">-- categoría --</option>
          {categoryOptions.map((c,i)=>(
            <option key={i} value={typeof c === 'string' ? c : c.name}>
              {typeof c === 'string' ? c : c.name}
            </option>
          ))}
        </select>
      ) : (
        <div style={{ fontSize:12, color:'#666' }}>{s.category || ''}</div>
      )}</td>

      <td style={{ padding: 8, maxWidth: 420 }}>
        {edit ? (
          <textarea value={st.description||''} onChange={e=>setSt(x=>({...x,description:e.target.value}))} rows={3} style={{ width: '100%' }} />
        ) : (
          <div style={{ fontSize:13, color:'#444' }}>
            {s.description ? (
              <>
                {descExpanded ? s.description : shortDesc(s.description, 180)}
                {s.description.length > 180 ? (
                  <button onClick={(e)=>{ e.preventDefault(); setDescExpanded(v=>!v) }} className="desc-toggle">{descExpanded ? 'ver menos' : 'ver más'}</button>
                ) : null}
              </>
            ) : <span style={{ color:'#999' }}>Sin descripción</span>}
          </div>
        )}
      </td>

      <td style={{ padding: 8, width: 120 }}>
        {edit ? (
          <div>
            <input type="file" accept="image/*" multiple onChange={e=> onUploadFiles(e.target.files)} />
            <div style={{ marginTop:6 }}>
              {(s.images_json || []).slice(0,3).map((u,idx)=>(<img key={idx} src={u} alt={`img-${idx}`} style={{ width:60,height:60,objectFit:'cover',borderRadius:6,marginRight:6 }} />))}
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', gap:8 }}>
            {(s.images_json || []).slice(0,1).map((u,idx)=>(
              <div key={idx} style={{ position:'relative' }}>
                <img src={u} alt={`s-img-${idx}`} style={{ width:64, height:64, objectFit:'cover', borderRadius:6 }} />
              </div>
            ))}
          </div>
        )}
      </td>

      <td style={{ padding: 8 }}>
        {edit ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={save} className="btn btn-primary">Guardar</button>
            <button onClick={()=>{ setEdit(false); setLocalMsg('') }} className="btn btn-secondary">Cancelar</button>
            {localMsg && <div style={{ color:'#c55', marginTop:6 }}>{localMsg}</div>}
          </div>
        ) : (
          <div className="svc-actions">
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={()=>setEdit(true)} className="btn btn-ghost">Editar</button>
              <button onClick={()=>onDelete(s.id)} className="btn btn-danger">Eliminar</button>
            </div>
            <div>
              <input id={`svcfile-${s.id}`} type="file" accept="image/*" multiple style={{ display:'none' }} onChange={e=> onUploadFiles(e.target.files)} />
              <label htmlFor={`svcfile-${s.id}`} className="btn btn-upload">Subir imágenes</label>
            </div>
            {localMsg && <div style={{ color:'#666' }}>{localMsg}</div>}
          </div>
        )}
      </td>
    </tr>
  )
}
