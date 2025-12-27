import React, { useEffect, useState } from 'react'
import * as api from './adminApi'

export default function InventoryManager({ page, categoryOptions = [] }){
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name:'', price:'', stock:'', sku:'', category:'', on_sale:0, sale_price:'', featured:0 })
  const [msg, setMsg] = useState('')

  useEffect(()=>{ if(page && page.id) load() }, [page])
  async function load(){
    setLoading(true); setMsg('')
    try{
      const data = await api.getInventory(page.id)
      if (!data.ok) setMsg(data.message || 'Error')
      else setItems(data.products || [])
    }catch(e){ setMsg('Error de red') }
    setLoading(false)
  }

  async function onCreate(e){
    e.preventDefault(); setMsg('')
    if (categoryOptions && categoryOptions.length > 0 && (!form.category || form.category.trim() === '')) { setMsg('Seleccioná una categoría'); return }
    try{
      const data = await api.createProduct(page.id, { name: form.name, price: parseFloat(form.price||0), stock: parseInt(form.stock||0), sku: form.sku, category: form.category, on_sale: form.on_sale, sale_price: form.sale_price ? parseFloat(form.sale_price) : null, featured: form.featured })
      if (!data.ok) setMsg(data.message || 'Error')
      else { setForm({ name:'',price:'',stock:'',sku:'', category:'', on_sale:0, sale_price:'', featured:0 }); load() }
    }catch(e){ setMsg('Error de red') }
  }

  async function onUpdate(id, changes){
    try{
      const data = await api.updateProduct(id, changes)
      if (!data.ok) {
        if (data.message) setMsg(data.message)
      } else load()
    }catch(e){ setMsg('Error de red') }
  }

  async function onDelete(id){
    if(!confirm('Eliminar producto?')) return
    try{
      const data = await api.deleteProduct(id)
      if (!data.ok) setMsg(data.message || 'Error')
      else load()
    }catch(e){ setMsg('Error de red') }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <h4>Inventario</h4>
      <form onSubmit={onCreate} style={{ marginBottom: 8 }}>
        <input placeholder="Nombre" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required />
        <input placeholder="Precio" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} />
        <input placeholder="Stock" value={form.stock} onChange={e=>setForm(f=>({...f,stock:e.target.value}))} />
        <input placeholder="SKU" value={form.sku} onChange={e=>setForm(f=>({...f,sku:e.target.value}))} />
        {categoryOptions && categoryOptions.length > 0 ? (
          <select value={form.category||''} onChange={e=>setForm(f=>({...f,category:e.target.value}))} required>
            <option value="">Seleccionar categoría...</option>
            {categoryOptions.map((c,i)=>(<option key={i} value={c}>{c}</option>))}
          </select>
        ) : (
          <input placeholder="Categoría" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} />
        )}
        <label style={{ display:'inline-flex', alignItems:'center', gap:6, marginLeft:8 }}><input type="checkbox" checked={!!form.on_sale} onChange={e=>setForm(f=>({...f,on_sale: e.target.checked ? 1 : 0}))} /> On Sale</label>
        {form.on_sale ? <input placeholder="Precio en oferta" value={form.sale_price} onChange={e=>setForm(f=>({...f,sale_price:e.target.value}))} /> : null}
        <label style={{ display:'inline-flex', alignItems:'center', gap:6, marginLeft:8 }}><input type="checkbox" checked={!!form.featured} onChange={e=>setForm(f=>({...f,featured: e.target.checked ? 1 : 0}))} /> Destacado</label>
        <button type="submit">Agregar</button>
      </form>
      {msg && <div style={{ color: '#c55' }}>{msg}</div>}
      {loading ? <div>Cargando...</div> : (
        <table style={{ width: '100%', borderCollapse:'collapse' }}>
          <thead><tr><th>Nombre</th><th>Precio</th><th>Stock</th><th>SKU</th><th>Acciones</th></tr></thead>
          <tbody>
            {items.map(it=> (
              <Row key={it.id} item={it} onUpdate={onUpdate} onDelete={onDelete} categoryOptions={categoryOptions} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function Row({ item, onUpdate, onDelete, categoryOptions = [] }){
  const [edit, setEdit] = useState(false)
  const [st, setSt] = useState({ name: item.name, price: item.price, stock: item.stock, sku: item.sku, category: item.category || '', on_sale: item.on_sale ? 1 : 0, sale_price: item.sale_price || '', featured: item.featured ? 1 : 0 })
  return (
    <tr style={{ borderTop: '1px solid #eee' }}>
      <td>
        {edit ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={st.name} onChange={e=>setSt(s=>({...s,name:e.target.value}))} />
            {categoryOptions && categoryOptions.length > 0 ? (
              <select value={st.category||''} onChange={e=>setSt(s=>({...s,category:e.target.value}))}>
                <option value="">-- categoría --</option>
                {categoryOptions.map((c,i)=>(<option key={i} value={c}>{c}</option>))}
              </select>
            ) : (
              <input placeholder="Categoría" value={st.category} onChange={e=>setSt(s=>({...s,category:e.target.value}))} />
            )}
          </div>
        ) : (
          <div>{item.name}<div style={{ fontSize:12, color:'#666' }}>{item.category ? item.category : ''} {item.on_sale ? ' • Oferta' : ''} {item.featured ? ' • Destacado' : ''}</div></div>
        )}
      </td>
      <td>{edit ? <input value={st.price} onChange={e=>setSt(s=>({...s,price:e.target.value}))} /> : item.price}</td>
      <td>{edit ? <input value={st.stock} onChange={e=>setSt(s=>({...s,stock:e.target.value}))} /> : item.stock}</td>
      <td>{edit ? <input value={st.sku} onChange={e=>setSt(s=>({...s,sku:e.target.value}))} /> : item.sku}</td>
      <td>
        {edit ? (
          <>
            <button onClick={()=>{ onUpdate(item.id, { name: st.name, price: st.price, stock: st.stock, sku: st.sku, category: st.category, on_sale: st.on_sale, sale_price: st.sale_price, featured: st.featured }); setEdit(false) }}>Guardar</button>
            <button onClick={()=>setEdit(false)}>Cancelar</button>
          </>
        ) : (
          <>
            <button onClick={()=>setEdit(true)}>Editar</button>
            <button onClick={()=>onDelete(item.id)}>Eliminar</button>
          </>
        )}
      </td>
    </tr>
  )
}
