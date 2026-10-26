import { createApp } from 'vue'
import CommentWidget from './CommentWidget.vue'

// swup 单页跳转后 #swup 容器会被整体替换，原来的挂载点随之消失。
// 所以把挂载逻辑收敛成一个全局函数，由注入脚本在每次页面切换后调用。
function mount() {
  const root = document.getElementById('kami-comments-root')
  if (!root) return
  if (root.dataset.kamiMounted === '1') return

  // 注入点在 body 末尾；主题若有 <article> 文章容器，把评论块挪到它正后方，视觉更自然
  const article = document.querySelector('article')
  if (article && !article.contains(root)) {
    article.insertAdjacentElement('afterend', root)
  }

  // path 约定：文章页 = URL 路径（去掉结尾斜杠，如 /2026/05/09/Git版本控制）；
  // 留言板 = /comments。允许通过 data-path 覆盖。
  const raw = root.dataset.path || decodeURI(window.location.pathname)
  const path = raw.replace(/\/+$/, '') || '/'

  root.dataset.kamiMounted = '1'
  createApp(CommentWidget, { path }).mount(root)
}

window.__mountKamiComments = mount
mount()
