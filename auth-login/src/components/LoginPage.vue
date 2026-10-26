<template>
  <div class="login-page" :style="{ '--login-bg-blur': `${loginBgBlur}px` }">
    <!-- 动态背景：极光光斑 + 网格 + 噪点 + 星点（不依赖任何图片） -->
    <!-- 动态背景：WebGL 丝绸（SilkBackground 组件） -->
    <SilkBackground tone="cool" />

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

          <button
            ref="submitButtonRef"
            type="submit"
            class="submit-button"
            :class="{ 'is-evasive': !isSubmitReady && !isLoading }"
            :disabled="isLoading"
            @click="handleSubmitButtonClick"
            @mousemove="handleSubmitMouseMove"
            @mouseleave="resetSubmitButton"
            @blur="resetSubmitButton"
          >
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

    <transition name="success-fade">
      <div v-if="loginSuccess && successUser" class="login-success">
        <div class="login-success-card">
          <div ref="successAvatarRef" class="login-success-avatar" :class="{ empty: !successUser.avatar }">
            <img v-if="successUser.avatar" :src="successUser.avatar" alt="" />
            <span v-else>{{ successInitial }}</span>
          </div>
          <div class="login-success-copy">
            <strong>登录成功</strong>
            <span>{{ successName }}，正在进入博客…</span>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import AnimatedCharacters from './AnimatedCharacters.vue'
import SilkBackground from './SilkBackground.vue'

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
const loginBgBlur = ref(0)
const successUser = ref(null)
const successAvatarRef = ref(null)
const errorMessage = ref('')
const errors = ref({})
const submitButtonRef = ref(null)
let submitButtonOffset = { x: 0, y: 0 }
let submitButtonTarget = { x: 0, y: 0 }
let lastDodgeAngle = -Math.PI / 2
let submitButtonAnimationFrame = 0

const applySubmitButtonTransform = () => {
  const button = submitButtonRef.value
  if (!button) return

  submitButtonOffset.x += (submitButtonTarget.x - submitButtonOffset.x) * 0.16
  submitButtonOffset.y += (submitButtonTarget.y - submitButtonOffset.y) * 0.16

  if (Math.abs(submitButtonOffset.x) < 0.35 && Math.abs(submitButtonOffset.y) < 0.35) {
    submitButtonOffset = { x: 0, y: 0 }
  }

  const ox = submitButtonOffset.x
  const oy = submitButtonOffset.y
  const rotateY = Math.max(-8, Math.min(8, ox * 0.11))
  const rotateX = Math.max(-8, Math.min(8, -oy * 0.11))
  button.style.transform = `translate3d(${ox}px, ${oy}px, 0) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
  button.style.boxShadow = Math.abs(ox) + Math.abs(oy) > 2
    ? `${-ox * 0.22}px ${Math.max(14, 24 - oy * 0.12)}px 34px rgba(40, 71, 186, 0.3)`
    : ''

  if (
    Math.abs(submitButtonTarget.x - submitButtonOffset.x) > 0.5
    || Math.abs(submitButtonTarget.y - submitButtonOffset.y) > 0.5
  ) {
    submitButtonAnimationFrame = window.requestAnimationFrame(applySubmitButtonTransform)
  } else {
    submitButtonAnimationFrame = 0
  }
}

const setSubmitButtonTarget = (x, y) => {
  submitButtonTarget = { x, y }
  if (!submitButtonAnimationFrame) {
    submitButtonAnimationFrame = window.requestAnimationFrame(applySubmitButtonTransform)
  }
}

const isRegister = computed(() => mode.value === 'register')
const successName = computed(() => {
  const u = successUser.value
  return (u && (u.nickname || u.username)) || '你'
})
const successInitial = computed(() => String(successName.value).slice(0, 1).toUpperCase())
const isSubmitReady = computed(() => {
  if (isRegister.value) {
    return /^[A-Za-z0-9_]{3,20}$/.test(username.value)
      && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)
      && password.value.length >= 6
      && password.value.length <= 32
      && password.value === confirmPassword.value
  }
  return account.value.trim() !== ''
    && password.value.length >= 6
    && password.value.length <= 32
})

const distanceBetween = (p1x, p1y, p2x, p2y) => {
  const dx = p1x - p2x
  const dy = p1y - p2y
  return Math.sqrt(dx * dx + dy * dy)
}

const resetSubmitButton = () => {
  const button = submitButtonRef.value
  if (!button) return
  setSubmitButtonTarget(0, 0)
}

const handleSubmitMouseMove = (event) => {
  const button = submitButtonRef.value
  if (!button || isLoading.value) return

  if (isSubmitReady.value) {
    resetSubmitButton()
    return
  }

  const rect = button.getBoundingClientRect()
  const bx = rect.left + rect.width / 2
  const by = rect.top + rect.height / 2
  const radius = Math.max(button.offsetWidth * 1.9, button.offsetHeight * 3.2, 220)
  const dist = distanceBetween(event.clientX, event.clientY, bx, by)

  if (dist > radius) {
    resetSubmitButton()
    return
  }

  const rawAngle = Math.atan2(event.clientY - by, event.clientX - bx)
  const angle = dist < 42 ? lastDodgeAngle : (lastDodgeAngle * 0.82 + rawAngle * 0.18)
  lastDodgeAngle = angle
  const strength = Math.max(radius - dist, 0) / radius
  const maxMove = window.innerWidth <= 520 ? 54 : 118
  const move = maxMove * strength
  const maxX = window.innerWidth <= 520 ? 70 : 150
  const maxY = window.innerWidth <= 520 ? 44 : 92
  setSubmitButtonTarget(
    Math.max(-maxX, Math.min(maxX, -Math.cos(angle) * move)),
    Math.max(-maxY, Math.min(maxY, -Math.sin(angle) * move))
  )
}

const dodgeSubmitButton = () => {
  const button = submitButtonRef.value
  if (!button) return

  const direction = Math.random() > 0.5 ? 1 : -1
  const isSmallScreen = window.innerWidth <= 520
  const ox = direction * (isSmallScreen ? 44 + Math.random() * 18 : 96 + Math.random() * 42)
  const oy = isSmallScreen ? -18 - Math.random() * 18 : -28 - Math.random() * 34
  setSubmitButtonTarget(ox, oy)
}

const handleSubmitButtonClick = (event) => {
  if (isLoading.value || isSubmitReady.value) return

  event.preventDefault()
  event.stopPropagation()
  validateForm()
  dodgeSubmitButton()
}

const switchMode = (nextMode) => {
  mode.value = nextMode
  errorMessage.value = ''
  errors.value = {}
  loginFailed.value = false
  loginSuccess.value = false
  resetSubmitButton()
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

let loginVirtualScroll = 0
let loginTouchStartY = 0
let loginBgFrame = 0

const loginBlurThreshold = () => Math.min(window.innerHeight * 0.5, 240)

const updateLoginBgBlur = () => {
  loginBgFrame = 0
  const threshold = loginBlurThreshold()
  const scrollTop = Math.max(window.scrollY || window.pageYOffset || 0, loginVirtualScroll)
  loginBgBlur.value = scrollTop >= threshold ? 15 : 0
}

const scheduleLoginBgBlur = () => {
  if (loginBgFrame) return
  loginBgFrame = window.requestAnimationFrame(updateLoginBgBlur)
}

const onLoginWheel = (event) => {
  const threshold = loginBlurThreshold()
  if (event.deltaY > 0) {
    loginVirtualScroll = Math.min(loginVirtualScroll + event.deltaY, threshold * 2)
  } else {
    loginVirtualScroll = Math.max(0, loginVirtualScroll + event.deltaY)
  }
  scheduleLoginBgBlur()
}

const onLoginTouchStart = (event) => {
  if (event.touches && event.touches.length) {
    loginTouchStartY = event.touches[0].clientY
  }
}

const onLoginTouchMove = (event) => {
  if (!event.touches || !event.touches.length) return
  const threshold = loginBlurThreshold()
  const delta = loginTouchStartY - event.touches[0].clientY
  loginVirtualScroll = Math.max(0, Math.min(delta, threshold * 2))
  scheduleLoginBgBlur()
}

const goHome = () => {
  const redirect = new URLSearchParams(window.location.search).get('redirect')
  // 只接受站内路径，避免开放重定向
  const safe = redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/'
  window.location.href = safe
}

const playSuccessFly = async () => {
  const el = successAvatarRef.value
  if (!el || !successUser.value) {
    goHome()
    return
  }
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    goHome()
    return
  }

  await nextTick()
  const rect = el.getBoundingClientRect()
  if (!rect.width) {
    goHome()
    return
  }

  const targetSize = 30
  const scale = targetSize / rect.width
  const navWidth = Math.min(window.innerWidth - 48, 1200)
  const targetX = (window.innerWidth + navWidth) / 2 - (window.innerWidth < 768 ? 70 : 170)
  const targetY = window.innerWidth < 768 ? 34 : 52
  const dx = targetX - (rect.left + rect.width / 2)
  const dy = targetY - (rect.top + rect.height / 2)

  const animation = el.animate([
    { transform: 'translate(0, 0) scale(1)', opacity: 1 },
    {
      transform: `translate(${dx * 0.74}px, ${dy * 0.74}px) scale(${scale * 1.14})`,
      opacity: 1,
      offset: 0.72,
    },
    {
      transform: `translate(${dx}px, ${dy}px) scale(${scale})`,
      opacity: 0.96,
    },
  ], {
    duration: 1050,
    easing: 'cubic-bezier(.2, .85, .25, 1)',
    fill: 'forwards',
  })

  try {
    await animation.finished
  } catch (e) {
    /* 动画被取消也继续跳转 */
  }
  goHome()
}

onMounted(() => {
  window.addEventListener('scroll', scheduleLoginBgBlur, { passive: true })
  window.addEventListener('wheel', onLoginWheel, { passive: true })
  window.addEventListener('touchstart', onLoginTouchStart, { passive: true })
  window.addEventListener('touchmove', onLoginTouchMove, { passive: true })
  updateLoginBgBlur()
})

onUnmounted(() => {
  window.removeEventListener('scroll', scheduleLoginBgBlur)
  window.removeEventListener('wheel', onLoginWheel)
  window.removeEventListener('touchstart', onLoginTouchStart)
  window.removeEventListener('touchmove', onLoginTouchMove)
  if (loginBgFrame) window.cancelAnimationFrame(loginBgFrame)
})

const handleSubmit = async () => {
  resetSubmitButton()
  if (!validateForm()) return

  isLoading.value = true
  errorMessage.value = ''
  loginFailed.value = false
  loginSuccess.value = false
  successUser.value = null

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
    successUser.value = payload.data.user
    sessionStorage.setItem('blog-login-fly', '1')
    setTimeout(playSuccessFly, 650)
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
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 100vh;
  overflow-x: hidden;
  isolation: isolate;
}

.login-page::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  background: radial-gradient(120% 80% at 18% 0%, #151b36 0%, #0a0e1d 46%, #05070e 100%);
  pointer-events: none;
}

/* ---------- 背景遮罩与层级 ---------- */
.login-page::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background:
    radial-gradient(90% 70% at 20% 30%, rgba(4, 6, 16, 0.1), rgba(4, 6, 16, 0.62) 78%),
    linear-gradient(100deg, rgba(4, 6, 16, 0.55), rgba(4, 6, 16, 0.28) 45%, rgba(4, 6, 16, 0.62));
}

.left-section {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: linear-gradient(90deg, rgba(6, 9, 18, 0.45), transparent 72%);
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
  position: absolute;
  left: 50%;
  bottom: 6.5rem;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: min(88%, 620px);
  height: 420px;
  transform: translateX(-50%);
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

.blur-circle-2 {
  bottom: 16%;
  left: 12%;
  width: 22rem;
  height: 22rem;
  background: rgba(99, 102, 241, 0.2);
}

.right-section {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: transparent;
}

.form-wrapper {
  position: relative;
  width: 100%;
  max-width: 440px;
  padding: 2.25rem 2rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  background: linear-gradient(158deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04) 55%, rgba(124, 108, 255, 0.1));
  box-shadow:
    0 30px 80px rgba(3, 6, 18, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.28);
  backdrop-filter: blur(26px) saturate(150%);
  -webkit-backdrop-filter: blur(26px) saturate(150%);
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
  padding: 0.3rem;
  margin-bottom: 2rem;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 14px;
  backdrop-filter: blur(8px);
}

.mode-button {
  height: 2.5rem;
  border: 0;
  border-radius: 0.55rem;
  color: rgba(255, 255, 255, 0.78);
  background: transparent;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  text-shadow: 0 2px 10px rgba(8, 12, 24, 0.45);
}

.mode-button.active {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.22);
  box-shadow: 0 8px 18px rgba(8, 12, 24, 0.16);
}

.form-header {
  text-align: center;
  margin-bottom: 2rem;
}

.form-title {
  margin-bottom: 0.5rem;
  color: #ffffff;
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.015em;
  text-shadow: 0 3px 14px rgba(8, 12, 24, 0.5);
}

.form-subtitle {
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9rem;
  text-shadow: 0 2px 10px rgba(8, 12, 24, 0.45);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow: visible;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.form-input {
  width: 100%;
  height: 3rem;
  padding: 0 1rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  outline: none;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.08);
  font-size: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}

.form-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.form-input:focus {
  border-color: rgba(139, 124, 255, 0.95);
  background: rgba(255, 255, 255, 0.12);
  box-shadow: 0 0 0 4px rgba(124, 108, 255, 0.2);
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
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.875rem;
  cursor: pointer;
  text-shadow: 0 2px 10px rgba(8, 12, 24, 0.45);
}

.checkbox {
  width: 1rem;
  height: 1rem;
  accent-color: #7c6cff;
}

.forgot-link {
  color: #ffffff;
  font-size: 0.875rem;
  font-weight: 700;
  text-decoration: none;
  text-shadow: 0 2px 10px rgba(8, 12, 24, 0.45);
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
  height: 3rem;
  gap: 0.55rem;
  border-radius: 0.65rem;
  font-size: 1rem;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
}

.submit-button {
  align-self: center;
  width: min(100%, 260px);
  z-index: 1;
  border: 0;
  color: #ffffff;
  border-radius: 14px;
  background: linear-gradient(135deg, #7c6cff, #5d3fd3 62%, #4f46e5);
  box-shadow: 0 16px 34px rgba(93, 63, 211, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.32);
  transform: translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg);
  transform-style: preserve-3d;
  will-change: transform, box-shadow;
  transition: transform 0.18s ease-out, box-shadow 0.18s ease-out, background 0.2s, opacity 0.2s;
}

.submit-button:hover:not(:disabled):not(.is-evasive) {
  transform: translateY(-2px);
  box-shadow: 0 14px 24px rgba(40, 71, 186, 0.24);
}

.submit-button.is-evasive {
  background: linear-gradient(135deg, #2847ba, #3b5bdb);
  cursor: not-allowed;
}

.submit-button.is-evasive::before {
  content: "";
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.28), transparent 45%, rgba(255, 255, 255, 0.16));
  opacity: 0.72;
  pointer-events: none;
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

.submit-button:hover:not(:disabled):not(.is-evasive) .button-icon {
  transform: translateX(6px);
}

.divider {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 1rem;
  margin: 1.4rem 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.85rem;
  text-shadow: 0 2px 10px rgba(8, 12, 24, 0.45);
}

.divider span {
  height: 1px;
  background: rgba(255, 255, 255, 0.58);
}

.divider b {
  font-weight: 600;
}

.ghost-button {
  width: 100%;
  border: 1.5px solid rgba(255, 255, 255, 0.62);
  color: #ffffff;
  background: rgba(255, 255, 255, 0.12);
  box-shadow: 0 12px 28px rgba(8, 12, 24, 0.16);
  backdrop-filter: blur(8px);
}

.ghost-button:hover {
  background: rgba(255, 255, 255, 0.22);
  border-color: rgba(255, 255, 255, 0.82);
}

.api-note {
  margin-top: 1.2rem;
  color: rgba(255, 255, 255, 0.82);
  font-size: 0.75rem;
  text-align: center;
  text-shadow: 0 2px 10px rgba(8, 12, 24, 0.45);
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

/* 登录成功：头像飞入导航栏 */
.login-success {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(6, 10, 20, 0.38);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.login-success-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 24px 18px 18px;
  border-radius: 24px;
  background: rgba(18, 24, 40, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.22);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
  color: #fff;
  animation: successCardIn 0.55s cubic-bezier(0.2, 0.9, 0.3, 1.2) both;
}
.login-success-avatar {
  width: 76px;
  height: 76px;
  border-radius: 50%;
  overflow: hidden;
  display: grid;
  place-items: center;
  flex: none;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  font-size: 28px;
  font-weight: 800;
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.1);
}
.login-success-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.login-success-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.login-success-copy strong {
  font-size: 18px;
  letter-spacing: 0.01em;
}
.login-success-copy span {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.68);
}
.success-fade-enter-active,
.success-fade-leave-active {
  transition: opacity 0.22s ease;
}
.success-fade-enter-from,
.success-fade-leave-to {
  opacity: 0;
}
@keyframes successCardIn {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.92);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@media (max-width: 520px) {
  .login-success-card {
    gap: 12px;
    padding: 14px 18px 14px 14px;
  }
  .login-success-avatar {
    width: 62px;
    height: 62px;
    font-size: 23px;
  }
  .login-success-copy strong {
    font-size: 16px;
  }
  .login-success-copy span {
    font-size: 12px;
  }
}
</style>
