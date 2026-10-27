const REMOTE = 'https://api.kamisheng.xyz'
const isLocal = () =>
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

export const apiBase = window.__BLOG_API_BASE__ || (isLocal() ? 'http://localhost:8080' : REMOTE)

export const tokenStore = {
  get: () => localStorage.getItem('token') || '',
  clear: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  },
}

export const userStore = {
  get: () => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null')
    } catch {
      return null
    }
  },
  set: (u) => localStorage.setItem('user', JSON.stringify(u)),
}

export async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const token = tokenStore.get()
  if (auth && token) headers.Authorization = `Bearer ${token}`

  // CF→源站偶发 525/5xx（跨境隧道抖动），GET 幂等，重试一次再报错；POST/DELETE 不重试
  const MAX_TRIES = 3
  const canRetry = method === 'GET'
  let response
  for (let attempt = 0; ; attempt++) {
    try {
      response = await fetch(apiBase + path, {
        method,
        headers,
        body: body == null ? undefined : JSON.stringify(body),
      })
    } catch (e) {
      if (canRetry && attempt < MAX_TRIES - 1) {
        await new Promise((r) => setTimeout(r, attempt ? 900 : 400))
        continue
      }
      throw new Error('网络连接失败，请检查网络后重试')
    }
    if (canRetry && attempt < MAX_TRIES - 1 && response.status >= 500) {
      await new Promise((r) => setTimeout(r, attempt ? 900 : 400))
      continue
    }
    break
  }

  const text = await response.text()
  let payload = {}
  try {
    payload = text ? JSON.parse(text) : {}
  } catch {
    payload = {}
  }

  if (response.status === 401) {
    const err = new Error(payload.message || '登录已过期，请重新登录')
    err.status = 401
    throw err
  }
  if (response.status === 404) {
    const err = new Error('评论服务尚未启用')
    err.status = 404
    throw err
  }
  if (!response.ok || payload.code !== 200) {
    throw new Error(payload.message || `请求失败（HTTP ${response.status}）`)
  }
  return payload
}
