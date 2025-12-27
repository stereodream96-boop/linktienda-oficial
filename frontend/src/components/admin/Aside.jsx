import React from 'react'
import './ModifyPages.css'

export default function AdminAside() {
  const goAdmin = () => {
    // simple behavior compatible with current app (querystring toggles admin)
    if (typeof window !== 'undefined') {
      // clear hash and search to go to admin home
      window.location.hash = '#admin-home'
    }
  }

  return (
    <aside className="admin-aside">
      <div className="admin-aside-top">
        <button onClick={goAdmin}>Ir a Admin</button>
      </div>
      <ul className="admin-aside-list">
        <li><a href="#admin-home">Inicio</a></li>
        <li><a href="#crear-paginas">Crear Páginas</a></li>
        <li><a href="#modificar-contenido">Modificar Contenido</a></li>
        <li><a href="#gestion">Gestión</a></li>
        <li><a href="#estadisticas">Estadísticas</a></li>
        <li><a href="#configuracion">Configuración</a></li>
      </ul>
    </aside>
  )
}
