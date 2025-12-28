import React, { useEffect, useState } from 'react'
import * as api from '../../components/admin/adminApi'

export default function ServiceDetail({ store, serviceId }){
  const [service, setService] = useState(null)
  const [page, setPage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [reservedMap, setReservedMap] = useState({})
  const [capacityMap, setCapacityMap] = useState({})
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [resStatus, setResStatus] = useState(null)
  const [resLoading, setResLoading] = useState(false)

  useEffect(()=>{
    let mounted = true
    async function load(){
      try{
        const s = await api.getService(serviceId)
        if (!mounted) return
        if (!s || !s.ok) { setError(s && s.message ? s.message : 'Servicio no encontrado'); setLoading(false); return }
        setService(s.service)
        if (store) {
          try{ const sp = await fetch(`http://localhost/LinkTiendas/Link%20Tienda/backend/api/pages.php?slug=${encodeURIComponent(store)}`)
            if (sp.ok){ const dd = await sp.json(); setPage(dd.page || null) }
          }catch(e){}
        }
      }catch(e){ setError('Error de red') }
      setLoading(false)
    }
    load()
    return ()=>{ mounted = false }
  }, [store, serviceId])

  async function loadSlotsForDate(d){
    if (!page || !page.id) return
    setSlots([]); setSelectedSlot(null)
    try{
      const resp = await api.getTurns(page.id, d, d)
      if (!resp || !resp.ok) { setSlots([]); return }
      const all = resp.turns || []
      const filtered = all.filter(t => Number(t.service_id) === Number(serviceId))
      if (filtered.length > 0) {
        setSlots(filtered)
        // map capacities for explicit turns (normalize to HH:MM)
        const cmap = {}
        filtered.forEach(t => {
          if (t.start_time) {
            const k = (t.start_time || '').toString().slice(0,5)
            cmap[k] = t.capacity ? parseInt(t.capacity) : null
          }
        })
        setCapacityMap(cmap)
      } else {
        // if no explicit turns, generate slots from page open/close and service duration
        const gen = []
        try {
          const duration = service && service.duration_minutes ? parseInt(service.duration_minutes) : null
          const open = page.open_time || null
          const close = page.close_time || null
          if (duration && open && close) {
            // create Date objects
            const startDt = new Date(d + 'T' + (open.length===8 ? open : open + ':00'))
            const closeDt = new Date(d + 'T' + (close.length===8 ? close : close + ':00'))
            let cur = new Date(startDt)
            let idx = 0
            while (true) {
              const end = new Date(cur.getTime() + duration * 60000)
              if (end > closeDt) break
              const hh = String(cur.getHours()).padStart(2,'0') + ':' + String(cur.getMinutes()).padStart(2,'0')
              gen.push({ id: `gen-${idx}-${hh}`, page_id: page.id, service_id: serviceId, date: d, start_time: hh, end_time: end.toTimeString().split(' ')[0] })
              idx++
              // step by duration
              cur = new Date(cur.getTime() + duration * 60000)
            }
          }
        } catch(e) {
          // ignore
        }
        setSlots(gen)
        setCapacityMap({})
      }
      // fetch reservations for this page/service/date and build reserved counts
      try{
        const r = await api.getReservations(page.id, serviceId, d)
        if (r && r.ok) {
          const map = {}
          // Prefer explicit reservations with counts; fall back to reservedMap booleans from backend
          if (Array.isArray(r.reservations) && r.reservations.length > 0) {
            r.reservations.forEach(rr => {
              const st = (rr.start_time||'').toString().slice(0,5)
              if (!st) return
              map[st] = (map[st]||0) + 1
            })
          } else if (r.reservedMap && typeof r.reservedMap === 'object') {
            Object.keys(r.reservedMap).forEach(k => {
              const st = (k||'').toString().slice(0,5)
              if (!st) return
              map[st] = 1
            })
          }
          setReservedMap(map)
        } else {
          setReservedMap({})
        }
      }catch(e){ setReservedMap({}) }
    }catch(e){ setSlots([]) }
  }

  // If user selected a date before the `page` was loaded, reload slots once page is available
  useEffect(()=>{
    if (date && page && page.id) {
      loadSlotsForDate(date)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, date])

  async function confirmReservation(){
    if (!selectedSlot) { setResStatus({ ok:false, message:'Seleccione un horario' }); return }
    try{
      setResLoading(true)
      const payload = { service_id: serviceId, date: selectedSlot.date, start_time: selectedSlot.start_time, customer_name: name, customer_phone: phone }
      const res = await api.createReservation(page.id, payload)
      setResStatus(res)
      if (res && res.ok) {
        // refresh slots/reservations to reflect new booking
        await loadSlotsForDate(selectedSlot.date)
      }
      setResLoading(false)
    }catch(e){ setResStatus({ ok:false, message:'Error de red' }) }
  }

  if (loading) return <div style={{ padding: 20 }}>Cargando...</div>
  if (error) return <div style={{ padding: 20, color: '#c55' }}>{error}</div>
  if (!service) return <div style={{ padding: 20 }}>Servicio no encontrado</div>

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 20 }}>
      { /* normalize backend-relative logo url for preview */ }
      {(() => {
        const resolvePublicUrl = (u) => {
          if (!u) return null
          if (/^https?:\/\//.test(u)) return u
          const base = 'http://localhost/LinkTiendas/Link%20Tienda'
          if (u.startsWith('/')) return base + u
          return base + '/' + u
        }
        const logoSrc = page && page.logo_url ? resolvePublicUrl(page.logo_url) : null
        const storeRoot = (page && (page.slug || page.id)) || store
        return (
          <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a href={`/${storeRoot || ''}`} style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
              {logoSrc && <img src={logoSrc} alt="logo" style={{ width:64,height:64,objectFit:'cover',borderRadius:8 }} />}
              <div style={{ marginLeft: 8 }}>
                <h2 style={{ margin:0 }}>{service.name}</h2>
                <div style={{ color:'#666' }}>{service.duration_minutes} min · {service.price ? `$${service.price}` : 'Precio no disponible'}</div>
              </div>
            </a>
          </header>
        )
      })()}

      <main style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:20, marginTop:12 }}>
        <div>
          <h3>Descripción</h3>
          <div>{service.description || 'Sin descripción.'}</div>
        </div>
        <aside style={{ border:'1px solid #eee', padding:12, borderRadius:8 }}>
          <h4>Reservar</h4>
          <div style={{ marginBottom:8 }}>
            <label>Fecha</label>
            <input type="date" value={date} onChange={e=>{ setDate(e.target.value); loadSlotsForDate(e.target.value) }} style={{ width:'100%', padding:8, marginTop:6 }} />
          </div>
          <div style={{ marginBottom:8 }}>
            <label>Horarios</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:6 }}>
              {slots.length === 0 ? <div style={{ color:'#666' }}>Seleccione una fecha para ver horarios</div> : slots.map(s => {
                const rawStart = (s.start_time||'').toString()
                const st = rawStart.slice(0,5)
                const reservedCount = (reservedMap[st] || reservedMap[rawStart] || reservedMap[st+':00'] || 0)
                const capacity = (capacityMap[st] || capacityMap[rawStart] || capacityMap[st+':00'] || null)
                const isFull = capacity && capacity > 0 && reservedCount >= capacity
                const isReserved = reservedCount > 0
                const isSelected = selectedSlot && selectedSlot.id === s.id
                const disabled = isFull || isReserved
                let bg = '#f5f5f5'
                let color = '#000'
                if (isSelected) { bg = '#2a9d8f'; color = '#fff' }
                else if (isFull) { bg = '#9b2b2b'; color = '#fff' }
                else if (isReserved) { bg = '#c0392b'; color = '#fff' }
                return (
                  <button
                    key={s.id}
                    onClick={()=>{ if (!disabled) setSelectedSlot(s) }}
                    disabled={disabled}
                    className={disabled ? 'reservado' : ''}
                    aria-disabled={disabled}
                    style={{ padding:'6px 10px', background: bg, color, border:'none', borderRadius:6, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.9 : 1 }}
                  >
                    {s.start_time}
                  </button>
                )
              })}
            </div>
            { /* debug UI removed for public view */ }
          </div>
          <div style={{ marginBottom:8 }}>
            <input placeholder="Nombre (opcional)" value={name} onChange={e=>setName(e.target.value)} style={{ width:'100%', padding:8, marginBottom:8 }} />
            <input placeholder="Teléfono (opcional)" value={phone} onChange={e=>setPhone(e.target.value)} style={{ width:'100%', padding:8 }} />
          </div>
          <div>
            <button onClick={confirmReservation} style={{ width:'100%', padding:10, background:'#2a9d8f', color:'#fff', border:'none', borderRadius:6 }}>Confirmar reserva</button>
          </div>
          {resStatus ? (
            <div style={{ marginTop:8, color: resStatus.ok ? '#2a9d8f' : '#c55' }}>{resStatus.ok ? 'Reserva confirmada' : (resStatus.message || 'Error')}</div>
          ) : null}
        </aside>
      </main>
    </div>
  )
}
