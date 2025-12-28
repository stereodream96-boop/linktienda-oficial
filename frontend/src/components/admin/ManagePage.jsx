import React, { useEffect, useState } from 'react'
import PagesCarousel from './PagesCarousel'
import * as api from './adminApi'
import InventoryManager from './InventoryManager'
import ServicesManager from './ServicesManager'
// AvailabilityManager intentionally omitted from admin Manage view for now
import './ManagePage.css'

export default function ManagePage(){
  const [pages, setPages] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [msg, setMsg] = useState('')

  useEffect(()=>{ loadPages() }, [])
  async function loadPages(){
    try{
      const data = await api.getPages()
      setPages(data.pages || [])
    }catch(e){ setMsg('Error cargando páginas') }
  }

  function handleSelect(p){ setSelected(p); setMsg('') }
  const filtered = pages.filter(p => (p.title||'').toLowerCase().includes(search.trim().toLowerCase()))

  return (
    <div className="manage-root">
      <div className="manage-top">
        <input placeholder="Buscar por título..." value={search} onChange={e=>setSearch(e.target.value)} />
        <div className="results">{filtered.length} páginas</div>
      </div>
      <PagesCarousel pages={filtered} selectedId={selected && selected.id} onSelect={handleSelect} />

      <div className="manage-body">
        {!selected ? (
          <div className="no-select">Seleccioná una página</div>
        ) : (
          <div className="selected-card">
            <h3>{selected.title}</h3>
            <div>Tipo: {selected.page_type || selected.pageType}</div>
            <div>Horario: {selected.open_time || '-'} — {selected.close_time || '-'}</div>
            <div className="managers">
              {(() => {
                // normalize categories into categoryOptions (array of strings)
                let categoryOptions = []
                if (selected && selected.categories) {
                  if (Array.isArray(selected.categories)) categoryOptions = selected.categories
                  else if (typeof selected.categories === 'string') categoryOptions = selected.categories.split(',').map(s=>s.trim()).filter(Boolean)
                }
                // ensure options are strings (map objects {name,image_url} -> name)
                categoryOptions = (categoryOptions || []).map(c => (typeof c === 'string' ? c : (c && c.name ? c.name : ''))).filter(Boolean)
                return (selected.page_type||selected.pageType) === 'Producto' ? (
                  <InventoryManager page={selected} categoryOptions={categoryOptions} />
                ) : (
                  <ServicesManager page={selected} categoryOptions={categoryOptions} />
                )
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
