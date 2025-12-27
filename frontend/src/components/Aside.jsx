import React from 'react'
import './Aside.css'

export default function Aside() {
  const navigate = (path) => {
    if (typeof window !== 'undefined') window.location.href = path
  }

  return (
    <aside className="lt-aside">
      <ul className="lt-aside-list">
        <li><a href="#crear-paginas">Crear Páginas</a></li>
        <li><a href="#modificar-contenido">Modificar Contenido</a></li>
        <li><a href="#gestion">Gestión</a></li>
        <li><a href="#estadisticas">Estadísticas</a></li>
        <li><a href="#configuracion">Configuración</a></li>
      </ul>

      <div className="lt-aside-cta">
        <button type="button" onClick={() => navigate('/admin')}>Administración</button>
      </div>
    </aside>
  )
}
