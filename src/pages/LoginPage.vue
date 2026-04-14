<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { loginApi, registerApi } from '../api/auth'
import { normalizeUserRole } from '../utils/auth'

const router = useRouter()
const CURRENT_CHAT_KEY = 'geoedu.currentChat.v1'

// 表单模式：login | register
const mode = ref<'login' | 'register'>('login')

// 表单字段
const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const role = ref<'teacher' | 'student' | ''>('') // 身份：老师或学生，仅注册使用

// 提交状态 & 全局错误
const submitting = ref(false)
const errorMessage = ref('')

// 字段级错误
const usernameError = ref('')
const passwordError = ref('')
const confirmPasswordError = ref('')
const roleError = ref('')

// 切换模式，重置所有字段和错误
function switchMode(newMode: 'login' | 'register') {
  mode.value = newMode
  username.value = ''
  password.value = ''
  confirmPassword.value = ''
  role.value = ''
  usernameError.value = ''
  passwordError.value = ''
  confirmPasswordError.value = ''
  roleError.value = ''
  errorMessage.value = ''
  submitting.value = false
}

// 校验用户名（非空）
const validateUsername = (): boolean => {
  if (!username.value.trim()) {
    usernameError.value = '请输入用户名'
    return false
  }
  usernameError.value = ''
  return true
}

// 校验密码（非空且长度 ≥ 8）
const validatePassword = (): boolean => {
  const pwd = password.value
  if (!pwd) {
    passwordError.value = '请输入密码'
    return false
  }
  if (pwd.length < 8) {
    passwordError.value = '密码长度至少为 8 位'
    return false
  }
  passwordError.value = ''
  return true
}

// 校验确认密码（仅注册时使用）
const validateConfirmPassword = (): boolean => {
  if (mode.value !== 'register') return true
  if (password.value !== confirmPassword.value) {
    confirmPasswordError.value = '两次输入的密码不一致'
    return false
  }
  confirmPasswordError.value = ''
  return true
}

// 校验身份（仅注册时使用）
const validateRole = (): boolean => {
  if (mode.value !== 'register') return true
  if (!role.value) {
    roleError.value = '请选择身份（老师或学生）'
    return false
  }
  roleError.value = ''
  return true
}

// 登录表单整体校验
const validateLoginForm = (): boolean => {
  errorMessage.value = ''
  const isUsernameValid = validateUsername()
  const isPasswordValid = validatePassword()
  return isUsernameValid && isPasswordValid
}

// 注册表单整体校验
const validateRegisterForm = (): boolean => {
  errorMessage.value = ''
  const isUsernameValid = validateUsername()
  const isPasswordValid = validatePassword()
  const isConfirmValid = validateConfirmPassword()
  const isRoleValid = validateRole()
  return isUsernameValid && isPasswordValid && isConfirmValid && isRoleValid
}

// ==================== 真实登录接口 ====================
async function handleLogin() {
  if (!validateLoginForm()) return

  submitting.value = true
  errorMessage.value = ''

  try {
    const result = await loginApi({
      username: username.value.trim(),
      password: password.value
    })
    // 假设后端登录成功后返回 token 或用户信息
    // 根据你的后端实际返回结构调整
    if (result?.token) {
      localStorage.setItem('token', result.token)
    }
    if (result?.userInfo) {
      localStorage.setItem(
        'userInfo',
        JSON.stringify({
          ...result.userInfo,
          role: normalizeUserRole(result.userInfo.role) || result.userInfo.role,
        }),
      )
    }
    // 登录成功后进入新对话页，避免恢复上次会话
    localStorage.removeItem(CURRENT_CHAT_KEY)
    await router.push('/qa?chat=new')
  } catch (err: any) {
    errorMessage.value = err.message || '登录失败，请检查用户名或密码'
  } finally {
    submitting.value = false
  }
}

// ==================== 真实注册接口 ====================
async function handleRegister() {
  if (!validateRegisterForm()) return

  submitting.value = true
  errorMessage.value = ''

  try {
    await registerApi({
      username: username.value.trim(),
      password: password.value,
      role: role.value as 'teacher' | 'student'
    })
    // 注册成功后直接调用登录接口，完成自动登录
    const loginResult = await loginApi({
      username: username.value.trim(),
      password: password.value
    })
    if (loginResult?.token) {
      localStorage.setItem('token', loginResult.token)
    }
    if (loginResult?.userInfo) {
      localStorage.setItem(
        'userInfo',
        JSON.stringify({
          ...loginResult.userInfo,
          role: normalizeUserRole(loginResult.userInfo.role) || loginResult.userInfo.role,
        }),
      )
    } else {
      localStorage.setItem(
        'userInfo',
        JSON.stringify({
          username: username.value.trim(),
          role: normalizeUserRole(role.value) || role.value,
        }),
      )
    }
    localStorage.removeItem(CURRENT_CHAT_KEY)
    await router.push('/qa?chat=new')
  } catch (err: any) {
    errorMessage.value = err.message || '注册失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}

// 提交表单（根据当前模式调用不同方法）
async function handleSubmit() {
  if (mode.value === 'login') {
    await handleLogin()
  } else {
    await handleRegister()
  }
}

// 辅助函数：清除指定错误
const clearUsernameError = () => { usernameError.value = '' }
const clearPasswordError = () => { passwordError.value = '' }
const clearConfirmPasswordError = () => { confirmPasswordError.value = '' }
const clearRoleError = () => { roleError.value = '' }
</script>

<template>
  <section class="login-page" aria-label="登录/注册页面">
    <div class="login-card">
      <h1 class="login-title">GeoEdu {{ mode === 'login' ? '登录' : '注册' }}</h1>
      <p class="login-subtitle">
        {{ mode === 'login' ? '请输入账号信息以继续使用系统' : '创建新账号，开始地理学习之旅' }}
      </p>

      <form class="login-form" @submit.prevent="handleSubmit">
        <!-- 用户名 -->
        <label class="login-label" for="username">用户名</label>
        <input
          id="username"
          v-model="username"
          class="login-input"
          :class="{ 'error-input': usernameError }"
          type="text"
          autocomplete="username"
          placeholder="请输入用户名"
          @input="clearUsernameError"
          @blur="validateUsername"
        />
        <p v-if="usernameError" class="login-error">{{ usernameError }}</p>

        <!-- 密码 -->
        <label class="login-label" for="password">密码</label>
        <input
          id="password"
          v-model="password"
          class="login-input"
          :class="{ 'error-input': passwordError }"
          type="password"
          autocomplete="current-password"
          placeholder="请输入至少8位密码"
          @input="clearPasswordError"
          @blur="validatePassword"
        />
        <p v-if="passwordError" class="login-error">{{ passwordError }}</p>

        <!-- 确认密码（仅注册模式） -->
        <template v-if="mode === 'register'">
          <label class="login-label" for="confirmPassword">确认密码</label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            class="login-input"
            :class="{ 'error-input': confirmPasswordError }"
            type="password"
            autocomplete="off"
            placeholder="请再次输入密码"
            @input="clearConfirmPasswordError"
            @blur="validateConfirmPassword"
          />
          <p v-if="confirmPasswordError" class="login-error">{{ confirmPasswordError }}</p>
        </template>

        <!-- 身份选择（仅注册模式） -->
        <template v-if="mode === 'register'">
          <label class="login-label">身份</label>
          <div class="role-group" :class="{ 'error-role-group': roleError }">
            <label class="role-option">
              <input
                type="radio"
                value="teacher"
                v-model="role"
                @change="clearRoleError"
              />
              <span>老师</span>
            </label>
            <label class="role-option">
              <input
                type="radio"
                value="student"
                v-model="role"
                @change="clearRoleError"
              />
              <span>学生</span>
            </label>
          </div>
          <p v-if="roleError" class="login-error">{{ roleError }}</p>
        </template>

        <!-- 全局错误提示 -->
        <p v-if="errorMessage" class="login-error global-error">{{ errorMessage }}</p>

        <!-- 提交按钮 -->
        <button class="login-btn" type="submit" :disabled="submitting">
          {{ submitting ? '处理中...' : (mode === 'login' ? '登录' : '注册') }}
        </button>

        <!-- 切换模式链接 -->
        <div class="mode-switch">
          <span class="mode-switch-text">
            {{ mode === 'login' ? '还没有账号？' : '已有账号？' }}
            <button
              type="button"
              class="mode-switch-link"
              @click="switchMode(mode === 'login' ? 'register' : 'login')"
            >
              {{ mode === 'login' ? '立即注册' : '去登录' }}
            </button>
          </span>
        </div>
      </form>
    </div>
  </section>
</template>

<style scoped>
/* 样式和你原来的一样，保持不变 */
.login-page {
  width: min(100%, 420px);
  margin: 0 auto;
}

.login-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  padding: 24px;
}

.login-title {
  margin: 0;
  font-size: 1.5rem;
  color: #0f172a;
}

.login-subtitle {
  margin: 8px 0 20px;
  color: #64748b;
  font-size: 0.9rem;
}

.login-form {
  display: grid;
  gap: 4px;
}

.login-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #334155;
  margin-top: 8px;
}

.login-label:first-of-type {
  margin-top: 0;
}

.login-input {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.login-input:focus {
  border-color: #16a34a;
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.15);
}

.login-input.error-input {
  border-color: #dc2626;
}

.login-input.error-input:focus {
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15);
}

.login-error {
  margin: 4px 0 0;
  color: #dc2626;
  font-size: 0.8rem;
}

.global-error {
  margin-top: 8px;
  text-align: center;
  background: #fef2f2;
  border-radius: 8px;
  padding: 6px;
}

.login-btn {
  margin-top: 16px;
  border: none;
  border-radius: 10px;
  background: #14532d;
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 600;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.login-btn:hover:enabled {
  background: #166534;
}

.login-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.mode-switch {
  margin-top: 16px;
  text-align: center;
}

.mode-switch-text {
  color: #64748b;
  font-size: 0.85rem;
}

.mode-switch-link {
  background: none;
  border: none;
  color: #16a34a;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  padding: 0 4px;
}

.mode-switch-link:hover {
  color: #15803d;
}

.role-group {
  display: flex;
  gap: 24px;
  margin-top: 4px;
  margin-bottom: 4px;
}

.role-option {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.95rem;
  color: #334155;
  cursor: pointer;
}

.role-option input[type="radio"] {
  width: 16px;
  height: 16px;
  margin: 0;
  cursor: pointer;
  accent-color: #16a34a;
}

.role-group.error-role-group {
  border: 1px solid #dc2626;
  border-radius: 8px;
  padding: 6px 12px;
  margin: 0 0 4px 0;
}
</style>