const BASE = 'http://localhost/LinkTiendas/Link%20Tienda/backend/api'

async function request(url, opts = {}){
  try{
    const res = await fetch(url, opts)
    // read raw text (use clone to avoid consuming body for downstream json())
    const raw = await res.clone().text()
    let data = null
    try {
      data = raw && raw.length ? JSON.parse(raw) : null
    } catch (err) {
      // fallback: attempt res.json() if parse from raw failed
      try { data = await res.json() } catch (e2) { data = null }
    }
    // debug: verbose logging removed for production; keep conditional hook if needed
    // If you want to enable logging during development, uncomment the next line:
    // console.debug('[adminApi]', url, 'status', res.status, 'raw:', raw, 'parsed:', data)
    return data
  }catch(e){
    console.error('[adminApi] Network error for', url, e)
    throw new Error('Network error')
  }
}

export async function getPages(){ return request(`${BASE}/pages.php`) }

export async function getInventory(pageId){ return request(`${BASE}/inventory.php?page_id=${pageId}`) }
export async function getProduct(productId){ return request(`${BASE}/inventory.php?action=get&id=${productId}`) }
export async function createProduct(pageId, payload){ return request(`${BASE}/inventory.php?action=create`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ page_id: pageId, ...payload }) }) }
export async function updateProduct(id, payload){ return request(`${BASE}/inventory.php?action=update`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id, ...payload }) }) }
export async function deleteProduct(id){ return request(`${BASE}/inventory.php?action=delete`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id }) }) }

export async function uploadLogo(pageId, file){
  const fd = new FormData(); fd.append('page_id', pageId); fd.append('logo', file);
  const res = await fetch(`${BASE}/upload_logo.php`, { method: 'POST', body: fd });
  try { return await res.json() } catch(e) { throw new Error('Network error') }
}

export async function uploadCategoryImage(pageId, categoryName, file){
  const fd = new FormData(); fd.append('page_id', pageId); fd.append('category_name', categoryName); fd.append('image', file);
  const res = await fetch(`${BASE}/upload_category_image.php`, { method: 'POST', body: fd });
  try { return await res.json() } catch(e) { throw new Error('Network error') }
}

export async function uploadImages(files){
  const fd = new FormData();
  for (let i=0;i<files.length;i++) fd.append('images[]', files[i]);
  const res = await fetch(`${BASE}/upload_images.php`, { method: 'POST', body: fd });
  try { return await res.json() } catch(e) { throw new Error('Network error') }
}

export async function uploadServiceImage(serviceId, file){
  const fd = new FormData(); fd.append('service_id', serviceId); fd.append('image', file);
  const res = await fetch(`${BASE}/upload_service_image.php`, { method: 'POST', body: fd });
  try { return await res.json() } catch(e) { throw new Error('Network error') }
}

export async function deleteServiceImage(serviceId, imageUrl){
  const fd = new FormData(); fd.append('service_id', serviceId); fd.append('image_url', imageUrl);
  const res = await fetch(`${BASE}/delete_service_image.php`, { method: 'POST', body: fd });
  try { return await res.json() } catch(e) { throw new Error('Network error') }
}

export async function getServices(pageId){ return request(`${BASE}/services.php?page_id=${pageId}`) }
export async function getService(serviceId){ return request(`${BASE}/services.php?action=get&id=${serviceId}`) }
export async function createService(pageId, payload){ return request(`${BASE}/services.php?action=create`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ page_id: pageId, ...payload }) }) }
export async function updateService(id, payload){ return request(`${BASE}/services.php?action=update`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id, ...payload }) }) }
export async function deleteService(id){ return request(`${BASE}/services.php?action=delete`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id }) }) }

export async function getTurns(pageId, from, to){ let qs = `?page_id=${pageId}`; if(from) qs += `&from=${from}`; if(to) qs += `&to=${to}`; return request(`${BASE}/availability.php${qs}`) }
export async function createTurn(pageId, payload){ return request(`${BASE}/availability.php?action=create`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ page_id: pageId, ...payload }) }) }
export async function updateTurn(id, payload){ return request(`${BASE}/availability.php?action=update`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id, ...payload }) }) }
export async function deleteTurn(id){ return request(`${BASE}/availability.php?action=delete`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id }) }) }
export async function createReservation(pageId, payload){ return request(`${BASE}/reservations.php?action=create`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ page_id: pageId, ...payload }) }) }
export async function getReservations(pageId, serviceId, date){ let qs = `?page_id=${pageId}&service_id=${serviceId}`; if(date) qs += `&date=${date}`; return request(`${BASE}/reservations.php${qs}`) }

export default {
  getPages, getInventory, createProduct, updateProduct, deleteProduct,
  getProduct,
  getServices, getService, createService, updateService, deleteService,
  getTurns, createTurn, updateTurn, deleteTurn
  , createReservation
}
