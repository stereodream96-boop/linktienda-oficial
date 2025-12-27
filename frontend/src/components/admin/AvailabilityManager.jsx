import React, { useEffect, useState } from 'react'
import * as api from './adminApi'

export default function AvailabilityManager({ page }){
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [turns, setTurns] = useState([])
  const [services, setServices] = useState([])
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({ date:'', service_id:'', start_time:'', capacity:1, notes:'' })

  useEffect(()=>{ if(page && page.id){ loadServices(); } }, [page])
  async function loadServices(){ try{ const data = await api.getServices(page.id); if(data.ok) setServices(data.services||[]) }catch(e){}
  }

  async function search(){ setMsg(''); try{ const data = await api.getTurns(page.id, from, to); if(!data.ok) setMsg(data.message||'Error'); else setTurns(data.turns||[]) }catch(e){ setMsg('Error de red') } }

  async function createTurn(e){ e.preventDefault(); setMsg(''); try{ const payload = { service_id: parseInt(form.service_id), date: form.date, start_time: form.start_time, capacity: parseInt(form.capacity||1), notes: form.notes }; const data = await api.createTurn(page.id, payload); if(!data.ok) setMsg(data.message||'Error'); else { setForm({ date:'', service_id:'', start_time:'', capacity:1, notes:'' }); search() } }catch(e){ setMsg('Error de red') } }

  async function remove(id){ if(!confirm('Eliminar turno?')) return; try{ const data = await api.deleteTurn(id); if(!data.ok) setMsg(data.message||'Error'); else search() }catch(e){ setMsg('Error de red') } }

  async function onUpdate(id, payload){ try{ const data = await api.updateTurn(id, payload); if(!data.ok) setMsg(data.message||'Error'); else search() }catch(e){ setMsg('Error de red') } }

  return (
    <div style={{ marginTop: 12 }}>
      <h4>Turnos / Disponibilidad</h4>
      <div style={{ marginBottom: 8 }}>
        <label>From</label> <input type="date" value={from} onChange={e=>setFrom(e.target.value)} />
        <label style={{ marginLeft: 8 }}>To</label> <input type="date" value={to} onChange={e=>setTo(e.target.value)} />
        <button onClick={search} style={{ marginLeft: 8 }}>Buscar</button>
      </div>
      {msg && <div style={{ color:'#c55' }}>{msg}</div>}
      <form onSubmit={createTurn} style={{ marginBottom: 8 }}>
        <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} required />
        <select value={form.service_id} onChange={e=>setForm(f=>({...f,service_id:e.target.value}))} required>
          <option value="">Seleccione servicio</option>
          {services.map(s=> <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes}m)</option>)}
        </select>
        <input type="time" value={form.start_time} onChange={e=>setForm(f=>({...f,start_time:e.target.value}))} required />
        <input type="number" min={1} value={form.capacity} onChange={e=>setForm(f=>({...f,capacity:e.target.value}))} />
        <input placeholder="Notas" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} />
        <button type="submit">Crear turno</button>
      </form>

      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead><tr><th>Fecha</th><th>Inicio</th><th>Fin</th><th>Servicio</th><th>Cupos</th><th>Acciones</th></tr></thead>
        <tbody>
          {turns.map(t=> (
            <tr key={t.id} style={{ borderTop:'1px solid #eee' }}>
              <td>{t.date}</td>
              <td>{t.start_time}</td>
              <td>{t.end_time}</td>
              <td>{(services.find(s=>s.id==t.service_id)||{}).name || t.service_id}</td>
              <td>{t.capacity}</td>
              <td>
                <button onClick={()=>{ const newCap = prompt('Nuevo cupo', t.capacity); if(newCap!==null) onUpdate(t.id, { capacity: parseInt(newCap) }) }}>Cambiar cupo</button>
                <button onClick={()=>remove(t.id)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
