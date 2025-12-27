import React, { useEffect, useState } from 'react'
import * as api from './adminApi'

export default function ServicesManager({ page, categoryOptions = [] }){
  const [services, setServices] = useState([])
  const [form, setForm] = useState({ name:'', price:'', duration_minutes:'', active:1, category: '' })
  const [msg, setMsg] = useState('')

  useEffect(()=>{ if(page && page.id) load() }, [page])
  async function load(){ setMsg(''); try{ const data = await api.getServices(page.id); if(!data.ok) setMsg(data.message||'Error'); else setServices(data.services||[]) }catch(e){ setMsg('Error de red') } }

  async function onCreate(e){
    e.preventDefault(); setMsg('')
    // validations
    if (!form.name || form.name.trim() === '') { setMsg('Nombre requerido'); return }
    const dur = parseInt(form.duration_minutes||0)
    const price = parseFloat(form.price||0)
    if (isNaN(dur) || dur <= 0) { setMsg('Duración inválida'); return }
    if (isNaN(price) || price < 0) { setMsg('Precio inválido'); return }
    if (!form.category || form.category.trim() === '') { setMsg('Seleccioná una categoría'); return }
    try{
      const data = await api.createService(page.id, { name: form.name, price: price, duration_minutes: dur, active: form.active?1:0, category: form.category })
      if(!data.ok) setMsg(data.message||'Error')
      else { setForm({ name:'', price:'', duration_minutes:'', active:1, category: '' }); load() }
    }catch(e){ setMsg('Error de red') }
  }

  async function onUpdate(id, payload){ setMsg(''); try{ const data = await api.updateService(id, payload); if(!data.ok) setMsg(data.message||'Error'); else load() }catch(e){ setMsg('Error de red') } }
  async function onDelete(id){ if(!confirm('Eliminar servicio?')) return; try{ const data = await api.deleteService(id); if(!data.ok) setMsg(data.message||'Error'); else load() }catch(e){ setMsg('Error de red') } }

  return (
    <div style={{ marginTop: 12 }}>
      <h4>Servicios</h4>
      <form onSubmit={onCreate} style={{ marginBottom: 8 }}>
        <input placeholder="Nombre" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required />
        <input placeholder="Precio" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} />
        <input placeholder="Duración (min)" value={form.duration_minutes} onChange={e=>setForm(f=>({...f,duration_minutes:e.target.value}))} />
        <div style={{ marginTop:6 }}>
          <select value={form.category || ''} onChange={e=>setForm(f=>({...f,category: e.target.value}))} required>
            <option value="">Seleccionar categoría...</option>
            {categoryOptions.map((c, i) => (<option key={i} value={c}>{c}</option>))}
          </select>
        </div>
        <label style={{ marginLeft:8 }}><input type="checkbox" checked={!!form.active} onChange={e=>setForm(f=>({...f,active: e.target.checked?1:0}))} /> Activo</label>
        <button type="submit">Agregar</button>
      </form>
      {msg && <div style={{ color:'#c55' }}>{msg}</div>}
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead><tr><th>Servicio</th><th>Precio</th><th>Duración</th><th>Activo</th><th>Categoría</th><th>Acciones</th></tr></thead>
        <tbody>
          {services.map(s=> <ServiceRow key={s.id} s={s} onUpdate={onUpdate} onDelete={onDelete} categoryOptions={categoryOptions} />)}
        </tbody>
      </table>
    </div>
  )
}

  function ServiceRow({ s, onUpdate, onDelete, categoryOptions = [] }){
  const [edit, setEdit] = useState(false)
  const [st, setSt] = useState({ name: s.name, price: s.price, duration_minutes: s.duration_minutes, active: s.active, category: s.category || '' })
  const [localMsg, setLocalMsg] = useState('')

  useEffect(()=>{ setSt({ name: s.name, price: s.price, duration_minutes: s.duration_minutes, active: s.active, category: s.category || '' }) }, [s])

  function computeChanges(){
    const changes = {}
    if ((st.name||'').trim() !== (s.name||'').trim()) changes.name = st.name
    if (String(st.price) !== String(s.price)) changes.price = st.price
    if (String(st.duration_minutes) !== String(s.duration_minutes)) changes.duration_minutes = st.duration_minutes
    if (Number(st.active) !== Number(s.active)) changes.active = st.active?1:0
    if ((st.category||'').trim() !== (s.category||'').trim()) changes.category = st.category
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

  return (
    <tr style={{ borderTop:'1px solid #eee' }}>
      <td>{edit ? <input value={st.name} onChange={e=>setSt(x=>({...x,name:e.target.value}))} /> : s.name}</td>
      <td>{edit ? <input value={st.price} onChange={e=>setSt(x=>({...x,price:e.target.value}))} /> : s.price}</td>
      <td>{edit ? <input value={st.duration_minutes} onChange={e=>setSt(x=>({...x,duration_minutes:e.target.value}))} /> : s.duration_minutes}</td>
      <td>{edit ? <input type="checkbox" checked={!!st.active} onChange={e=>setSt(x=>({...x,active: e.target.checked?1:0}))} /> : (s.active? 'Sí':'No')}</td>
      <td>{edit ? (
        <select value={st.category||''} onChange={e=>setSt(x=>({...x,category:e.target.value}))}>
          <option value="">-- categoría --</option>
          {categoryOptions.map((c,i)=>(<option key={i} value={c}>{c}</option>))}
        </select>
      ) : (s.category || '')}</td>
      <td>
        {edit ? (
          <>
            <button onClick={save}>Guardar</button>
            <button onClick={()=>{ setEdit(false); setLocalMsg('') }}>Cancelar</button>
            {localMsg && <div style={{ color:'#c55', marginTop:6 }}>{localMsg}</div>}
          </>
        ) : (
          <>
            <button onClick={()=>setEdit(true)}>Editar</button>
            <button onClick={()=>onDelete(s.id)}>Eliminar</button>
          </>
        )}
      </td>
    </tr>
  )
}
