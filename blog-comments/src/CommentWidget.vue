<template>
  <section class="kami-comments">
    <header class="kc-head">
      <h3>评论<span v-if="!loading && !commentsDisabled" class="kc-total">{{ total }}</span></h3>
      <p class="kc-sub">友善交流，理性发言</p>
    </header>

    <!-- 发表框 -->
    <div v-if="commentsDisabled" class="kc-tip">
      评论系统正在准备中，敬请期待…
    </div>

    <div v-else-if="!loggedIn" class="kc-tip">
      <span>登录后即可参与评论</span>
      <a class="kc-btn primary" :href="loginHref">去登录</a>
    </div>

    <form v-else class="kc-editor" @submit.prevent="submit()">
      <div class="kc-identity">
        <a class="kc-avatar-link" href="/profile/" title="进入个人中心" aria-label="进入个人中心">
          <span class="kc-avatar small" :class="{ empty: !me?.avatar || broken['me'] }">
            <img v-if="me?.avatar && !broken['me']" class="not-markdown" :src="me.avatar" alt="" @error="broken['me'] = true" />
            <span v-else>{{ initial(me) }}</span>
          </span>
        </a>
        <span>以 <b>{{ displayName(me) }}</b> 的身份评论</span>
      </div>
      <textarea
        v-model="draft"
        maxlength="1000"
        placeholder="说点什么吧…"
        :disabled="posting"
      ></textarea>
      <div class="kc-editor-foot">
        <span class="kc-count">{{ draft.length }}/1000</span>
        <button class="kc-btn primary" :disabled="posting || !draft.trim()">
          {{ posting ? '发表中…' : '发表评论' }}
        </button>
      </div>
    </form>

    <!-- 列表状态 -->
    <div v-if="loading" class="kc-state">评论加载中…</div>
    <div v-else-if="error" class="kc-state error">{{ error }}</div>
    <div v-else-if="!commentsDisabled && !tops.length" class="kc-state empty">
      还没有评论，来抢沙发吧～
    </div>

    <!-- 评论列表 -->
    <ul v-if="!loading && !commentsDisabled" class="kc-list">
      <li v-for="c in tops" :key="c.id" class="kc-item">
        <span class="kc-avatar" :class="{ empty: !c.user?.avatar || broken[c.id] }">
          <img v-if="c.user?.avatar && !broken[c.id]" :src="c.user.avatar" alt="" @error="broken[c.id] = true" />
          <span v-else>{{ initial(c.user) }}</span>
        </span>

        <div class="kc-body">
          <div class="kc-meta">
            <span class="kc-name">{{ displayName(c.user) }}</span>
            <span v-if="isAdminUser(c.user)" class="kc-tag admin">管理员</span>
            <span v-if="c.replyToId" class="kc-reply-to">回复 <b>@{{ replyToName(c) }}</b></span>
            <time class="kc-time">{{ timeAgo(c.createdAt) }}</time>
          </div>
          <p class="kc-content">{{ c.content }}</p>

          <div class="kc-actions">
            <button v-if="loggedIn" type="button" class="kc-link" @click="startReply(c)">回复</button>
            <button v-if="canDelete(c)" type="button" class="kc-link danger" @click="remove(c)">删除</button>
          </div>

          <form v-if="replyTarget && replyTarget.id === c.id" class="kc-reply-editor" @submit.prevent="submitReply()">
            <textarea
              v-model="replyDraft"
              maxlength="1000"
              :placeholder="`回复 ${displayName(c.user)}…`"
              :disabled="posting"
            ></textarea>
            <div class="kc-reply-actions">
              <button type="button" class="kc-link" @click="cancelReply">取消</button>
              <button class="kc-btn primary small" :disabled="posting || !replyDraft.trim()">
                {{ posting ? '发送中…' : '回复' }}
              </button>
            </div>
          </form>

          <ul v-if="children(c.id).length" class="kc-children">
            <li v-for="r in children(c.id)" :key="r.id" class="kc-item child">
              <span class="kc-avatar small" :class="{ empty: !r.user?.avatar || broken[r.id] }">
                <img v-if="r.user?.avatar && !broken[r.id]" :src="r.user.avatar" alt="" @error="broken[r.id] = true" />
                <span v-else>{{ initial(r.user) }}</span>
              </span>
              <div class="kc-body">
                <div class="kc-meta">
                  <span class="kc-name">{{ displayName(r.user) }}</span>
                  <span v-if="isAdminUser(r.user)" class="kc-tag admin">管理员</span>
                  <span v-if="r.replyToId" class="kc-reply-to">回复 <b>@{{ replyToName(r) }}</b></span>
                  <time class="kc-time">{{ timeAgo(r.createdAt) }}</time>
                </div>
                <p class="kc-content">{{ r.content }}</p>
                <div class="kc-actions">
                  <button v-if="loggedIn" type="button" class="kc-link" @click="startReply(r)">回复</button>
                  <button v-if="canDelete(r)" type="button" class="kc-link danger" @click="remove(r)">删除</button>
                </div>
                <form v-if="replyTarget && replyTarget.id === r.id" class="kc-reply-editor" @submit.prevent="submitReply()">
                  <textarea
                    v-model="replyDraft"
                    maxlength="1000"
                    :placeholder="`回复 ${displayName(r.user)}…`"
                    :disabled="posting"
                  ></textarea>
                  <div class="kc-reply-actions">
                    <button type="button" class="kc-link" @click="cancelReply">取消</button>
                    <button class="kc-btn primary small" :disabled="posting || !replyDraft.trim()">
                      {{ posting ? '发送中…' : '回复' }}
                    </button>
                  </div>
                </form>
              </div>
            </li>
          </ul>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { request, tokenStore, userStore } from './api'

const props = defineProps({
  path: { type: String, required: true },
})

const comments = ref([])
const loading = ref(true)
const error = ref('')
const commentsDisabled = ref(false)
const draft = ref('')
const replyDraft = ref('')
const replyTarget = ref(null)
const posting = ref(false)
const me = ref(userStore.get())
const broken = reactive({})

const loggedIn = ref(Boolean(tokenStore.get()))
const loginHref = computed(() => `/login/?redirect=${encodeURIComponent(props.path)}`)
const total = computed(() => comments.value.length)
const tops = computed(() => comments.value.filter((c) => !c.parentId))
const children = (id) => comments.value.filter((c) => c.parentId === id)

const displayName = (u) => (u && (u.nickname || u.username)) || '匿名用户'
const initial = (u) => displayName(u).slice(0, 1).toUpperCase()
const isAdminUser = (u) => u && u.role === 'ADMIN'
const canDelete = (c) => {
  const mine = me.value && c.user && c.user.id === me.value.id
  return Boolean(mine || (me.value && me.value.role === 'ADMIN'))
}

const replyToName = (c) => {
  if (!c || !c.replyToId) return ''
  const target = comments.value.find((item) => item.id === c.replyToId)
  return target ? displayName(target.user) : '已删除'
}

const timeAgo = (value) => {
  if (!value) return ''
  const d = Array.isArray(value)
    ? new Date(value[0], value[1] - 1, value[2], value[3] || 0, value[4] || 0, value[5] || 0)
    : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} 天前`
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const refreshMe = async () => {
  if (!tokenStore.get()) {
    me.value = null
    loggedIn.value = false
    return
  }
  try {
    const payload = await request('/api/auth/me')
    me.value = payload.data || null
    if (me.value) userStore.set(me.value)
  } catch (e) {
    if (e.status === 401) {
      tokenStore.clear()
      me.value = null
      loggedIn.value = false
    }
    /* 其他错误保留本地 user 兜底 */
  }
}

const loadComments = async () => {
  loading.value = true
  error.value = ''
  try {
    const payload = await request(`/api/comments?path=${encodeURIComponent(props.path)}`)
    comments.value = Array.isArray(payload.data) ? payload.data : []
    commentsDisabled.value = false
  } catch (e) {
    if (e.status === 404) {
      commentsDisabled.value = true
    } else {
      error.value = e.message || '评论加载失败'
    }
  } finally {
    loading.value = false
  }
}

const postComment = async (content, parentId, replyToId) => {
  if (!content) return false
  if (content.length > 1000) {
    error.value = '评论内容不能超过 1000 字'
    return false
  }
  posting.value = true
  error.value = ''
  try {
    await request('/api/comments', {
      method: 'POST',
      body: {
        path: props.path,
        content,
        parentId: parentId || null,
        replyToId: replyToId || null,
      },
    })
    await loadComments()
    return true
  } catch (e) {
    if (e.status === 401) {
      tokenStore.clear()
      me.value = null
      loggedIn.value = false
      error.value = '登录已过期，请重新登录后再评论'
    } else {
      error.value = e.message || '发表失败，请稍后重试'
    }
    return false
  } finally {
    posting.value = false
  }
}

const submit = async () => {
  const content = draft.value.trim()
  if (!content) return
  if (await postComment(content, null, null)) {
    draft.value = ''
  }
}

const submitReply = async () => {
  const target = replyTarget.value
  if (!target) return
  const content = replyDraft.value.trim()
  if (!content) return
  const parentId = target.parentId || target.id
  const replyToId = target.parentId ? target.id : null
  if (await postComment(content, parentId, replyToId)) {
    replyTarget.value = null
    replyDraft.value = ''
  }
}

const startReply = (c) => {
  replyTarget.value = replyTarget.value && replyTarget.value.id === c.id ? null : c
  replyDraft.value = ''
}

const cancelReply = () => {
  replyTarget.value = null
  replyDraft.value = ''
}

const remove = async (c) => {
  const hasChildren = children(c.id).length > 0
  const tip = hasChildren ? '确定删除这条评论？它下面的回复也会一起删除。' : '确定删除这条评论？'
  if (!window.confirm(tip)) return
  try {
    await request(`/api/comments/${c.id}`, { method: 'DELETE' })
    await loadComments()
  } catch (e) {
    if (e.status === 401) {
      tokenStore.clear()
      error.value = '登录已过期，请重新登录后再操作'
    } else {
      error.value = e.message || '删除失败，请稍后重试'
    }
  }
}

onMounted(async () => {
  await refreshMe()
  await loadComments()
})
</script>

<style scoped>
.kami-comments {
  max-width: 860px;
  margin: 40px auto 0;
  padding: 0 4px;
  color: var(--first-text-color, #323739);
  font-size: 15px;
  line-height: 1.7;
  text-align: left;
}
.kc-head h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
}
.kc-total {
  margin-left: 8px;
  padding: 1px 10px;
  border-radius: 999px;
  background: var(--third-background-color, #f7f7f7);
  color: var(--primary-color, #5d3fd3);
  font-size: 13px;
  vertical-align: 2px;
}
.kc-sub {
  margin: 4px 0 18px;
  color: var(--third-text-color, #9595a2);
  font-size: 13px;
}
.kc-tip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
  padding: 14px 16px;
  border: 1px dashed var(--border-color, rgba(0,0,0,.08));
  border-radius: 12px;
  color: var(--second-text-color, #343a3c);
  font-size: 14px;
  background: var(--second-background-color, #fafafa);
}
.kc-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 38px;
  padding: 0 18px;
  border: 0;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  text-decoration: none;
  transition: opacity 0.2s, transform 0.15s;
}
.kc-btn.primary {
  background: linear-gradient(135deg, var(--primary-color, #5d3fd3), #8b5cf6);
  color: #fff;
  box-shadow: 0 8px 16px rgba(40, 71, 186, 0.22);
}
.kc-btn.primary:hover:not(:disabled) {
  transform: translateY(-1px);
}
.kc-btn.small {
  height: 32px;
  padding: 0 14px;
  font-size: 13px;
}
.kc-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.kc-editor,
.kc-reply-editor {
  border: 1.5px solid var(--border-color, rgba(0,0,0,.08));
  border-radius: 14px;
  background: var(--second-background-color, #fafafa);
  padding: 14px;
  margin-bottom: 24px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.kc-editor:focus-within,
.kc-reply-editor:focus-within {
  border-color: var(--primary-color, #5d3fd3);
  box-shadow: 0 0 0 4px rgba(93, 63, 211, 0.12);
}
.kc-identity {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  color: var(--second-text-color, #343a3c);
  font-size: 13px;
}
.kc-identity b {
  color: var(--primary-color, #5d3fd3);
}
.kc-avatar-link {
  flex: none;
  display: inline-flex;
  text-decoration: none;
  border-radius: 50%;
  transition: transform 0.2s ease;
}
.kc-avatar-link:hover {
  transform: scale(1.06);
}
.kc-avatar-link:focus-visible {
  outline: 2px solid var(--primary-color, #5d3fd3);
  outline-offset: 2px;
}
.kc-reply-to {
  color: var(--second-text-color, #343a3c);
  font-size: 13px;
}
.kc-reply-to b {
  color: var(--primary-color, #5d3fd3);
  font-weight: 700;
}
.kc-editor textarea,
.kc-reply-editor textarea {
  display: block;
  width: 100%;
  min-height: 88px;
  border: 0;
  outline: none;
  resize: vertical;
  font: inherit;
  color: var(--first-text-color, #323739);
  background: transparent;
}
.kc-editor textarea::placeholder,
.kc-reply-editor textarea::placeholder {
  color: var(--third-text-color, #9595a2);
}
.kc-reply-editor textarea {
  min-height: 64px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--third-background-color, #f7f7f7);
}
.kc-editor-foot,
.kc-reply-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  margin-top: 8px;
}
.kc-count {
  margin-right: auto;
  color: var(--third-text-color, #9595a2);
  font-size: 12px;
}
.kc-state {
  padding: 28px 0;
  text-align: center;
  color: var(--third-text-color, #9595a2);
  font-size: 14px;
}
.kc-state.error {
  color: #dc2626;
}
.kc-state.empty {
  padding: 40px 0;
}
.kc-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.kc-item {
  display: flex;
  gap: 12px;
  padding: 16px 0;
  border-top: 1px solid var(--border-color, rgba(0,0,0,.08));
}
.kc-item.child {
  padding: 12px 0 4px;
  border-top: 0;
}
.kc-avatar {
  flex: none;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--third-background-color, #f7f7f7);
  color: var(--first-text-color, #323739);
  font-weight: 800;
  font-size: 16px;
  border: 2px solid var(--background-color, #fff);
  box-shadow: 0 2px 8px rgba(17, 24, 39, 0.08);
}
.kc-avatar.small {
  width: 34px;
  height: 34px;
  font-size: 14px;
}
.kc-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.kc-body {
  flex: 1;
  min-width: 0;
}
.kc-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;
}
.kc-name {
  color: var(--first-text-color, #323739);
  font-weight: 700;
}
.kc-tag.admin {
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.16);
  color: #d97706;
  font-size: 11px;
  font-weight: 700;
}
.kc-time {
  color: var(--third-text-color, #9595a2);
  font-size: 12px;
}
.kc-content {
  margin: 6px 0 4px;
  color: var(--default-text-color, #373d3f);
  white-space: pre-wrap;
  word-break: break-word;
}
.kc-actions {
  display: flex;
  gap: 14px;
}
.kc-link {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--second-text-color, #343a3c);
  font-size: 13px;
  cursor: pointer;
}
.kc-link:hover {
  color: var(--primary-color, #5d3fd3);
}
.kc-link.danger:hover {
  color: #dc2626;
}
.kc-reply-editor {
  margin: 12px 0 4px;
  padding: 12px;
  background: var(--third-background-color, #f7f7f7);
  border-color: var(--border-color, rgba(0,0,0,.08));
}
.kc-children {
  margin: 10px 0 0;
  padding: 0 0 0 14px;
  border-left: 2px solid var(--border-color, rgba(0,0,0,.08));
  list-style: none;
}
.kc-children .kc-reply-editor {
  margin: 8px 0 2px;
}
</style>
