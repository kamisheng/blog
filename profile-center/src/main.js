import { createApp } from 'vue'
import ProfilePage from './ProfilePage.vue'

// swup 切页 + 注入器可能多次触发挂载：同一挂载点只挂一次；
// 挂载点被 swup 换掉（旧节点脱离文档）时重新挂到新节点上。
function mount() {
  const root = document.getElementById('blog-profile-root')
  if (!root) return
  const prev = root.__kamiProfileApp
  if (prev && prev.__mountedOn === root && root.isConnected && root.children.length) return
  root.innerHTML = ''
  const instance = createApp(ProfilePage)
  instance.__mountedOn = root
  root.__kamiProfileApp = instance
  instance.mount(root)
}

window.__mountKamiProfile = mount
mount()
