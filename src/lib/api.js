const TOKEN_KEY = 'rota-token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

async function request(path, options = {}) {
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  }

  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`/api${path}`, {
    ...options,
    headers,
  })

  if (options.raw) return res

  let body = null
  const text = await res.text()
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = { error: text }
    }
  }

  if (!res.ok) {
    const error = new Error(body?.error || 'İstek başarısız')
    error.status = res.status
    throw error
  }

  return body
}

export const api = {
  register: (payload) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request('/auth/me'),
  updateProfile: (payload) =>
    request('/auth/me', { method: 'PATCH', body: JSON.stringify(payload) }),
  getData: () => request('/data'),
  saveData: (data) =>
    request('/data', { method: 'PUT', body: JSON.stringify(data) }),
  listFiles: () => request('/files'),
  uploadFile: (file) => {
    const form = new FormData()
    form.append('file', file)
    return request('/files', { method: 'POST', body: form })
  },
  deleteFile: (id) => request(`/files/${id}`, { method: 'DELETE' }),
  downloadFile: async (id, filename) => {
    const res = await request(`/files/${id}/download`, { raw: true })
    if (!res.ok) {
      let message = 'İndirme başarısız'
      try {
        const body = await res.json()
        message = body.error || message
      } catch {
        /* ignore */
      }
      throw new Error(message)
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || 'dosya'
    a.click()
    URL.revokeObjectURL(url)
  },
  previousMonthReport: () => request('/reports/previous-month'),
  sendTestReport: () => request('/reports/send-test', { method: 'POST' }),
  wordbankMeta: () => request('/wordbank/meta'),
  wordbank: (params = {}) => {
    const q = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') q.set(k, String(v))
    })
    const qs = q.toString()
    return request(`/wordbank${qs ? `?${qs}` : ''}`)
  },
  setWordbankProgress: (id, status) =>
    request('/wordbank/progress', {
      method: 'PUT',
      body: JSON.stringify({ id, status }),
    }),
  wordbankDistractors: (excludeId, n = 3) =>
    request(
      `/wordbank/distractors?exclude=${encodeURIComponent(excludeId)}&n=${n}`,
    ),
  myShare: () => request('/me/share'),
  publicProfile: (code) => request(`/public/${encodeURIComponent(code)}`),
  sendReminderEmail: () => request('/reminders/email', { method: 'POST' }),
}

