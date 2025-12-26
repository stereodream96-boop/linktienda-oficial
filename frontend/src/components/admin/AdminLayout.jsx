import React from 'react'
import AdminAside from './Aside'

export default function AdminLayout({ children }) {
  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      <AdminAside />
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  )
}
