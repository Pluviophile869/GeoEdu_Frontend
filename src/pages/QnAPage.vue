<script setup lang="ts">
import { computed, ref, nextTick, watch, inject, type Ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MarkdownView from '../components/MarkdownView.vue'
import ImageCarousel from '../components/ImageCarousel.vue'
import { generateMockAnswer } from '../utils/mockAnswer'
import { parseImageUrls } from '../utils/parseImages'
import { useHistory } from '../composables/useHistory'
import type { HistoryChatTurn, HistoryItem, RelatedExamQuestion } from '../types'

type ChatTurn = {
  id: string
  question: string
  answerMarkdown: string
  images: string[]
  relatedQuestions: RelatedExamQuestion[]
  textbookOriginal: string
  showTextbook: boolean
  showRelated: boolean
}

const expandedAnswers = ref<Record<string, boolean>>({})
const question = ref('')
const imagesInput = ref('')
const chatTurns = ref<ChatTurn[]>([])
const globalShowTextbook = ref(false)
const globalShowRelated = ref(false)
const chatSectionRef = ref<HTMLElement>()
const { upsert } = useHistory()
const fileInputRef = ref<HTMLInputElement>()
const route = useRoute()
const router = useRouter()

const CURRENT_CHAT_KEY = 'geoedu.currentChat.v1'
const currentHistoryId = ref<string>('') // 当前会话对应的历史记录 id（会话级）
const currentHistoryCreatedAt = ref<number>(0)
const answerMode = ref<'offline' | 'online'>('offline')
const conversationTitle = computed(() => chatTurns.value[0]?.question || '当前对话')

// 侧边栏折叠状态（从父组件注入）
const sidebarCollapsed = inject<Ref<boolean>>('sidebarCollapsed', ref(false))

// 底部栏的动态样式
const bottomStyle = ref({
  left: '0px',
  width: '0px'
})

let resizeObserver: ResizeObserver | null = null

// 更新底部栏位置和宽度（使其与主内容区域对齐）
function updateBottomPosition() {
  const mainEl = document.querySelector('.geo-content') as HTMLElement
  if (!mainEl) return
  const rect = mainEl.getBoundingClientRect()
  bottomStyle.value = {
    left: `${rect.left}px`,
    width: `${rect.width}px`
  }
}

// 监听侧边栏折叠变化
watch(sidebarCollapsed, () => {
  // 等待 DOM 动画完成（侧边栏宽度过渡 0.2s）
  setTimeout(updateBottomPosition, 50)
  // 立即更新一次，保证动画开始时的位置
  updateBottomPosition()
})

// 监听窗口尺寸变化
function handleResize() {
  updateBottomPosition()
}

// 使用 ResizeObserver 监听主内容区域尺寸变化（侧边栏折叠动画导致宽度变化）
function observeMainContent() {
  const mainEl = document.querySelector('.geo-content')
  if (!mainEl) return
  if (resizeObserver) resizeObserver.disconnect()
  resizeObserver = new ResizeObserver(() => {
    updateBottomPosition()
  })
  resizeObserver.observe(mainEl)
}

onMounted(() => {
  updateBottomPosition()
  window.addEventListener('resize', handleResize)
  observeMainContent()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})

// ---------- Toast 提示 ----------
const toastMessage = ref('')
const showToast = ref(false)
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToastMessage(message: string, duration = 2000) {
  if (toastTimer) clearTimeout(toastTimer)
  toastMessage.value = message
  showToast.value = true
  toastTimer = setTimeout(() => {
    showToast.value = false
  }, duration)
}

// ---------- 错题本收藏功能 ----------
const STORAGE_KEY = 'wrong_questions'
const favoriteQuestions = ref<RelatedExamQuestion[]>([])
const favoriteIdSet = ref<Set<string>>(new Set())

function loadFavorites() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      favoriteQuestions.value = JSON.parse(stored)
      favoriteIdSet.value = new Set(favoriteQuestions.value.map(q => q.id))
    } catch (e) {
      console.error('解析收藏数据失败', e)
    }
  }
}

function saveFavorites() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favoriteQuestions.value))
  favoriteIdSet.value = new Set(favoriteQuestions.value.map(q => q.id))
}

function toggleFavorite(question: RelatedExamQuestion) {
  const index = favoriteQuestions.value.findIndex(q => q.id === question.id)
  if (index === -1) {
    favoriteQuestions.value.push(question)
    showToastMessage('已添加到错题本')
  } else {
    favoriteQuestions.value.splice(index, 1)
    showToastMessage('已取消收藏')
  }
  saveFavorites()
}

function isFavorite(questionId: string): boolean {
  return favoriteIdSet.value.has(questionId)
}

// ---------- 自定义错误弹窗 ----------
const showWrongConfirm = ref(false)
const pendingQuestion = ref<RelatedExamQuestion | null>(null)

function openWrongConfirm(question: RelatedExamQuestion) {
  pendingQuestion.value = question
  showWrongConfirm.value = true
}

function confirmAddToWrong() {
  if (pendingQuestion.value) {
    const wasFavorited = isFavorite(pendingQuestion.value.id)
    if (!wasFavorited) {
      toggleFavorite(pendingQuestion.value)
      // 更新当前题目的反馈信息，显示已添加
      const state = getQuestionUIState(pendingQuestion.value.id)
      if (state.feedback) {
        state.feedback += ' 已添加到错题本。'
      }
    }
  }
  showWrongConfirm.value = false
  pendingQuestion.value = null
}

function cancelAddToWrong() {
  showWrongConfirm.value = false
  pendingQuestion.value = null
}

// ---------- 选择题交互状态 ----------
interface QuestionUIState {
  selectedOption: string | null
  submitted: boolean
  feedback: string
}

const questionUIStates = ref<Map<string, QuestionUIState>>(new Map())

function getQuestionUIState(questionId: string): QuestionUIState {
  if (!questionUIStates.value.has(questionId)) {
    questionUIStates.value.set(questionId, {
      selectedOption: null,
      submitted: false,
      feedback: ''
    })
  }
  return questionUIStates.value.get(questionId)!
}

function onOptionChange(questionId: string) {
  const state = getQuestionUIState(questionId)
  state.submitted = false
  state.feedback = ''
}

function submitAnswer(question: RelatedExamQuestion) {
  const state = getQuestionUIState(question.id)
  if (state.submitted) return
  if (!state.selectedOption) {
    state.feedback = '请先选择一个选项'
    return
  }

  const isCorrect = (state.selectedOption === question.answer)
  state.submitted = true

  if (isCorrect) {
    state.feedback = '✅ 回答正确！'
  } else {
    state.feedback = `❌ 回答错误，正确答案是 ${question.answer}`
    if (!isFavorite(question.id)) {
      openWrongConfirm(question)
    } else {
      state.feedback += ' 本题已在错题本中。'
    }
  }
}

// ---------- 原有函数 ----------
function nowId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

async function scrollToBottom() {
  await nextTick()
  if (chatSectionRef.value) {
    const lastTurn = chatSectionRef.value.lastElementChild
    if (lastTurn) {
      lastTurn.scrollIntoView({ behavior: 'smooth', block: 'end' })
    } else {
      chatSectionRef.value.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }
}

function onGenerate() {
  const asked = question.value.trim()
  if (!asked) return

  const modePrompt = answerMode.value === 'online' ? `${asked}\n\n[模式: 在线]` : asked
  const res = generateMockAnswer(modePrompt)
  const parsedExtraImages = parseImageUrls(imagesInput.value)
  const allImages = parsedExtraImages.length ? parsedExtraImages : res.defaultImages

  const newTurn: ChatTurn = {
    id: nowId(),
    question: asked,
    answerMarkdown: res.answerMarkdown,
    images: allImages,
    relatedQuestions: res.relatedQuestions,
    textbookOriginal: res.textbookOriginal,
    showTextbook: globalShowTextbook.value,
    showRelated: globalShowRelated.value,
  }

  chatTurns.value.push(newTurn)

  // 会话级历史：同一轮对话不断 upsert 到同一条历史记录
  if (!currentHistoryId.value) {
    currentHistoryId.value = nowId()
    currentHistoryCreatedAt.value = Date.now()
  }

  const turns: HistoryChatTurn[] = chatTurns.value.map((t) => ({
    id: t.id,
    question: t.question,
    answerMarkdown: t.answerMarkdown,
    images: t.images,
    relatedQuestions: t.relatedQuestions,
    textbookOriginal: t.textbookOriginal,
  }))

  const firstQuestion = turns[0]?.question ?? asked
  const last = turns[turns.length - 1]

  const item: HistoryItem = {
    id: currentHistoryId.value,
    question: firstQuestion,
    answerMarkdown: last?.answerMarkdown ?? res.answerMarkdown,
    images: last?.images ?? allImages,
    relatedQuestions: last?.relatedQuestions ?? res.relatedQuestions,
    textbookOriginal: last?.textbookOriginal ?? res.textbookOriginal,
    createdAt: currentHistoryCreatedAt.value || Date.now(),
    updatedAt: Date.now(),
    turns,
  }
  upsert(item)
  question.value = ''
  imagesInput.value = ''
  scrollToBottom()
}

type PersistedChat = {
  chatTurns: ChatTurn[]
  globalShowTextbook: boolean
  globalShowRelated: boolean
  historyId?: string
  createdAt?: number
  answerMode?: 'offline' | 'online'
}

function persistCurrentChat() {
  const payload: PersistedChat = {
    chatTurns: chatTurns.value,
    globalShowTextbook: globalShowTextbook.value,
    globalShowRelated: globalShowRelated.value,
    historyId: currentHistoryId.value || undefined,
    createdAt: currentHistoryCreatedAt.value || undefined,
    answerMode: answerMode.value,
  }
  localStorage.setItem(CURRENT_CHAT_KEY, JSON.stringify(payload))
}

function loadCurrentChat() {
  const raw = localStorage.getItem(CURRENT_CHAT_KEY)
  if (!raw) return
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedChat>
    if (Array.isArray(parsed.chatTurns)) chatTurns.value = parsed.chatTurns as ChatTurn[]
    if (typeof parsed.globalShowTextbook === 'boolean')
      globalShowTextbook.value = parsed.globalShowTextbook
    if (typeof parsed.globalShowRelated === 'boolean') globalShowRelated.value = parsed.globalShowRelated
    if (typeof parsed.historyId === 'string') currentHistoryId.value = parsed.historyId
    if (typeof parsed.createdAt === 'number') currentHistoryCreatedAt.value = parsed.createdAt
    if (parsed.answerMode === 'online' || parsed.answerMode === 'offline') {
      answerMode.value = parsed.answerMode
    }
  } catch {
    // ignore bad storage
  }
}

function startNewChat() {
  chatTurns.value = []
  question.value = ''
  imagesInput.value = ''
  expandedAnswers.value = {}
  questionUIStates.value = new Map()
  globalShowTextbook.value = false
  globalShowRelated.value = false
  currentHistoryId.value = ''
  currentHistoryCreatedAt.value = 0
  answerMode.value = 'offline'
  localStorage.removeItem(CURRENT_CHAT_KEY)
}

function onUseRelated(turnId: string, selectedRelatedId: string) {
  const turn = chatTurns.value.find(t => t.id === turnId)
  if (!turn) return
  const target = turn.relatedQuestions.find((x) => x.id === selectedRelatedId)
  if (!target) return

  let fullQuestion = target.stem
  if (target.options && target.options.length) {
    const optionsText = target.options.map(opt => `${opt.label}. ${opt.text}`).join('\n')
    fullQuestion = `${target.stem}\n\n选项：\n${optionsText}`
  }
  question.value = fullQuestion
}

function onViewAnswer(questionId: string) {
  expandedAnswers.value[questionId] = !expandedAnswers.value[questionId]
}

function toggleTextbook(turnId: string) {
  const turn = chatTurns.value.find(t => t.id === turnId)
  if (turn) {
    turn.showTextbook = !turn.showTextbook
  }
  scrollToBottom()
}

function toggleRelated(turnId: string) {
  const turn = chatTurns.value.find(t => t.id === turnId)
  if (turn) {
    turn.showRelated = !turn.showRelated
  }
  scrollToBottom()
}

function toggleGlobalTextbook() {
  globalShowTextbook.value = !globalShowTextbook.value
  chatTurns.value.forEach(turn => {
    turn.showTextbook = globalShowTextbook.value
  })
  scrollToBottom()
}

function toggleGlobalRelated() {
  globalShowRelated.value = !globalShowRelated.value
  chatTurns.value.forEach(turn => {
    turn.showRelated = globalShowRelated.value
  })
  scrollToBottom()
}

function onBottomInputKeydown(e: KeyboardEvent) {
  if (e.key !== 'Enter' || e.shiftKey) return
  e.preventDefault()
  onGenerate()
}

function triggerFileUpload() {
  fileInputRef.value?.click()
}

function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files) return

  Array.from(files).forEach(file => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string
        if (imagesInput.value) {
          imagesInput.value += `,${imageUrl}`
        } else {
          imagesInput.value = imageUrl
        }
      }
      reader.readAsDataURL(file)
    }
  })
  target.value = ''
}

watch(chatTurns, () => {
  scrollToBottom()
}, { deep: true })

onMounted(() => {
  loadFavorites()
  loadCurrentChat()
})

watch(
  () => [chatTurns.value, globalShowTextbook.value, globalShowRelated.value],
  () => {
    persistCurrentChat()
  },
  { deep: true },
)

watch(
  () => route.query.chat,
  async (v) => {
    if (v !== 'new') return
    startNewChat()
    await router.replace('/qa')
  },
  { immediate: true },
)
</script>

<template>
  <div class="page">
    <div class="sticky-header">
      <div class="header-title" :title="conversationTitle">
        {{ conversationTitle }}
      </div>
    </div>

    <section ref="chatSectionRef" v-if="chatTurns.length > 0" class="chat-section">
      <div v-for="turn in chatTurns" :key="turn.id" class="turn-container">
        <div class="chat__item chat__item--user">
          <div class="chat__bubble chat__bubble--user">
            {{ turn.question }}
          </div>
        </div>

        <div class="chat__item chat__item--assistant">
          <div class="chat__bubble chat__bubble--assistant">
            <div class="chat__name">GeoEdu 助手</div>

            <div v-if="turn.images && turn.images.length" class="turn-images">
              <ImageCarousel :images="turn.images" />
            </div>

            <div class="answer-content">
              <MarkdownView :markdown="turn.answerMarkdown" />
            </div>

            <div class="turn-actions">
              <button
                class="ghost turn-aux"
                type="button"
                :data-active="turn.showTextbook"
                @click="toggleTextbook(turn.id)"
              >
                教材原文
              </button>
              <button
                class="ghost turn-aux"
                type="button"
                :data-active="turn.showRelated"
                @click="toggleRelated(turn.id)"
              >
                相关考题
              </button>
            </div>

            <div v-if="turn.showTextbook" class="turn-textbook">
              <div class="textbook-title">教材原文</div>
              <div class="textbook-content">{{ turn.textbookOriginal || '暂无内容' }}</div>
            </div>

            <div v-if="turn.showRelated && turn.relatedQuestions.length" class="turn-related">
              <div class="related-title">相关考题</div>
              <div class="related-list">
                <div v-for="q in turn.relatedQuestions" :key="q.id" class="related-item">
                  <div class="related-item-header">
                    <div class="related-stem">{{ q.stem }}</div>
                    <button
                      class="favorite-star"
                      :class="{ 'favorited': isFavorite(q.id) }"
                      @click="toggleFavorite(q)"
                      title="收藏到错题本"
                    >
                      ★
                    </button>
                  </div>

                  <!-- 选择题选项（交互式） -->
                  <div v-if="q.options && q.options.length" class="question-options">
                    <div 
                      v-for="opt in q.options" 
                      :key="opt.label" 
                      class="option-radio"
                    >
                      <label>
                        <input
                          type="radio"
                          :name="`question-${q.id}`"
                          :value="opt.label"
                          :checked="getQuestionUIState(q.id).selectedOption === opt.label"
                          @change="(e: Event) => {
                            const target = e.target as HTMLInputElement
                            getQuestionUIState(q.id).selectedOption = target.value
                            onOptionChange(q.id)
                          }"
                        />
                        <span class="option-label">{{ opt.label }}.</span>
                        <span class="option-text">{{ opt.text }}</span>
                      </label>
                    </div>
                  </div>

                  <!-- 提交答案区域 -->
                  <div v-if="q.options && q.options.length" class="submit-area">
                    <button 
                      class="ghost submit-answer-btn"
                      @click="submitAnswer(q)"
                      :disabled="getQuestionUIState(q.id).submitted"
                    >
                      {{ getQuestionUIState(q.id).submitted ? '已提交' : '提交答案' }}
                    </button>
                    <span v-if="getQuestionUIState(q.id).feedback" class="feedback-message" :class="{ correct: getQuestionUIState(q.id).feedback.includes('正确') }">
                      {{ getQuestionUIState(q.id).feedback }}
                    </span>
                  </div>

                  <div class="related-buttons">
                    <button 
                      class="ghost view-answer-btn" 
                      type="button" 
                      :class="{ 'active': expandedAnswers[q.id] }"
                      @click="onViewAnswer(q.id)"
                    >
                      {{ expandedAnswers[q.id] ? '收起解答' : '查看解答' }}
                    </button>
                    <button 
                      class="ghost related-use-btn" 
                      type="button" 
                      @click="onUseRelated(turn.id, q.id)"
                    >
                      提问此考题
                    </button>
                  </div>

                  <div v-if="expandedAnswers[q.id]" class="answer-expanded">
                    <div class="answer-header">
                      <span class="answer-title">正确答案：{{ q.answer }}</span>
                    </div>
                    <div class="answer-explanation">
                      <div class="explanation-title">答案解析</div>
                      <div class="explanation-content">{{ q.explanation || '暂无解析' }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else-if="turn.showRelated && !turn.relatedQuestions.length" class="turn-related">
              <div class="related-title">相关考题</div>
              <div class="empty-hint">暂无相关考题</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="hero" v-else>
      <div class="hero__text">GeoEdu——你的地理学习助手</div>
      <div class="hero__mode-picker">
        <button
          type="button"
          class="hero__mode-btn"
          :class="{ 'is-active': answerMode === 'offline' }"
          @click="answerMode = 'offline'"
        >
          离线模式
        </button>
        <button
          type="button"
          class="hero__mode-btn"
          :class="{ 'is-active': answerMode === 'online' }"
          @click="answerMode = 'online'"
        >
          在线模式
        </button>
      </div>
    </section>

    <footer 
      class="bottom" 
      :style="bottomStyle"
    >
      <div class="bottom__inner">
        <div class="bottom__row">
          <textarea
            v-model="question"
            class="textarea bottom__input"
            placeholder="请输入您的问题（Enter 发送，Shift+Enter 换行）"
            rows="3"
            @keydown="onBottomInputKeydown"
          />
          <div class="bottom__actions">
            <div class="bottom__left">
              <button
                class="ghost global-aux"
                type="button"
                :data-active="globalShowTextbook"
                @click="toggleGlobalTextbook"
              >
                教材原文
              </button>
              <button
                class="ghost global-aux"
                type="button"
                :data-active="globalShowRelated"
                @click="toggleGlobalRelated"
              >
                相关考题
              </button>
              <span v-if="imagesInput" class="image-badge">📷 {{ imagesInput.split(',').length }} 张图片</span>
            </div>

            <div class="bottom__right">
              <input
                ref="fileInputRef"
                type="file"
                accept="image/*"
                multiple
                style="display: none"
                @change="handleFileUpload"
              />
              <button
                class="ghost upload-btn"
                type="button"
                @click="triggerFileUpload"
                title="上传图片"
              >
                上传照片或文件
              </button>
              <button class="primary bottom__send" type="button" @click="onGenerate">
                发送问题
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>

    <!-- 自定义错误弹窗（居中） -->
    <div v-if="showWrongConfirm" class="modal-overlay" @click.self="cancelAddToWrong">
      <div class="modal-container">
        <div class="modal-header">
          <span class="modal-title">添加到错题本</span>
        </div>
        <div class="modal-body">
          <p>回答错误！是否将本题添加到错题本？</p>
        </div>
        <div class="modal-footer">
          <button class="modal-btn modal-btn-cancel" @click="cancelAddToWrong">取消</button>
          <button class="modal-btn modal-btn-confirm" @click="confirmAddToWrong">确认</button>
        </div>
      </div>
    </div>

    <!-- Toast 提示 -->
    <Transition name="toast-fade">
      <div v-if="showToast" class="toast">
        {{ toastMessage }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* 原有样式保持不变，新增 Toast 样式 */
.toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 1100;
  white-space: nowrap;
  pointer-events: none;
  backdrop-filter: blur(4px);
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.3s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 420px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  animation: modalFadeIn 0.2s ease-out;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.modal-header {
  padding: 16px 20px 8px 20px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.modal-body {
  padding: 20px;
}

.modal-body p {
  margin: 0 0 12px 0;
  font-size: 15px;
  color: #334155;
}

.modal-question-preview {
  font-size: 13px;
  color: #475569;
  background: #f8fafc;
  padding: 8px 12px;
  border-radius: 8px;
  border-left: 3px solid #f59e0b;
  margin-top: 8px;
  max-height: 100px;
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 12px 20px 20px 20px;
  border-top: 1px solid #e2e8f0;
}

.modal-btn {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.modal-btn-cancel {
  background: #f1f5f9;
  color: #475569;
}

.modal-btn-cancel:hover {
  background: #e2e8f0;
}

.modal-btn-confirm {
  background: #14532d;
  color: white;
}

.modal-btn-confirm:hover {
  background: #0f3d22;
  transform: translateY(-1px);
}

/* 以下为原有样式，为保持完整性已包含 */
.page {
  --bottom-bar-space: 190px;
  display: grid;
  gap: 0;
  padding-bottom: var(--bottom-bar-space);
  min-height: calc(100svh - 140px);
  padding-top: 0;
}

.sticky-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.header-title {
  max-width: 920px;
  width: 100%;
  text-align: center;
  font-weight: 600;
  font-size: 16px;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 8px;
}

.hero {
  min-height: calc(100svh - var(--bottom-bar-space) - 140px);
  display: grid;
  place-items: center;
  align-content: center;
  gap: 18px;
  padding: 24px 12px;
}

.hero__text {
  font-size: 18px;
  font-weight: 900;
  letter-spacing: 0.3px;
  color: rgb(0, 0, 0);
  text-align: center;
}

.hero__mode-picker {
  display: inline-flex;
  background: #f1f5f9;
  border-radius: 999px;
  padding: 4px;
  gap: 4px;
  box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.03);
}

.hero__mode-btn {
  border: none;
  background: transparent;
  border-radius: 999px;
  padding: 12px 28px;
  font-size: 0.95rem;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;
}

.hero__mode-btn.is-active {
  background: white;
  color: #0f3b2c;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.02);
}

/* 悬停效果 */
.hero__mode-btn:not(.is-active):hover {
  color: #1e293b;
  background: rgba(255, 255, 255, 0.6);
}

.chat-section {
  display: flex;
  flex-direction: column;
  gap: 32px;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
}

.turn-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  padding-bottom: 24px;
}

.turn-container:last-child {
  border-bottom: none;
}

.chat__item {
  display: flex;
  width: 100%;
}

.chat__item--user {
  justify-content: flex-end;
}

.chat__item--assistant {
  justify-content: flex-start;
  width: 100%;
}

.chat__bubble {
  border-radius: 14px;
  padding: 10px 12px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.chat__bubble--user {
  max-width: 70%;
  background: #e8f0fe;
  color: #0f172a;
  border: none;
  border-radius: 22px;
  padding: 12px 16px;
  line-height: 1.55;
  word-break: break-word;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}

.chat__bubble--assistant {
  width: 100%;
  max-width: 100%;
  background: transparent;
  border: none;
  padding: 0;
}

.answer-content {
  max-width: 780px;
  margin: 0 auto;
  width: 100%;
}

.turn-images {
  margin: 12px auto 16px auto;
  max-width: 780px;
  width: 100%;
}

.turn-actions {
  display: flex;
  gap: 12px;
  margin: 16px auto 12px auto;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  max-width: 780px;
  width: 100%;
}

.turn-textbook {
  margin: 12px auto 0 auto;
  padding: 12px;
  background: rgba(249, 250, 251, 0.8);
  border-radius: 12px;
  border-left: 3px solid #14532d;
  max-width: 780px;
  width: 100%;
}

.turn-related {
  margin: 12px auto 0 auto;
  padding: 12px;
  background: rgba(249, 250, 251, 0.8);
  border-radius: 12px;
  border-left: 3px solid #14532d;
  max-width: 780px;
  width: 100%;
}

.chat__name {
  font-size: 12px;
  color: rgba(100, 116, 139, 1);
  margin-bottom: 8px;
  font-weight: 600;
  max-width: 780px;
  margin-left: auto;
  margin-right: auto;
  width: 100%;
}

.textbook-title {
  font-weight: 700;
  margin-bottom: 8px;
  font-size: 14px;
  color: #14532d;
}

.textbook-content {
  white-space: pre-wrap;
  line-height: 1.6;
  font-size: 14px;
  color: #334155;
}

.related-title {
  font-weight: 700;
  margin-bottom: 12px;
  font-size: 14px;
  color: #14532d;
}

.related-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.related-item {
  padding: 12px;
  background: white;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  position: relative;
}

.related-item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 10px;
}

.related-stem {
  font-size: 14px;
  line-height: 1.5;
  color: #1e293b;
  font-weight: 500;
  flex: 1;
}

.favorite-star {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #cbd5e1;
  transition: color 0.2s, transform 0.1s;
  padding: 0;
  line-height: 1;
  flex-shrink: 0;
}

.favorite-star:hover {
  transform: scale(1.1);
}

.favorite-star.favorited {
  color: #f59e0b;
  text-shadow: 0 0 2px rgba(245, 158, 11, 0.3);
}

.question-options {
  margin: 12px 0 8px 0;
  padding: 8px 12px;
  background: #f9fafb;
  border-radius: 12px;
}

.option-radio {
  margin: 8px 0;
}

.option-radio label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #1e293b;
}

.option-radio input[type="radio"] {
  margin: 0;
  cursor: pointer;
}

.submit-area {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 8px 0 12px 0;
}

.submit-answer-btn {
  padding: 4px 16px;
  font-size: 13px;
  background: #e2e8f0;
  border-radius: 20px;
  transition: all 0.2s;
}

.submit-answer-btn:hover:not(:disabled) {
  background: #cbd5e1;
  transform: translateY(-1px);
}

.submit-answer-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.feedback-message {
  font-size: 13px;
  color: #dc2626;
}

.feedback-message.correct {
  color: #16a34a;
}

.related-options {
  margin: 8px 0 12px 0;
  padding-left: 12px;
  border-left: 2px solid #e2e8f0;
}

.option-item {
  font-size: 13px;
  line-height: 1.6;
  margin: 4px 0;
  color: #475569;
  display: flex;
  gap: 8px;
}

.option-label {
  font-weight: 600;
  color: #14532d;
  min-width: 28px;
}

.option-text {
  flex: 1;
}

.related-buttons {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 8px;
}

.view-answer-btn,
.related-use-btn {
  padding: 4px 12px;
  font-size: 12px;
  border-radius: 16px;
  background: #f1f5f9;
  cursor: pointer;
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;
}

.view-answer-btn.active {
  background: #14532d;
  color: white;
  border-color: #14532d;
}

.view-answer-btn:hover,
.related-use-btn:hover {
  background: #e2e8f0;
  transform: translateY(-1px);
}

.view-answer-btn.active:hover {
  background: #0f3d22;
}

.answer-expanded {
  margin-top: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.answer-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 1px dashed #cbd5e1;
}

.answer-title {
  font-weight: 700;
  font-size: 14px;
  color: #14532d;
}

.answer-explanation {
  margin-top: 8px;
}

.explanation-title {
  font-weight: 600;
  font-size: 13px;
  color: #475569;
  margin-bottom: 6px;
}

.explanation-content {
  font-size: 13px;
  line-height: 1.6;
  color: #334155;
}

.empty-hint {
  color: #94a3b8;
  font-size: 13px;
  text-align: center;
  padding: 12px;
}

.turn-aux {
  padding: 6px 12px;
  font-size: 13px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.12);
  cursor: pointer;
  transition: all 0.2s ease;
}

.turn-aux[data-active='true'] {
  color: #14532d;
  border-color: #14532d;
  background: rgba(20, 83, 45, 0.08);
}

.turn-aux:hover {
  background: rgba(0, 0, 0, 0.04);
}

.global-aux {
  padding: 6px 12px;
  font-size: 13px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.12);
  cursor: pointer;
  transition: all 0.2s ease;
}

.global-aux[data-active='true'] {
  color: #14532d;
  border-color: #14532d;
  background: rgba(20, 83, 45, 0.08);
}

.global-aux:hover {
  background: rgba(0, 0, 0, 0.04);
}

.textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.16);
  background: rgba(255, 255, 255, 0.9);
  resize: vertical;
  font: inherit;
}

.image-badge {
  font-size: 12px;
  padding: 6px 12px;
  background: rgba(20, 83, 45, 0.1);
  border-radius: 20px;
  color: #14532d;
}

.primary,
.ghost {
  border-radius: 12px;
  padding: 10px 14px;
  cursor: pointer;
  border: 1px solid rgba(0, 0, 0, 0.16);
  font-weight: 650;
  transition: all 0.2s ease;
}

.primary {
  background: #14532d;
  color: white;
  border-color: transparent;
}

.primary:hover {
  background: #0f3d22;
  transform: translateY(-1px);
}

.ghost {
  background: rgba(255, 255, 255, 0.85);
}

.ghost:hover {
  background: rgba(255, 255, 255, 0.95);
  transform: translateY(-1px);
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.bottom {
  position: fixed;
  bottom: 0;
  z-index: 5;
  padding: 12px 14px calc(12px + env(safe-area-inset-bottom));
  transition: left 0.2s ease, width 0.2s ease;
}

.bottom__inner {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  border: 1px solid rgba(20, 83, 45, 0.35);
  border-radius: 14px;
  padding: 12px 12px 14px;
  background: rgb(255, 255, 255);
  backdrop-filter: blur(10px);
  box-sizing: border-box;
}

.bottom__input {
  resize: none;
  width: 100%;
}

.bottom__row {
  display: grid;
  gap: 10px;
}

.bottom__send {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  padding: 10px 14px;
}

@media (max-width: 520px) {
  .bottom__send {
    padding: 10px 12px;
  }
}

.bottom__input {
  border-color: rgb(255, 255, 255);
}

.bottom__input:focus,
.bottom__input:focus-visible {
  outline: none;
  border-color: rgb(255, 255, 255);
  box-shadow: 0 0 0 3px rgb(255, 255, 255);
}

.bottom__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.bottom__left {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.bottom__right {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-left: auto;
}

:deep(.md__content) {
  max-width: 780px;
  margin: 0 auto;
  width: 100%;
}

@media (max-width: 900px) {
  .answer-content,
  .turn-images,
  .turn-actions,
  .turn-textbook,
  .turn-related,
  .chat__name,
  :deep(.md__content) {
    max-width: 100%;
    padding-left: 16px;
    padding-right: 16px;
  }

  .chat-section {
    max-width: 100%;
  }

  .chat__bubble--user {
    max-width: 85%;
  }

  .bottom__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .bottom__right {
    margin-left: 0;
    justify-content: flex-end;
  }

  .bottom__inner {
    width: calc(100vw - 28px);
    max-width: 800px;
  }

  .related-buttons {
    justify-content: flex-start;
  }

  .related-options {
    padding-left: 8px;
  }
}
</style>