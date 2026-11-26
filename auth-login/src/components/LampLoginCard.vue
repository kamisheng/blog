<template>
  <div
    ref="wrapEl"
    class="card-wrap"
    :class="{ off: dark, finale }"
    @pointermove="onTorchMove"
    @pointerdown="onDarkClick"
  >
    <form class="card" :class="{ shake: shaking }" @submit.prevent="handleSubmit" autocomplete="off">
      <!-- 登录 / 注册 切换 -->
      <div class="modes" role="tablist" aria-label="登录或注册">
        <button
          type="button"
          role="tab"
          :aria-selected="mode === 'login'"
          :class="{ on: mode === 'login' }"
          :disabled="loading || dark"
          @click="switchMode('login')"
        >登录</button>
        <button
          type="button"
          role="tab"
          :aria-selected="mode === 'register'"
          :class="{ on: mode === 'register' }"
          :disabled="loading || dark"
          @click="switchMode('register')"
        >注册</button>
        <span class="modes-ind" aria-hidden="true"></span>
      </div>

      <!-- 3D 翻面：正面登录 / 背面注册 -->
      <div class="flip">
        <div
          class="flip-inner"
          :class="{ back: mode === 'register' }"
          :style="{ height: faceHeight + 'px' }"
        >
          <!-- 正面：登录 -->
          <div class="face front" :inert="mode !== 'login' ? '' : null">
            <div ref="frontBody" class="face-body">
              <p class="eyebrow">{{ eyebrow }}</p>
              <h1 ref="frontTitle" class="wordmark" aria-label="夜深了，欢迎回来">
                <span
                  v-for="(ch, i) in loginChars"
                  :key="'l' + i"
                  class="ch"
                  :class="{ punct: isPunct(ch) }"
                >{{ ch }}</span>
              </h1>
              <p class="sub">{{ loginSub }}</p>

              <div class="field">
                <label for="user">账号</label>
                <input
                  id="user"
                  v-model="username"
                  name="user"
                  type="text"
                  placeholder="请输入账号"
                  autocomplete="username"
                  spellcheck="false"
                  :disabled="loading || dark"
                  @input="onTyping"
                />
              </div>

              <div class="field">
                <label for="pass">密码</label>
                <div class="pass-box">
                  <input
                    id="pass"
                    v-model="password"
                    name="pass"
                    :type="showPass ? 'text' : 'password'"
                    placeholder="请输入密码"
                    autocomplete="current-password"
                    :disabled="loading || dark"
                    @input="onTyping"
                    @focus="emit('peek')"
                    @blur="emit('idle')"
                  />
                  <button
                    type="button"
                    class="eye-toggle"
                    :aria-label="showPass ? T.hidePass : T.showPass"
                    :disabled="dark"
                    @click="showPass = !showPass"
                  >
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                      <circle cx="12" cy="12" r="3" />
                      <line v-if="!showPass" x1="4" y1="20" x2="20" y2="4" />
                    </svg>
                  </button>
                </div>
              </div>

              <p class="error" :class="{ show: errText }">{{ errText || ' ' }}</p>

              <div class="row">
                <label class="remember">
                  <input v-model="remember" type="checkbox" :disabled="loading || dark" />
                  <span>记住我</span>
                </label>
                <a href="#" class="forget" @click.prevent>忘记密码？</a>
              </div>

              <button type="submit" class="btn" :disabled="loading || dark">{{ frontBtnText }}</button>

              <p class="demo">
                <a class="signup-link" href="#" @click.prevent="switchMode('register')">还没有账号？去注册</a>
              </p>
            </div>
          </div>

          <!-- 背面：注册 -->
          <div class="face back" :inert="mode !== 'register' ? '' : null">
            <div ref="backBody" class="face-body">
              <p class="eyebrow">{{ eyebrow }}</p>
              <h1 ref="backTitle" class="wordmark" aria-label="第一次来，先登记一下">
                <span
                  v-for="(ch, i) in registerChars"
                  :key="'r' + i"
                  class="ch"
                  :class="{ punct: isPunct(ch) }"
                >{{ ch }}</span>
              </h1>
              <p class="sub">{{ registerSub }}</p>

              <div class="field">
                <label for="reg-user">账号</label>
                <input
                  id="reg-user"
                  v-model="username"
                  name="reg-user"
                  type="text"
                  placeholder="给自己起个名字"
                  autocomplete="username"
                  spellcheck="false"
                  :disabled="loading || dark"
                  @input="onTyping"
                />
              </div>

              <div class="field">
                <label for="reg-mail">邮箱</label>
                <input
                  id="reg-mail"
                  v-model.trim="email"
                  name="reg-mail"
                  type="email"
                  placeholder="用来找回账号"
                  autocomplete="email"
                  spellcheck="false"
                  :disabled="loading || dark"
                  @input="onTyping"
                />
              </div>

              <div class="field">
                <label for="reg-pass">密码</label>
                <div class="pass-box">
                  <input
                    id="reg-pass"
                    v-model="password"
                    name="reg-pass"
                    :type="showPass ? 'text' : 'password'"
                    placeholder="6-32 位"
                    autocomplete="new-password"
                    :disabled="loading || dark"
                    @input="onTyping"
                  />
                  <button
                    type="button"
                    class="eye-toggle"
                    :aria-label="showPass ? T.hidePass : T.showPass"
                    :disabled="dark"
                    @click="showPass = !showPass"
                  >
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                      <circle cx="12" cy="12" r="3" />
                      <line v-if="!showPass" x1="4" y1="20" x2="20" y2="4" />
                    </svg>
                  </button>
                </div>
              </div>

              <div class="field">
                <label for="reg-pass2">确认密码</label>
                <input
                  id="reg-pass2"
                  v-model="confirm"
                  name="reg-pass2"
                  type="password"
                  placeholder="再输入一次"
                  autocomplete="new-password"
                  :disabled="loading || dark"
                  @input="onTyping"
                />
              </div>

              <p class="error" :class="{ show: errText }">{{ errText || ' ' }}</p>

              <button type="submit" class="btn" :disabled="loading || dark">{{ backBtnText }}</button>

              <p class="demo">
                <a class="signup-link" href="#" @click.prevent="switchMode('login')">已经有账号了？去登录</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </form>

    <!-- 关灯后的“手电筒”微光 -->
    <div class="torch" aria-hidden="true"></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { T } from '../lib/lamp-i18n'

const props = defineProps({
  lampOn: Boolean,
  finale: Boolean,
})
const emit = defineEmits(['peek', 'idle', 'surprise', 'success', 'dark-poke'])

const wrapEl = ref(null)
const frontTitle = ref(null)
const backTitle = ref(null)
const frontBody = ref(null)
const backBody = ref(null)

const mode = ref('login')
const username = ref('')
const email = ref('')
const password = ref('')
const confirm = ref('')
const remember = ref(false)
const showPass = ref(false)
const loading = ref(false)
const shaking = ref(false)
const errText = ref('')
const btnKey = ref('btnLogin')

const dark = computed(() => !props.lampOn)
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ---------- 标题文案（随模式/明暗切换） ----------
const eyebrow = computed(() => (dark.value ? '▓▓▓▓ ▓▓▓▓ · ▓▓▓▓' : T.value.eyebrow))
const loginTitle = computed(() => (dark.value ? T.value.titleDark : T.value.title))
const registerTitle = computed(() => (dark.value ? T.value.titleDark : '第一次来，先登记一下'))
const loginSub = computed(() => (dark.value ? T.value.subDark : T.value.sub))
const registerSub = computed(() => (dark.value ? T.value.subDark : '建好账号就能在这间房间里留下痕迹'))

const PUNCT = '，。、,.；;：:！!？?·—'
const toChars = (text) => Array.from(text).map((c) => (c === ' ' ? '\u00A0' : c))
const loginChars = computed(() => toChars(loginTitle.value))
const registerChars = computed(() => toChars(registerTitle.value))
const isPunct = (c) => PUNCT.includes(c)

const frontBtnText = computed(() => {
  if (btnKey.value === 'btnWelcome') return T.value.btnWelcome
  if (loading.value) return T.value.btnLoading
  return T.value.btnLogin
})
const backBtnText = computed(() => (loading.value ? T.value.btnLoading : '注册'))

// ---------- 翻面高度同步 ----------
const frontH = ref(0)
const backH = ref(0)
const faceHeight = computed(() => (mode.value === 'login' ? frontH.value : backH.value))
let ro = null

function syncSizes() {
  if (frontBody.value) {
    const h = Math.ceil(frontBody.value.getBoundingClientRect().height)
    if (h > 0) frontH.value = h
  }
  if (backBody.value) {
    const h = Math.ceil(backBody.value.getBoundingClientRect().height)
    if (h > 0) backH.value = h
  }
}

// ---------- 磁吸标题（参考 G：字被光标吸过去） ----------
let mx = -9999
let my = -9999
let magnetRaf = 0

function onPointerMove(e) {
  if (reduced || dark.value || props.finale) return
  if (e.pointerType === 'touch') return
  mx = e.clientX
  my = e.clientY
  if (!magnetRaf) magnetRaf = requestAnimationFrame(applyMagnet)
}

function applyMagnet() {
  magnetRaf = 0
  const el = mode.value === 'login' ? frontTitle.value : backTitle.value
  if (!el) return
  const R = 150
  const chars = el.querySelectorAll('.ch')
  for (const ch of chars) {
    const r = ch.getBoundingClientRect()
    const dx = mx - (r.left + r.width / 2)
    const dy = my - (r.top + r.height / 2)
    const d = Math.hypot(dx, dy)
    if (d < R && d > 0.1) {
      const f = (1 - d / R) * 12
      ch.style.transform = `translate(${(dx / d) * f}px, ${(dy / d) * f}px)`
    } else {
      ch.style.transform = 'translate(0,0)'
    }
  }
}

// ---------- 打字火花（参考 G：光标处迸火花） ----------
let mirror = null
function ensureMirror() {
  if (mirror) return mirror
  mirror = document.createElement('span')
  mirror.style.cssText = 'position:fixed;left:-9999px;top:0;visibility:hidden;white-space:pre;pointer-events:none;'
  document.body.appendChild(mirror)
  return mirror
}

function caretX(input) {
  const m = ensureMirror()
  const cs = getComputedStyle(input)
  m.style.font = cs.font
  m.style.letterSpacing = cs.letterSpacing
  m.style.fontSize = cs.fontSize
  const val = input.value || ''
  const upto = input.selectionStart == null ? val.length : input.selectionStart
  m.textContent = input.type === 'password' ? '•'.repeat(upto) : val.slice(0, upto)
  const padLeft = parseFloat(cs.paddingLeft) || 0
  return padLeft + m.offsetWidth
}

function spawnSparks(x, y, n) {
  if (reduced) return
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span')
    s.className = 'typing-spark'
    const a = Math.random() * Math.PI * 2
    const dist = 18 + Math.random() * 26
    s.style.left = x + 'px'
    s.style.top = y + 'px'
    s.style.setProperty('--tx', (Math.cos(a) * dist).toFixed(0) + 'px')
    s.style.setProperty('--ty', (Math.sin(a) * dist).toFixed(0) + 'px')
    document.body.appendChild(s)
    setTimeout(() => s.remove(), 620)
  }
}

function onTyping(e) {
  if (reduced) return
  const input = e.target
  if (!input || !input.matches('input')) return
  const r = input.getBoundingClientRect()
  const x = r.left + Math.min(caretX(input), r.width - 6)
  spawnSparks(x, r.top + r.height / 2, input.type === 'password' ? 2 : 3)
}

// ---------- 黑暗中的手电筒 ----------
function setTorch(e) {
  if (!wrapEl.value) return
  const r = wrapEl.value.getBoundingClientRect()
  wrapEl.value.style.setProperty('--tx', `${e.clientX - r.left}px`)
  wrapEl.value.style.setProperty('--ty', `${e.clientY - r.top}px`)
}

function onTorchMove(e) {
  if (!dark.value) return
  setTorch(e)
}

let lastPoke = 0
function onDarkClick(e) {
  if (!dark.value) return
  setTorch(e)
  const now = Date.now()
  if (now - lastPoke < 1500) return
  lastPoke = now
  emit('dark-poke')
}

// ---------- 登录 ----------
function fail(key, msg) {
  errText.value = msg || T.value[key]
  shaking.value = false
  requestAnimationFrame(() => { shaking.value = true })
  setTimeout(() => { shaking.value = false }, 500)
  emit('surprise', errText.value)
}

function switchMode(next) {
  if (mode.value === next) return
  if (loading.value || dark.value) return
  mode.value = next
  errText.value = ''
  btnKey.value = 'btnLogin'
  showPass.value = false
}

const apiBase = window.__BLOG_API_BASE__ ||
  ((location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:8080'
    : 'https://api.kamisheng.xyz')

// CF→源站（跨境隧道）偶发 52x/5xx：这类错误说明请求没到后端，重试是安全的。
// 但网络层异常（fetch 抛错）对注册接口不重试——服务端可能已成功，重试会变「用户名已存在」。
const edgeFailure = (code) => code === 502 || code === 503 || code === 504 || (code >= 520 && code <= 525)

async function postJson(path, payload, { retryOnThrow = false, tries = 3 } = {}) {
  let lastErr = null
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      const res = await fetch(apiBase + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (edgeFailure(res.status) && attempt < tries - 1) {
        await new Promise((r) => setTimeout(r, attempt ? 900 : 400))
        continue
      }
      return res
    } catch (e) {
      lastErr = e
      if (!retryOnThrow || attempt === tries - 1) throw e
      await new Promise((r) => setTimeout(r, attempt ? 900 : 400))
    }
  }
  throw lastErr || new Error('request failed')
}

async function handleSubmit() {
  if (loading.value || dark.value) return
  errText.value = ''
  if (!username.value.trim() || !password.value.trim()) {
    fail('errEmpty')
    return
  }

  if (mode.value === 'register') {
    if (!email.value.trim()) { fail('errEmpty', '请填写邮箱'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) { fail('errWrong', '邮箱格式不正确'); return }
    if (password.value.length < 6 || password.value.length > 32) { fail('errWrong', '密码长度必须是 6-32 位'); return }
    if (password.value !== confirm.value) { fail('errWrong', '两次输入的密码不一致'); return }
  }

  loading.value = true
  btnKey.value = 'btnLoading'
  try {
    if (mode.value === 'register') {
      const regRes = await postJson('/api/auth/register', {
        username: username.value.trim(),
        email: email.value.trim(),
        password: password.value
      })
      const regJson = await regRes.json().catch(() => ({}))
      if (!regRes.ok || regJson.code !== 200) {
        throw new Error((regJson && regJson.message) || '注册失败')
      }
      mode.value = 'login'
      btnKey.value = 'btnLogin'
      loading.value = false
      confirm.value = ''
      errText.value = ''
      emit('surprise', '注册成功，可以用新账号登录了')
      return
    }

    const res = await postJson('/api/auth/login', {
      account: username.value.trim(),
      password: password.value,
      rememberMe: !!remember.value
    }, { retryOnThrow: true })
    const json = await res.json().catch(() => ({}))
    if (!res.ok || json.code !== 200 || !json.data || !json.data.token) {
      throw new Error((json && json.message) || T.value.errWrong)
    }
    localStorage.setItem('token', json.data.token)
    localStorage.setItem('user', JSON.stringify(json.data.user || {}))
    btnKey.value = 'btnWelcome'
    emit('success')
    setTimeout(() => {
      btnKey.value = 'btnLogin'
      loading.value = false
      password.value = ''
    }, 4200)
  } catch (err) {
    loading.value = false
    btnKey.value = 'btnLogin'
    const msg = err && err.message && err.message !== 'Failed to fetch'
      ? err.message
      : T.value.errWrong
    fail('errWrong', msg)
  }
}

onMounted(() => {
  syncSizes()
  nextTick(syncSizes)
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => syncSizes())
    if (frontBody.value) ro.observe(frontBody.value)
    if (backBody.value) ro.observe(backBody.value)
  }
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('resize', syncSizes)
})

onUnmounted(() => {
  if (ro) ro.disconnect()
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('resize', syncSizes)
  if (magnetRaf) cancelAnimationFrame(magnetRaf)
  if (mirror && mirror.parentNode) mirror.remove()
})
</script>

<style scoped>
.signup-link {
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px solid color-mix(in oklab, var(--accent) 60%, transparent);
  padding-bottom: 1px;
  transition: opacity 0.2s ease;
}
.signup-link:hover { opacity: 0.7; }

/* ---------- 登录/注册 切换 ---------- */
.modes {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 4px;
  margin-bottom: 20px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
}

.modes button {
  position: relative;
  z-index: 1;
  height: 34px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--ink-dim);
  font: inherit;
  font-size: 13.5px;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: color 0.25s ease;
}

.modes button.on {
  color: #0b0f16;
  font-weight: 700;
}

.modes-ind {
  position: absolute;
  top: 4px;
  left: 4px;
  z-index: 0;
  width: calc(50% - 6px);
  height: 34px;
  border-radius: 10px;
  background: linear-gradient(180deg,
    color-mix(in oklab, var(--accent) 88%, #fff 12%),
    var(--accent) 62%,
    color-mix(in oklab, var(--accent) 84%, #000 16%));
  box-shadow: 0 6px 18px color-mix(in oklab, var(--accent) 35%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
  transition: transform 0.32s cubic-bezier(0.34, 1.4, 0.64, 1);
}

.modes:has(button:nth-child(2).on) .modes-ind {
  transform: translateX(calc(100% + 4px));
}

/* ---------- 卡片外壳 ---------- */
.card-wrap {
  position: relative;
  width: 384px;
  transform-origin: left center;
  transition:
    opacity 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s,
    transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s;
}
.card-wrap.off {
  opacity: 0.6;
  transform: scale(0.985);
  cursor: pointer;
  touch-action: none;
  transition-delay: 0s;
}
.card-wrap.off .card {
  pointer-events: none;
  border-color: #1c2433;
  background: #0b101a;
  box-shadow: none;
  filter: saturate(0.15) brightness(0.55) blur(0.7px);
}
.card-wrap.finale {
  opacity: 0;
  transform: translateY(-26px) scale(0.95);
  pointer-events: none;
}

/* 黑暗中的手电筒：跟随鼠标的一小圈微光 */
.torch {
  position: absolute;
  inset: -14px;
  z-index: 2;
  border-radius: 28px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.7s ease;
  background: radial-gradient(
    circle 110px at var(--tx, 50%) var(--ty, 42%),
    transparent 0%,
    rgba(4, 7, 12, 0.55) 45%,
    rgba(4, 7, 12, 0.92) 72%
  );
}
.card-wrap.off .torch { opacity: 1; }

/* ---------- 磨砂暗玻璃卡片 ---------- */
.card {
  position: relative;
  padding: 24px 26px 22px;
  border-radius: 22px;
  border: 1px solid color-mix(in oklab, var(--accent) 26%, rgba(255, 255, 255, 0.16));
  background:
    linear-gradient(150deg,
      rgba(255, 255, 255, 0.10),
      rgba(255, 255, 255, 0.02) 42%,
      rgba(255, 255, 255, 0.05)),
    color-mix(in oklab, var(--card-bg) 62%, transparent);
  backdrop-filter: blur(22px) saturate(140%);
  -webkit-backdrop-filter: blur(22px) saturate(140%);
  box-shadow:
    0 30px 80px -28px rgba(0, 0, 0, 0.85),
    0 10px 30px -18px color-mix(in oklab, var(--accent-glow) 45%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.28),
    inset 0 -1px 0 rgba(255, 255, 255, 0.04);
  transition: border-color 0.7s ease, background 0.7s ease, box-shadow 0.7s ease, filter 0.7s ease;
}
/* 玻璃高光斜带 */
.card::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: linear-gradient(120deg,
    rgba(255, 255, 255, 0.20),
    transparent 28%,
    transparent 72%,
    rgba(255, 255, 255, 0.05));
  opacity: 0.6;
}
.card.shake { animation: shake 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97); }
@keyframes shake {
  10%, 90%      { transform: translateX(-1px); }
  20%, 80%      { transform: translateX(2px); }
  30%, 50%, 70% { transform: translateX(-4px); }
  40%, 60%      { transform: translateX(4px); }
}

/* ---------- 3D 翻面 ---------- */
.flip {
  position: relative;
  perspective: 1800px;
}
.flip-inner {
  position: relative;
  transform-style: preserve-3d;
  transition:
    transform 0.72s cubic-bezier(0.2, 0.75, 0.2, 1),
    height 0.62s cubic-bezier(0.2, 0.75, 0.2, 1);
  will-change: transform, height;
}
.flip-inner.back { transform: rotateY(180deg); }
.face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.face.back { transform: rotateY(180deg); }
.face-body { position: relative; }
.flip-inner:not(.back) .face.back { pointer-events: none; }
.flip-inner.back .face.front { pointer-events: none; }

/* ---------- 头部 ---------- */
.eyebrow {
  margin: 0 0 10px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 3px;
  color: color-mix(in oklab, var(--accent) 80%, var(--ink-dim));
  transition: color 0.6s;
}
.wordmark {
  margin: 0 0 6px;
  font-family: var(--font-display);
  font-weight: 900;
  font-size: 27px;
  letter-spacing: 2px;
  line-height: 1.2;
  color: var(--ink);
  user-select: none;
}
.wordmark .ch {
  display: inline-block;
  will-change: transform;
  transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1), color 0.35s;
}
.wordmark .ch.punct {
  color: var(--accent);
  text-shadow: 0 0 16px var(--accent-glow);
}
.sub {
  margin: 0 0 20px;
  font-size: 12.5px;
  color: var(--ink-dim);
  letter-spacing: 0.3px;
}

/* ---------- 玻璃输入框 ---------- */
.field { margin-bottom: 13px; }
.field label {
  display: block;
  font-size: 11.5px;
  color: var(--ink-dim);
  margin-bottom: 6px;
  letter-spacing: 0.4px;
}
.field input {
  width: 100%;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  color: var(--ink);
  font: inherit;
  font-size: 14px;
  outline: none;
  backdrop-filter: blur(6px);
  transition: border-color 0.25s, box-shadow 0.25s, background 0.25s;
}
.field input::placeholder { color: rgba(255, 255, 255, 0.32); }
.field input:disabled { opacity: 0.6; }
.field input:focus {
  border-color: color-mix(in oklab, var(--accent) 65%, rgba(255, 255, 255, 0.2));
  background: rgba(255, 255, 255, 0.075);
  box-shadow:
    0 0 0 3px color-mix(in oklab, var(--accent) 16%, transparent),
    0 0 24px -8px var(--accent-glow),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.pass-box { position: relative; }
.pass-box input { padding-right: 44px; }
.eye-toggle {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  border: 0;
  background: none;
  padding: 8px;
  color: var(--ink-dim);
  cursor: pointer;
  border-radius: 8px;
  display: flex;
  transition: color 0.25s;
}
.eye-toggle:hover { color: var(--accent); }

.error {
  margin: 0 0 4px;
  min-height: 16px;
  font-size: 12px;
  color: var(--danger);
  opacity: 0;
  transform: translateY(-3px);
  transition: opacity 0.25s, transform 0.25s;
}
.error.show { opacity: 1; transform: none; }

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.remember {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: var(--ink-dim);
  cursor: pointer;
  user-select: none;
}
.remember input {
  appearance: none;
  width: 15px;
  height: 15px;
  margin: 0;
  border: 1.5px solid rgba(255, 255, 255, 0.28);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  cursor: pointer;
  display: grid;
  place-content: center;
  transition: border-color 0.25s, background 0.25s;
}
.remember input::before {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 2px;
  background: #0a0f17;
  transform: scale(0);
  transition: transform 0.15s;
}
.remember input:checked {
  border-color: var(--accent);
  background: var(--accent);
}
.remember input:checked::before { transform: scale(1); }

.forget {
  font-size: 12px;
  color: var(--ink-dim);
  text-decoration: none;
  letter-spacing: 0.3px;
  transition: color 0.25s;
}
.forget:hover { color: var(--accent); }

/* ---------- 玻璃按钮 ---------- */
.btn {
  width: 100%;
  margin-top: 4px;
  padding: 13px 14px;
  border: 1px solid rgba(255, 255, 255, 0.30);
  border-radius: 12px;
  background: linear-gradient(180deg,
    color-mix(in oklab, var(--accent) 88%, #fff 12%),
    var(--accent) 62%,
    color-mix(in oklab, var(--accent) 84%, #000 16%));
  color: #0a0f17;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 2px;
  cursor: pointer;
  box-shadow:
    0 12px 30px -12px var(--accent-glow),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
  transition: filter 0.2s, transform 0.1s, box-shadow 0.3s;
}
.btn:hover:not(:disabled)  { filter: brightness(1.08); }
.btn:active:not(:disabled) { transform: translateY(1px); }
.btn:disabled { cursor: default; filter: saturate(0.85); }

.demo {
  margin: 14px 0 0;
  text-align: center;
  font-size: 11px;
  color: color-mix(in oklab, var(--ink-dim) 75%, transparent);
  letter-spacing: 0.3px;
}

@media (max-width: 820px) {
  .card-wrap { width: min(384px, 100%); }
}
</style>

<style>
/* 打字火花（追加到 body，需全局样式） */
.typing-spark {
  position: fixed;
  z-index: 80;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 10px var(--accent-glow);
  pointer-events: none;
  animation: typingSpark 0.58s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}
@keyframes typingSpark {
  from { transform: translate(0, 0) scale(1); opacity: 0.95; }
  to   { transform: translate(var(--tx), var(--ty)) scale(0.1); opacity: 0; }
}
</style>