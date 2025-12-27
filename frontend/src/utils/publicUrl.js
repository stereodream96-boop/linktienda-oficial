// Helpers para construir URLs públicas (ajusta PUBLIC_ENTRY si tu public entry es distinto)
export const PUBLIC_ENTRY = '/index.php'

export function publicProductUrl(storeSlug, productId){
  return `${PUBLIC_ENTRY}?store=${encodeURIComponent(storeSlug)}&product=${productId}`
}

export function publicServiceUrl(storeSlug, serviceId){
  return `${PUBLIC_ENTRY}?store=${encodeURIComponent(storeSlug)}&service=${serviceId}`
}

export function publicPageUrl(slug){
  return `${PUBLIC_ENTRY}?slug=${encodeURIComponent(slug)}`
}
