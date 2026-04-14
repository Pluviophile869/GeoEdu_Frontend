<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getUserInfoFromStorage, normalizeUserRole } from './utils/auth'

const route = useRoute()
const router = useRouter()
const sidebarCollapsed = ref(false)
const userMenuOpen = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)
const userInfo = ref<{ username?: string; role?: string } | null>(null)

const historyNavActive = computed(() => route.path.startsWith('/history'))
const isLoginPage = computed(() => route.path === '/login')
const userInitial = computed(() => (userInfo.value?.username?.[0] || 'U').toUpperCase())
const normalizedRole = computed(() => normalizeUserRole(userInfo.value?.role))
const userRoleLabel = computed(() => (normalizedRole.value === 'teacher' ? '教师' : '学生'))
const canAccessWrongBook = computed(() => normalizedRole.value === 'student')

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

function loadUserInfo() {
  userInfo.value = getUserInfoFromStorage()
}

function toggleUserMenu() {
  userMenuOpen.value = !userMenuOpen.value
}

function closeUserMenu() {
  userMenuOpen.value = false
}

function handleClickOutside(e: MouseEvent) {
  if (!userMenuRef.value) return
  if (!userMenuRef.value.contains(e.target as Node)) {
    closeUserMenu()
  }
}

async function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('userInfo')
  closeUserMenu()
  await router.push('/login')
}

onMounted(() => {
  loadUserInfo()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

watch(
  () => route.fullPath,
  () => loadUserInfo(),
  { immediate: true },
)
</script>

<template>
  <div class="geo-layout" :class="{ 'geo-layout--auth': isLoginPage }">
    <aside
      v-if="!isLoginPage"
      class="geo-sidebar"
      :class="{ 'geo-sidebar--collapsed': sidebarCollapsed }"
    >
      <div class="geo-sidebar__head">
        <div class="geo-sidebar__brand">{{ sidebarCollapsed ? 'G' : 'GeoEdu' }}</div>
        <button
          type="button"
          class="geo-sidebar__toggle"
          :aria-expanded="!sidebarCollapsed"
          aria-label="折叠或展开导航"
          @click="toggleSidebar"
        >
          <span class="geo-sidebar__toggle-icon" :data-collapsed="sidebarCollapsed">‹</span>
        </button>
      </div>

      <!-- 问答：紧挨 GeoEdu 下方，位于分割线上方 -->
      <div class="geo-sidebar__primary">
        <RouterLink to="/qa" class="geo-sidebar__link" active-class="geo-sidebar__link--active">
          <span class="geo-sidebar__icon" aria-hidden="true">◉</span>
          <span class="geo-sidebar__label">回到当前对话</span>
        </RouterLink>
        <RouterLink to="/qa?chat=new" class="geo-sidebar__link geo-sidebar__link--compact">
          <span class="geo-sidebar__icon" aria-hidden="true">＋</span>
          <span class="geo-sidebar__label">开启新对话</span>
        </RouterLink>
      </div>

      <div class="geo-sidebar__divider" role="separator" aria-hidden="true" />

      <!-- 可滚动导航区域 -->
      <div class="geo-sidebar__scrollable">
        <nav class="geo-sidebar__nav" aria-label="功能导航">
          <RouterLink
            to="/history"
            class="geo-sidebar__link"
            :class="{ 'geo-sidebar__link--active': historyNavActive }"
          >
            <span class="geo-sidebar__icon" aria-hidden="true">◷</span>
            <span class="geo-sidebar__label">历史记录</span>
          </RouterLink>
          <RouterLink
            v-if="canAccessWrongBook"
            to="/wrong"
            class="geo-sidebar__link"
            active-class="geo-sidebar__link--active"
          >
            <span class="geo-sidebar__icon" aria-hidden="true">✎</span>
            <span class="geo-sidebar__label">错题本</span>
          </RouterLink>
          <RouterLink
            to="/knowledge"
            class="geo-sidebar__link"
            active-class="geo-sidebar__link--active"
          >
            <span class="geo-sidebar__icon" aria-hidden="true">⌕</span>
            <span class="geo-sidebar__label">知识点</span>
          </RouterLink>
          <RouterLink to="/question-bank" class="geo-sidebar__link" active-class="geo-sidebar__link--active">
            <span class="geo-sidebar__icon" aria-hidden="true">◇</span>
            <span class="geo-sidebar__label">题库</span>
          </RouterLink>
        </nav>
      </div>

      <div v-if="userInfo" class="geo-sidebar__user" ref="userMenuRef">
        <button type="button" class="geo-sidebar__user-main" @click="toggleUserMenu">
          <span class="geo-sidebar__avatar">{{ userInitial }}</span>
          <span class="geo-sidebar__user-meta">
            <strong class="geo-sidebar__user-name">{{ userInfo.username || '未命名用户' }}</strong>
            <span class="geo-sidebar__user-role">{{ userRoleLabel }}</span>
          </span>
        </button>
        <div v-if="userMenuOpen" class="geo-sidebar__user-menu">
          <button type="button" class="geo-sidebar__user-menu-btn" @click="logout">退出登录</button>
        </div>
      </div>
    </aside>

    <main class="geo-content" :class="{ 'geo-content--auth': isLoginPage }">
      <RouterView />
    </main>
  </div>
</template>

<style>
/* 全局重置：确保视口固定，无整体滚动条 */
html,
body {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}
</style>

<style scoped>
.geo-layout {
  height: 100vh;
  display: flex;
  align-items: stretch;
  overflow: hidden;
  /* 移除原有的 min-height: 100svh */
}

.geo-layout--auth {
  background: linear-gradient(160deg, #f8fafc 0%, #e2e8f0 100%);
}

/* 侧边栏：固定不滚动，内部滚动仅限于导航区 */
.geo-sidebar {
  flex: 0 0 220px;
  width: 220px;
  display: flex;
  flex-direction: column;
  background: #f1f5f9;
  border-right: 1px solid #e2e8f0;
  transition: flex-basis 0.2s ease, width 0.2s ease;
  height: 100%;
  min-height: 0; /* 确保 flex 子项可以收缩 */
  overflow: hidden; /* 侧边栏本身不滚动，滚动交给内部区域 */
}

.geo-sidebar--collapsed {
  flex-basis: 64px;
  width: 64px;
}

/* 可滚动区域：占据剩余高度，仅在此区域滚动 */
.geo-sidebar__scrollable {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: 0 10px 12px;
}

/* 折叠时滚动区域保持居中内容 */
.geo-sidebar--collapsed .geo-sidebar__scrollable {
  padding: 0 8px 12px;
}

.geo-sidebar__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 12px 10px;
  min-height: 52px;
  flex-shrink: 0;
}

.geo-sidebar--collapsed .geo-sidebar__head {
  justify-content: center;
  flex-direction: column;
  padding: 12px 8px;
}

.geo-sidebar__brand {
  font-weight: 800;
  font-size: 1.05rem;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
}

.geo-sidebar__toggle {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  display: grid;
  place-items: center;
  color: #475569;
}

.geo-sidebar__toggle:hover {
  background: #f8fafc;
  border-color: #94a3b8;
}

.geo-sidebar__toggle-icon {
  display: block;
  font-size: 18px;
  line-height: 1;
  transition: transform 0.2s ease;
}

.geo-sidebar__toggle-icon[data-collapsed='true'] {
  transform: rotate(180deg);
}

.geo-sidebar--collapsed .geo-sidebar__toggle {
  order: -1;
  margin-bottom: 4px;
}

.geo-sidebar__primary {
  padding: 4px 10px 8px;
  flex-shrink: 0;
}

.geo-sidebar__link--compact {
  padding: 8px 12px;
  font-size: 13px;
}

.geo-sidebar__divider {
  height: 1px;
  margin: 4px 12px 10px;
  background: #e2e8f0;
  flex-shrink: 0;
}

.geo-sidebar--collapsed .geo-sidebar__divider {
  margin: 8px 10px;
  width: auto;
}

.geo-sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.geo-sidebar__link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  text-decoration: none;
  color: #334155;
  font-weight: 600;
  font-size: 14px;
  border: 1px solid transparent;
}

.geo-sidebar__link:hover {
  background: #e2e8f0;
}

.geo-sidebar__link--active {
  background: #fff;
  border-color: #cbd5e1;
  color: #14532d;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}

.geo-sidebar__icon {
  flex-shrink: 0;
  width: 1.25em;
  text-align: center;
  opacity: 0.85;
  font-size: 12px;
}

.geo-sidebar--collapsed .geo-sidebar__label {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.geo-sidebar--collapsed .geo-sidebar__link {
  justify-content: center;
  padding: 10px;
}

.geo-sidebar--collapsed .geo-sidebar__nav {
  align-items: center;
}

/* 主内容区域：独立滚动 */
.geo-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: 0 20px 24px;
}

.geo-content--auth {
  display: grid;
  place-items: center;
  padding: 24px;
}

body, html, #app {
  margin: 0;
  padding: 0;
}

.geo-sidebar__user {
  border-top: 1px solid #e2e8f0;
  padding: 10px;
  position: relative;
  background: #f8fafc;
}

.geo-sidebar__user-main {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  border: none;
  background: #fff;
  border-radius: 10px;
  padding: 8px;
  cursor: pointer;
  text-align: left;
}

.geo-sidebar__avatar {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: #14532d;
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.geo-sidebar__user-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.geo-sidebar__user-name {
  font-size: 0.85rem;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.geo-sidebar__user-role {
  color: #64748b;
  font-size: 0.75rem;
}

.geo-sidebar__user-menu {
  margin-top: 8px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 6px;
}

.geo-sidebar__user-menu-btn {
  width: 100%;
  border: none;
  background: transparent;
  color: #b91c1c;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 6px;
}

.geo-sidebar__user-menu-btn:hover {
  background: #fef2f2;
}

.geo-sidebar--collapsed .geo-sidebar__user-main {
  justify-content: center;
}

.geo-sidebar--collapsed .geo-sidebar__user-meta {
  display: none;
}
</style>