import { createApp } from 'vue'
import ProfilePage from './ProfilePage.vue'

const root = document.getElementById('blog-profile-root')
if (root) {
  createApp(ProfilePage).mount(root)
}
