/**
 * API 基础封装（个人中心 / 评论组件共用同一套约定）
 * 约定：
 *  - 线上：https://api.kamisheng.xyz
 *  - 本地调试：http://localhost:8080
 *  - 可用 window.__BLOG_API_BASE__ 覆盖
 */
const REMOTE = 'https://api.kamisheng.xyz'
const isLocal = () =>
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

export const apiBase = window.__BLOG_API_BASE__ || (isLocal() ? 'http://localhost:8080' : REMOTE)

export const tokenStore = {
  get: () => localStorage.getItem('token') || '',
  set: (v) => localStorage.setItem('token', v),
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
  clear: () => localStorage.removeItem('user'),
}

/**
 * 统一请求：自动带 Bearer token，按 Result 约定解析
 * 成功返回 payload（含 code/message/data）；失败抛 Error（status 401 时可据此跳登录）
 */
export async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const token = tokenStore.get()
  if (auth && token) headers.Authorization = `Bearer ${token}`

  // CF→源站偶发 525/5xx 与跨境慢连接：GET 幂等，重试一次；并加 12s 超时，避免一直停在加载态
  const MAX_TRIES = 3
  const canRetry = method === 'GET'
  let response
  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 12000)
    try {
      response = await fetch(apiBase + path, {
        method,
        headers,
        body: body == null ? undefined : JSON.stringify(body),
        signal: controller.signal,
      })
    } catch {
      clearTimeout(timer)
      if (canRetry && attempt < MAX_TRIES - 1) {
        await new Promise((r) => setTimeout(r, attempt ? 900 : 400))
        continue
      }
      throw new Error('网络连接失败，请检查网络后重试')
    }
    clearTimeout(timer)
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
  if (!response.ok || payload.code !== 200) {
    throw new Error(payload.message || `请求失败（HTTP ${response.status}）`)
  }
  return payload
}
