<template>
  <div class="login-page">
    <section class="left-section" aria-label="品牌插画区域">
      <div class="logo-section">
        <a href="/" class="logo-link" aria-label="返回博客首页">
          <span class="logo-mark">@</span>
          <span>kami_Sheng</span>
        </a>
      </div>

      <div class="characters-section">
        <AnimatedCharacters
          :isTyping="isTyping"
          :showPassword="showPassword"
          :passwordLength="password.length"
          :loginFailed="loginFailed"
          :loginSuccess="loginSuccess"
        />
      </div>

      <div class="footer-links">
        <a href="/" class="footer-link">博客首页</a>
        <a href="/about/" class="footer-link">关于我</a>
      </div>

      <div class="grid-overlay"></div>
      <div class="blur-circle blur-circle-1"></div>
      <div class="blur-circle blur-circle-2"></div>
    </section>

    <main class="right-section">
      <div class="form-wrapper">
        <a href="/" class="mobile-logo" aria-label="返回博客首页">
          <span class="logo-mark">@</span>
          <span>kami_Sheng</span>
        </a>

        <div class="mode-switch" role="tablist" aria-label="认证模式">
          <button type="button" class="mode-button" :class="{ active: mode === 'login' }" @click="switchMode('login')">
            登录
          </button>
          <button type="button" class="mode-button" :class="{ active: mode === 'register' }" @click="switchMode('register')">
            注册
          </button>
        </div>

        <header class="form-header">
          <h1 class="form-title">{{ isRegister ? '创建博客账号' : '登录到博客' }}</h1>
          <p class="form-subtitle">
            {{ isRegister ? '填写信息后即可开通个人账号' : '使用账号或邮箱进入你的博客空间' }}
          </p>
        </header>

        <form class="login-form" @submit.prevent="handleSubmit">
          <div v-if="isRegister" class="form-group">
            <label for="username" class="form-label">用户名</label>
            <input
              id="username"
              v-model.trim="username"
              type="text"
              placeholder="3-20 位字母、数字或下划线"
              class="form-input"
              autocomplete="username"
              @focus="isTyping = true"
              @blur="isTyping = false"
            />
            <p v-if="errors.username" class="error-message">{{ errors.username }}</p>
          </div>

          <div class="form-group">
            <label :for="isRegister ? 'email' : 'account'" class="form-label">
              {{ isRegister ? '邮箱' : '账号或邮箱' }}
            </label>
            <input
              v-if="isRegister"
              id="email"
              v-model.trim="email"
              type="email"
              placeholder="you@example.com"
              class="form-input"
              autocomplete="email"
              @focus="isTyping = true"
              @blur="isTyping = false"
            />
            <input
              v-else
              id="account"
              v-model.trim="account"
              type="text"
              placeholder="请输入用户名或邮箱"
              class="form-input"
              autocomplete="username"
              @focus="isTyping = true"
              @blur="isTyping = false"
            />
            <p v-if="errors.account" class="error-message">{{ errors.account }}</p>
            <p v-if="errors.email" class="error-message">{{ errors.email }}</p>
          </div>

          <div class="form-group">
            <label for="password" class="form-label">密码</label>
            <div class="password-wrapper">
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="请输入 6-32 位密码"
                class="form-input"
                :autocomplete="isRegister ? 'new-password' : 'current-password'"
                @focus="isTyping = true"
                @blur="isTyping = false"
              />
              <button type="button" class="password-toggle" :aria-label="showPassword ? '隐藏密码' : '显示密码'" @click="showPassword = !showPassword">
                <svg v-if="showPassword" class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <svg v-else class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                  <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                  <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                  <line x1="2" x2="22" y1="2" y2="22"/>
                </svg>
              </button>
            </div>
            <p v-if="errors.password" class="error-message">{{ errors.password }}</p>
          </div>

          <div v-if="isRegister" class="form-group">
            <label for="confirmPassword" class="form-label">确认密码</label>
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              :type="showPassword ? 'text' : 'password'"
              placeholder="请再次输入密码"
              class="form-input"
              autocomplete="new-password"
            />
            <p v-if="errors.confirmPassword" class="error-message">{{ errors.confirmPassword }}</p>
          </div>

          <div v-if="!isRegister" class="form-options">
            <label class="checkbox-label">
              <input v-model="rememberMe" type="checkbox" class="checkbox" />
              <span>保持登录 7 天</span>
            </label>
            <a href="/" class="forgot-link">返回博客</a>
          </div>

          <div v-if="errorMessage" class="error-alert">
            {{ errorMessage }}
          </div>

          <button type="submit" class="submit-button" :disabled="isLoading">
            <span class="button-text">
              {{ isLoading ? (isRegister ? '注册中...' : '登录中...') : (isRegister ? '创建账号' : '登录') }}
            </span>
            <svg class="button-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14"/>
              <path d="m12 5 7 7-7 7"/>
            </svg>
          </button>
        </form>

        <div class="divider">
          <span></span>
          <b>或</b>
          <span></span>
        </div>

        <button type="button" class="ghost-button" @click="switchMode(isRegister ? 'login' : 'register')">
          {{ isRegister ? '已有账号，去登录' : '暂无账号，立即注册' }}
        </button>

        <p class="api-note">
          当前接口：{{ apiBase }}
        </p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import AnimatedCharacters from './AnimatedCharacters.vue'

const apiBase = window.__BLOG_API_BASE__
  || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8080'
    : 'https://api.kamisheng.xyz')

const mode = ref(new URLSearchParams(window.location.search).get('mode') === 'register' ? 'register' : 'login')
const username = ref('')
const email = ref('')
const account = ref('')
const password = ref('')
const confirmPassword = ref('')
const rememberMe = ref(true)
const showPassword = ref(false)
const isTyping = ref(false)
const isLoading = ref(false)
const loginFailed = ref(false)
const loginSuccess = ref(false)
const errorMessage = ref('')
const errors = ref({})

const isRegister = computed(() => mode.value === 'register')

const switchMode = (nextMode) => {
  mode.value = nextMode
  errorMessage.value = ''
  errors.value = {}
  loginFailed.value = false
  loginSuccess.value = false
  const url = new URL(window.location.href)
  if (nextMode === 'register') {
    url.searchParams.set('mode', 'register')
  } else {
    url.searchParams.delete('mode')
  }
  window.history.replaceState({}, '', url)
}

const validateForm = () => {
  const nextErrors = {}

  if (isRegister.value) {
    if (!/^[A-Za-z0-9_]{3,20}$/.test(username.value)) {
      nextErrors.username = '用户名必须是 3-20 位字母、数字或下划线'
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      nextErrors.email = '请输入正确的邮箱'
    }
    if (password.value !== confirmPassword.value) {
      nextErrors.confirmPassword = '两次输入的密码不一致'
    }
  } else if (!account.value) {
    nextErrors.account = '请输入账号或邮箱'
  }

  if (password.value.length < 6 || password.value.length > 32) {
    nextErrors.password = '密码长度必须是 6-32 位'
  }

  errors.value = nextErrors
  return Object.keys(nextErrors).length === 0
}

const parseResponse = async (response) => {
  const text = await response.text()
  const payload = text ? JSON.parse(text) : {}
  if (!response.ok || payload.code !== 200) {
    throw new Error(payload.message || '请求失败')
  }
  return payload
}

const callApi = async (path, body) => {
  const response = await fetch(`${apiBase}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  return parseResponse(response)
}

const handleSubmit = async () => {
  if (!validateForm()) return

  isLoading.value = true
  errorMessage.value = ''
  loginFailed.value = false
  loginSuccess.value = false

  try {
    const payload = isRegister.value
      ? await callApi('/api/auth/register', {
        username: username.value,
        email: email.value,
        password: password.value,
      })
      : await callApi('/api/auth/login', {
        account: account.value,
        password: password.value,
        rememberMe: rememberMe.value,
      })

    loginSuccess.value = true

    if (isRegister.value) {
      account.value = username.value
      password.value = ''
      confirmPassword.value = ''
      switchMode('login')
      errorMessage.value = payload.message || '注册成功，请登录'
      return
    }

    localStorage.setItem('token', payload.data.token)
    localStorage.setItem('user', JSON.stringify(payload.data.user))
    setTimeout(() => {
      window.location.href = '/'
    }, 650)
  } catch (error) {
    errorMessage.value = error.message || '操作失败，请稍后再试'
    loginFailed.value = true
    setTimeout(() => {
      loginFailed.value = false
    }, 3000)
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.login-page {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 100vh;
  max-height: 100vh;
  overflow: hidden;
  background: #ffffff;
}

.left-section {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background:
    radial-gradient(circle at 72% 22%, rgba(94, 234, 212, 0.18), transparent 28%),
    radial-gradient(circle at 22% 78%, rgba(124, 58, 237, 0.2), transparent 32%),
    linear-gradient(145deg, #11192f 0%, #1f3a8a 58%, #2448c5 100%);
  padding: 3rem;
  color: white;
}

.logo-section,
.characters-section,
.footer-links {
  position: relative;
  z-index: 20;
}

.logo-link,
.mobile-logo {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  font-size: 1.125rem;
  font-weight: 700;
  text-decoration: none;
  color: inherit;
}

.logo-mark {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.14);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
}

.characters-section {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  height: 520px;
}

.footer-links {
  display: flex;
  align-items: center;
  gap: 2rem;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.72);
}

.footer-link {
  color: inherit;
  text-decoration: none;
  transition: color 0.2s;
}

.footer-link:hover {
  color: #ffffff;
}

.grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.055) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.055) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: linear-gradient(90deg, rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.4));
}

.blur-circle {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
}

.blur-circle-1 {
  top: 16%;
  right: 10%;
  width: 18rem;
  height: 18rem;
  background: rgba(45, 212, 191, 0.16);
}

.blur-circle-2 {
  bottom: 16%;
  left: 12%;
  width: 22rem;
  height: 22rem;
  background: rgba(99, 102, 241, 0.2);
}

.right-section {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: white;
}

.form-wrapper {
  width: 100%;
  max-width: 430px;
}

.mobile-logo {
  display: none;
  justify-content: center;
  margin-bottom: 2rem;
  color: #111827;
}

.mode-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.25rem;
  padding: 0.25rem;
  margin-bottom: 2rem;
  background: #f3f4f6;
  border-radius: 0.75rem;
}

.mode-button {
  height: 2.5rem;
  border: 0;
  border-radius: 0.55rem;
  color: #6b7280;
  background: transparent;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-button.active {
  color: #111827;
  background: #ffffff;
  box-shadow: 0 8px 18px rgba(17, 24, 39, 0.08);
}

.form-header {
  text-align: center;
  margin-bottom: 2rem;
}

.form-title {
  margin-bottom: 0.5rem;
  color: #111827;
  font-size: 1.875rem;
  font-weight: 800;
}

.form-subtitle {
  color: #6b7280;
  font-size: 0.9rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  color: #374151;
  font-size: 0.875rem;
  font-weight: 700;
}

.form-input {
  width: 100%;
  height: 3rem;
  padding: 0 1rem;
  border: 1.5px solid #e5e7eb;
  border-radius: 0.65rem;
  outline: none;
  color: #111827;
  background: #ffffff;
  font-size: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus {
  border-color: #3153d8;
  box-shadow: 0 0 0 4px rgba(49, 83, 216, 0.1);
}

.password-wrapper {
  position: relative;
}

.password-wrapper .form-input {
  padding-right: 2.75rem;
}

.password-toggle {
  position: absolute;
  top: 50%;
  right: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: 0;
  color: #9ca3af;
  background: transparent;
  cursor: pointer;
  transform: translateY(-50%);
}

.password-toggle:hover {
  color: #111827;
}

.icon {
  width: 20px;
  height: 20px;
}

.error-message {
  color: #dc2626;
  font-size: 0.82rem;
}

.form-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #4b5563;
  font-size: 0.875rem;
  cursor: pointer;
}

.checkbox {
  width: 1rem;
  height: 1rem;
  accent-color: #3153d8;
}

.forgot-link {
  color: #3153d8;
  font-size: 0.875rem;
  font-weight: 700;
  text-decoration: none;
}

.forgot-link:hover {
  text-decoration: underline;
}

.error-alert {
  padding: 0.75rem 0.9rem;
  border: 1px solid rgba(220, 38, 38, 0.24);
  border-radius: 0.65rem;
  color: #b91c1c;
  background: rgba(254, 242, 242, 0.95);
  font-size: 0.875rem;
}

.submit-button,
.ghost-button {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 3rem;
  gap: 0.55rem;
  border-radius: 0.65rem;
  font-size: 1rem;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
}

.submit-button {
  border: 0;
  color: #ffffff;
  background: #2847ba;
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 14px 24px rgba(40, 71, 186, 0.24);
}

.submit-button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.button-icon {
  width: 20px;
  height: 20px;
  transition: transform 0.2s;
}

.submit-button:hover:not(:disabled) .button-icon {
  transform: translateX(6px);
}

.divider {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 1rem;
  margin: 1.4rem 0;
  color: #9ca3af;
  font-size: 0.85rem;
}

.divider span {
  height: 1px;
  background: #e5e7eb;
}

.divider b {
  font-weight: 600;
}

.ghost-button {
  border: 1.5px solid #e5e7eb;
  color: #111827;
  background: #ffffff;
}

.ghost-button:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.api-note {
  margin-top: 1.2rem;
  color: #9ca3af;
  font-size: 0.75rem;
  text-align: center;
}

@media (max-width: 1024px) {
  .login-page {
    grid-template-columns: 1fr;
    max-height: none;
  }

  .left-section {
    display: none;
  }

  .right-section {
    min-height: 100vh;
    padding: 1.5rem;
  }

  .mobile-logo {
    display: flex;
  }
}

@media (max-width: 520px) {
  .form-wrapper {
    max-width: none;
  }

  .form-title {
    font-size: 1.55rem;
  }

  .api-note {
    word-break: break-all;
  }
}
</style>
