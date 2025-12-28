import React, { useState, useEffect } from 'react'
import styles from './StoreHeader.module.css'

export default function StoreHeader({ page = {}, storeSlug = '', onSearch = null }){
  const [search, setSearch] = useState('')

  useEffect(()=>{
    if (onSearch) onSearch(search)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const contact = (page && page.contact_info) || {}
  // prefer contact.store_name, otherwise page.title only if not equal to numeric slug
  const pageTitle = page && page.title ? String(page.title) : ''
  const safeTitle = (pageTitle && pageTitle !== storeSlug && !/^\d+$/.test(pageTitle)) ? pageTitle : ''
  const storeName = contact.store_name || safeTitle || 'Tienda'
  const logoUrl = page && page.logo_url ? page.logo_url : null
  // normalize logo src: if backend returned a relative path, make it absolute
  let logoSrc = null
  if (logoUrl) {
    try {
      const isAbsolute = /^(https?:)?\/\//.test(logoUrl)
      if (isAbsolute) logoSrc = logoUrl
      else {
        // backend files are served from Apache at http://localhost/LinkTiendas/Link%20Tienda
        const backendBase = 'http://localhost/LinkTiendas/Link%20Tienda'
        const rel = logoUrl.replace(/^\//, '')
        logoSrc = backendBase + '/' + rel
      }
    } catch (e) {
      logoSrc = logoUrl
    }
  }

  function initials(name){
    if(!name) return 'T'
    const parts = name.trim().split(/\s+/)
    if(parts.length === 1) return parts[0].slice(0,2).toUpperCase()
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }

  return (
    <div className={styles.storeHeader}>
      <div className={`${styles.mainBarSimple} ${page && page.promo_message ? styles.overlayBelowPromo : ''}`}>
        <div className={styles.container}>
          <div className={styles.brandSimple}>
            <a href={`/${(page && (page.slug || page.id)) || storeSlug}`} style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
              {logoSrc ? (
                <img src={logoSrc} alt="logo" className={styles.logo} />
              ) : (
                <div className={styles.logoPlaceholder}>{initials(storeName)}</div>
              )}
              <div className={styles.brandText}>
                <div className={styles.brandName}>{storeName}</div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
