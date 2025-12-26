import React from 'react'

export default function PagesCarousel({ pages = [], selectedId = null, onSelect = () => {} }) {
  return (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '8px 0' }}>
      {pages.map((p) => {
        const active = selectedId === p.id
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            style={{
              minWidth: 200,
              padding: 12,
              background: active ? '#2b6ef6' : '#1f2937',
              color: active ? '#fff' : '#ddd',
              border: active ? '2px solid #1553c7' : '1px solid #333',
              borderRadius: 8,
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div style={{ fontWeight: '600', marginBottom: 6 }}>{p.title}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{p.slug || `id:${p.id}`}</div>
          </button>
        )
      })}
    </div>
  )
}
