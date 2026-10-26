<template>
  <div class="bp-page">
    <main class="bp-wrap">
      <div v-if="loading" class="state-card">
        <span class="spinner"></span>
        正在加载你的资料…
      </div>

      <div v-else-if="loadError" class="state-card error-card">
        <p class="error-title">资料加载失败</p>
        <p class="error-text">{{ loadError }}</p>
        <div class="error-actions">
          <button class="ghost" @click="load">重新加载</button>
          <a class="ghost" href="/login/">重新登录</a>
        </div>
      </div>

      <template v-else>
        <section class="profile-card">
          <div class="avatar-ring">
            <img v-if="avatarUrl && !avatarBroken" :src="avatarUrl" alt="头像" @error="avatarBroken = true" />
            <span v-else class="avatar-fallback">{{ initial }}</span>
          </div>

          <h1 class="display-name">{{ displayName }}</h1>
          <p class="account">@{{ user.username }}</p>
          <span class="role-badge" :class="{ admin: isAdmin }">{{ roleLabel }}</span>
          <p class="bio">{{ user.bio || '这个人很懒，还没有写简介～' }}</p>

          <dl class="meta">
            <div class="meta-row">
              <dt>邮箱</dt>
              <dd>{{ user.email }}</dd>
            </div>
            <div class="meta-row">
              <dt>注册时间</dt>
              <dd>{{ formatDate(user.createdAt) }}</dd>
            </div>
          </dl>

          <button class="logout" type="button" :disabled="loggingOut" @click="logout">
            {{ loggingOut ? '正在退出…' : '退出登录' }}
          </button>
        </section>

        <section class="edit-card">
          <header class="edit-head">
            <h2>编辑资料</h2>
            <p>用户名和邮箱暂不支持修改</p>
          </header>

          <form class="form" @submit.prevent="save">
            <div class="field">
              <label for="nickname">昵称 <span class="count">{{ form.nickname.length }}/64</span></label>
              <input
                id="nickname"
                v-model.trim="form.nickname"
                type="text"
                maxlength="64"
                placeholder="1-64 个字符"
              />
            </div>

            <div class="field">
              <label for="avatar">头像 URL <span class="count">{{ form.avatar.length }}/500</span></label>
              <input
                id="avatar"
                v-model.trim="form.avatar"
                type="url"
                maxlength="500"
                placeholder="https://…（留空则使用默认头像）"
              />
            </div>

            <div class="field">
              <label for="bio">个人简介 <span class="count">{{ form.bio.length }}/500</span></label>
              <textarea
                id="bio"
                v-model="form.bio"
                maxlength="500"
                rows="4"
                placeholder="介绍一下自己吧…"
              ></textarea>
            </div>

            <p v-if="formError" class="msg error">{{ formError }}</p>
            <p v-if="savedMsg" class="msg ok">{{ savedMsg }}</p>

            <button class="primary" type="submit" :disabled="saving">
              {{ saving ? '保存中…' : '保存修改' }}
            </button>
          </form>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { apiBase, request, tokenStore, userStore } from './api'

const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const loggingOut = ref(false)
const formError = ref('')
const savedMsg = ref('')
const avatarBroken = ref(false)
const user = ref({})

const form = reactive({ nickname: '', avatar: '', bio: '' })

const avatarUrl = computed(() => {
  const fromForm = (form.avatar || '').trim()
  return fromForm || user.value.avatar || ''
})
const displayName = computed(() => user.value.nickname || user.value.username || '')
const initial = computed(() => (displayName.value || '?').slice(0, 1).toUpperCase())
const isAdmin = computed(() => user.value.role === 'ADMIN')
const roleLabel = computed(() => (isAdmin.value ? '管理员' : '普通用户'))

const formatDate = (value) => {
  if (!value) return '—'
  const d = Array.isArray(value) ? new Date(value[0], value[1] - 1, value[2], value[3] || 0, value[4] || 0, value[5] || 0) : new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const fillForm = (u) => {
  form.nickname = u.nickname || ''
  form.avatar = u.avatar || ''
  form.bio = u.bio || ''
}

const load = async () => {
  if (!tokenStore.get()) {
    window.location.replace('/login/')
    return
  }
  loading.value = true
  loadError.value = ''
  try {
    const payload = await request('/api/auth/me')
    user.value = payload.data || {}
    fillForm(user.value)
    userStore.set(user.value)
  } catch (error) {
    if (error.status === 401) {
      tokenStore.clear()
      window.location.replace('/login/')
      return
    }
    loadError.value = error.message
  } finally {
    loading.value = false
  }
}

const save = async () => {
  formError.value = ''
  savedMsg.value = ''
  const nickname = (form.nickname || '').trim()
  const avatar = (form.avatar || '').trim()
  const bio = (form.bio || '').trim()

  if (!nickname || nickname.length > 64) {
    formError.value = '昵称长度必须是 1-64 位'
    return
  }
  if (avatar && avatar.length > 500) {
    formError.value = '头像地址不能超过 500 位'
    return
  }
  if (avatar && !/^https?:\/\//.test(avatar)) {
    formError.value = '头像地址必须以 http(s):// 开头'
    return
  }
  if (bio.length > 500) {
    formError.value = '个人简介不能超过 500 位'
    return
  }

  saving.value = true
  try {
    const payload = await request('/api/auth/profile', {
      method: 'PUT',
      body: { nickname, avatar: avatar || null, bio: bio || null },
    })
    user.value = { ...user.value, ...(payload.data || {}), nickname, avatar: avatar || null, bio: bio || null }
    userStore.set(user.value)
    fillForm(user.value)
    savedMsg.value = '保存成功，已更新你的资料'
    setTimeout(() => (savedMsg.value = ''), 4000)
  } catch (error) {
    if (error.status === 401) {
      tokenStore.clear()
      window.location.replace('/login/')
      return
    }
    formError.value = error.message
  } finally {
    saving.value = false
  }
}

const logout = async () => {
  loggingOut.value = true
  try {
    await request('/api/auth/logout', { method: 'POST' })
  } catch {
    /* token 可能已过期，忽略，直接清理本地状态 */
  } finally {
    tokenStore.clear()
    userStore.clear()
    window.location.replace('/')
  }
}

onMounted(load)
</script>

<style scoped>
:global(*) {
  box-sizing: border-box;
}
.bp-page {
  width: 100%;
  color: #111827;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
.bp-wrap {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 24px;
  width: 100%;
  max-width: 1040px;
  margin: 0 auto;
  align-items: start;
}
.state-card {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 220px;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 10px 30px rgba(17, 24, 39, 0.06);
  color: #6b7280;
}
.spinner {
  width: 22px;
  height: 22px;
  border: 3px solid #e5e7eb;
  border-top-color: #2847ba;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.error-card {
  flex-direction: column;
  gap: 8px;
  text-align: center;
  padding: 32px;
}
.error-title {
  margin: 0;
  color: #b91c1c;
  font-weight: 800;
  font-size: 18px;
}
.error-text {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}
.error-actions {
  display: flex;
  gap: 12px;
  margin-top: 10px;
}
.ghost {
  padding: 9px 18px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  background: #fff;
  color: #374151;
  font-size: 14px;
  text-decoration: none;
  cursor: pointer;
}
.ghost:hover {
  border-color: #2847ba;
  color: #2847ba;
}
.profile-card,
.edit-card {
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 10px 30px rgba(17, 24, 39, 0.06);
}
.profile-card {
  padding: 32px 28px;
  text-align: center;
  position: sticky;
  top: 24px;
}
.avatar-ring {
  width: 96px;
  height: 96px;
  margin: 0 auto 14px;
  border-radius: 50%;
  padding: 4px;
  background: linear-gradient(135deg, #2847ba, #4c6ef5, #2dd4bf);
  box-shadow: 0 12px 24px rgba(40, 71, 186, 0.22);
}
.avatar-ring img,
.avatar-fallback {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: block;
  object-fit: cover;
  border: 3px solid #fff;
  background: #eef2ff;
}
.avatar-fallback {
  display: grid;
  place-items: center;
  color: #2847ba;
  font-size: 34px;
  font-weight: 800;
}
.display-name {
  margin: 6px 0 2px;
  font-size: 22px;
  font-weight: 800;
}
.account {
  margin: 0 0 10px;
  color: #9ca3af;
  font-size: 13px;
}
.role-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 999px;
  background: #eef2ff;
  color: #2847ba;
  font-size: 12px;
  font-weight: 700;
}
.role-badge.admin {
  background: #fef3c7;
  color: #b45309;
}
.bio {
  margin: 14px 0 18px;
  color: #4b5563;
  font-size: 14px;
  line-height: 1.7;
  word-break: break-word;
}
.meta {
  margin: 0 0 22px;
  padding: 14px 16px;
  border-radius: 14px;
  background: #f9fafb;
  text-align: left;
}
.meta-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
  font-size: 13px;
}
.meta-row dt {
  color: #9ca3af;
}
.meta-row dd {
  margin: 0;
  color: #374151;
  word-break: break-all;
  text-align: right;
}
.logout {
  width: 100%;
  height: 42px;
  border: 1px solid #fecaca;
  border-radius: 12px;
  background: #fff5f5;
  color: #dc2626;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}
.logout:hover:not(:disabled) {
  background: #fee2e2;
}
.logout:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.edit-card {
  padding: 30px 32px;
}
.edit-head h2 {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 800;
}
.edit-head p {
  margin: 0 0 24px;
  color: #9ca3af;
  font-size: 13px;
}
.field {
  margin-bottom: 18px;
}
.field label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 7px;
  color: #374151;
  font-size: 14px;
  font-weight: 700;
}
.count {
  color: #9ca3af;
  font-weight: 400;
  font-size: 12px;
}
.field input,
.field textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1.5px solid #e5e7eb;
  border-radius: 12px;
  outline: none;
  font-size: 15px;
  color: #111827;
  background: #fff;
  transition: border-color 0.2s, box-shadow 0.2s;
  resize: vertical;
}
.field input:focus,
.field textarea:focus {
  border-color: #2847ba;
  box-shadow: 0 0 0 4px rgba(40, 71, 186, 0.1);
}
.msg {
  margin: 2px 0 14px;
  font-size: 13px;
}
.msg.error {
  color: #dc2626;
}
.msg.ok {
  color: #059669;
}
.primary {
  width: 100%;
  height: 46px;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(135deg, #2847ba, #4c6ef5);
  color: #fff;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 10px 20px rgba(40, 71, 186, 0.25);
  transition: transform 0.15s, box-shadow 0.2s;
}
.primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 14px 26px rgba(40, 71, 186, 0.3);
}
.primary:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
@media (max-width: 860px) {
  .bp-wrap {
    grid-template-columns: 1fr;
  }
  .profile-card {
    position: static;
  }
}
@media (max-width: 520px) {
  .bp-wrap {
    padding: 0;
  }
  .edit-card {
    padding: 22px 20px;
  }
}
</style>
