import React from 'react'

function CategoriesSection({ categories = [] }) {
  return (
    <section className="categories-section">
      <div className="categories-inner">
        <div className="categories-grid">
          {categories.map((cat, i) => (
            <a
              key={i}
              href={cat.href || '#'}
              className="category-item"
              aria-label={cat.name}
            >
              <div className="category-thumb">
                <img
                  src={cat.image || ''}
                  alt={cat.name}
                  loading="lazy"
                />
              </div>
              <div className="category-title">{cat.name}</div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

export default CategoriesSection
