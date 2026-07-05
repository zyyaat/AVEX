// AVEX Merchant - API client
let authToken: string | null = null
export function setAuthToken(t: string | null) {
  authToken = t
  if (typeof window !== 'undefined') {
    if (t) localStorage.setItem('avex_merchant_token', t)
    else localStorage.removeItem('avex_merchant_token')
  }
}
export function getAuthToken(): string | null {
  if (authToken) return authToken
  if (typeof window !== 'undefined') authToken = localStorage.getItem('avex_merchant_token')
  return authToken
}
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(endpoint, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export const merchantAuthAPI = {
  login: (data: { phone: string; password: string }) =>
    apiFetch<{ token: string; mustChangePassword: boolean; merchant: any }>('/api/merchant/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    apiFetch<{ success: boolean }>('/api/merchant/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),
  me: () => apiFetch<any>('/api/merchant/me'),
}

export const merchantAPI = {
  // Orders
  getOrders: (status?: string) => apiFetch<{ orders: any[] }>(`/api/merchant/orders${status ? `?status=${status}` : ''}`),
  getOrderItems: (id: string) => apiFetch<{ items: any[] }>(`/api/merchant/orders/${id}/items`),
  updateOrderStatus: (id: string, status: string) => apiFetch<{ success: boolean; status: string }>(`/api/merchant/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Menu
  getMenu: () => apiFetch<{ items: any[]; categories: any[] }>('/api/merchant/menu'),
  createMenuItem: (data: any) => apiFetch<{ id: string }>('/api/merchant/menu/items', { method: 'POST', body: JSON.stringify(data) }),
  updateMenuItem: (id: string, data: any) => apiFetch(`/api/merchant/menu/items/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteMenuItem: (id: string) => apiFetch(`/api/merchant/menu/items/${id}`, { method: 'DELETE' }),

  // Store
  getHours: () => apiFetch<{ hours: any[] }>('/api/merchant/hours'),
  updateHours: (hours: any[]) => apiFetch('/api/merchant/hours', { method: 'PUT', body: JSON.stringify({ hours }) }),
  togglePause: (isActive: boolean) => apiFetch<{ isActive: boolean }>('/api/merchant/pause', { method: 'PATCH', body: JSON.stringify({ isActive }) }),
  getStats: () => apiFetch<any>('/api/merchant/stats'),
  getScheduledOrders: () => apiFetch<{ scheduledOrders: any[] }>('/api/merchant/scheduled-orders'),
}
