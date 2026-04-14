<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

type QuestionKind = 'single' | 'multiple' | 'fill' | 'short'

interface WrongQuestion {
  id: number
  kind: QuestionKind
  question: string
  options?: string[]
  correctAnswer?: string
  correctAnswers?: string[]
  chapter: string
}

type PracticeMode = 'chapter' | 'random'

interface UserAnswer {
  single?: string
  multiple?: string[]
  text?: string
}

const router = useRouter()

const allWrongQuestions = ref<WrongQuestion[]>([
  {
    id: 1,
    kind: 'single',
    question: '世界上最高的山峰是哪座？',
    options: ['珠穆朗玛峰', '乔戈里峰', '乞力马扎罗山', '阿空加瓜峰'],
    correctAnswer: '珠穆朗玛峰',
    chapter: '第一章 地球与地图',
  },
  {
    id: 2,
    kind: 'fill',
    question: '长江发源于______山脉。',
    correctAnswer: '唐古拉',
    chapter: '第二章 中国地理',
  },
  {
    id: 3,
    kind: 'multiple',
    question: '下列哪些属于欧洲联盟成员国？（多选）',
    options: ['法国', '瑞士', '德国', '挪威'],
    correctAnswers: ['法国', '德国'],
    chapter: '第三章 世界地理',
  },
  {
    id: 4,
    kind: 'short',
    question: '季风环流形成的主要原因是什么？',
    correctAnswer:
      '海陆热力性质差异导致冬夏季海陆气压中心交替，从而形成随季节变换风向的季风环流。',
    chapter: '第一章 地球与地图',
  },
  {
    id: 5,
    kind: 'single',
    question: '我国人口地理分界线「胡焕庸线」大致经过哪里？',
    options: [
      '黑河—腾冲一线',
      '秦岭—淮河一线',
      '大兴安岭—太行山一线',
      '长江一线',
    ],
    correctAnswer: '黑河—腾冲一线',
    chapter: '第二章 中国地理',
  },
])

const kindLabel: Record<QuestionKind, string> = {
  single: '单选题',
  multiple: '多选题',
  fill: '填空题',
  short: '简答题',
}

const practiceMode = ref<PracticeMode>('chapter')
const selectedChapters = ref<string[]>([])
const randomCount = ref(5)
const practiceQuestions = ref<WrongQuestion[]>([])
const submitted = ref(false)
const userAnswers = ref<Record<number, UserAnswer>>({})
const isPracticeStarted = ref(false)
const hasGeneratedPractice = ref(false)
const addedWrongQuestionIds = ref<Record<number, boolean>>({})
const WRONG_PRACTICE_STATE_KEY = 'geoedu_wrong_practice_state_v1'

interface WrongPracticeState {
  practiceMode: PracticeMode
  selectedChapters: string[]
  randomCount: number
  practiceQuestions: WrongQuestion[]
  submitted: boolean
  userAnswers: Record<number, UserAnswer>
  isPracticeStarted: boolean
  hasGeneratedPractice: boolean
  addedWrongQuestionIds: Record<number, boolean>
}

const chapterOptions = computed(() => {
  const set = new Set(allWrongQuestions.value.map((q) => q.chapter))
  return Array.from(set)
})

const maxRandomCount = computed(() => allWrongQuestions.value.length)

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function createPracticeSet() {
  let base: WrongQuestion[] = []

  if (practiceMode.value === 'chapter') {
    if (selectedChapters.value.length === 0) {
      alert('请至少选择一个章节')
      return
    }
    base = allWrongQuestions.value.filter((q) => selectedChapters.value.includes(q.chapter))
  } else {
    base = [...allWrongQuestions.value]
  }

  if (base.length === 0) {
    alert('当前条件没有可练习的题目')
    return
  }

  const count = Math.max(1, Math.min(randomCount.value || 1, base.length))
  practiceQuestions.value = shuffle(base).slice(0, count)
  submitted.value = false
  userAnswers.value = {}
  isPracticeStarted.value = false
  hasGeneratedPractice.value = true
  addedWrongQuestionIds.value = {}
}

function startPractice() {
  if (practiceQuestions.value.length === 0) {
    alert('请先生成练习题')
    return
  }
  isPracticeStarted.value = true
}

function updateSingle(id: number, value: string) {
  userAnswers.value = {
    ...userAnswers.value,
    [id]: { ...userAnswers.value[id], single: value },
  }
}

function toggleMultiple(id: number, value: string, checked: boolean) {
  const current = userAnswers.value[id]?.multiple ?? []
  const next = checked ? [...new Set([...current, value])] : current.filter((v) => v !== value)
  userAnswers.value = {
    ...userAnswers.value,
    [id]: { ...userAnswers.value[id], multiple: next },
  }
}

function updateText(id: number, value: string) {
  userAnswers.value = {
    ...userAnswers.value,
    [id]: { ...userAnswers.value[id], text: value },
  }
}

function isCorrect(q: WrongQuestion): boolean {
  const answer = userAnswers.value[q.id]
  if (!answer) return false
  if (q.kind === 'single') return (answer.single ?? '') === (q.correctAnswer ?? '')
  if (q.kind === 'multiple') {
    const userSet = new Set(answer.multiple ?? [])
    const correct = q.correctAnswers ?? []
    if (userSet.size !== correct.length) return false
    return correct.every((item) => userSet.has(item))
  }
  return (answer.text ?? '').trim() === (q.correctAnswer ?? '').trim()
}

const score = computed(() => practiceQuestions.value.filter((q) => isCorrect(q)).length)

function submitAll() {
  if (practiceQuestions.value.length === 0) {
    alert('请先生成练习题')
    return
  }
  submitted.value = true
}

function displayAnswer(q: WrongQuestion): string {
  if (q.kind === 'single' || q.kind === 'fill' || q.kind === 'short') return q.correctAnswer ?? ''
  return (q.correctAnswers ?? []).join('、')
}

function displayUserAnswer(q: WrongQuestion): string {
  const ans = userAnswers.value[q.id]
  if (!ans) return '未作答'
  if (q.kind === 'single') return ans.single || '未作答'
  if (q.kind === 'multiple') return ans.multiple?.length ? ans.multiple.join('、') : '未作答'
  return ans.text?.trim() || '未作答'
}

function askQuestionInQa(q: WrongQuestion) {
  router.push({
    path: '/qa',
    query: { prefill: q.question },
  })
}

function restorePageState() {
  try {
    const raw = sessionStorage.getItem(WRONG_PRACTICE_STATE_KEY)
    if (!raw) return
    const state = JSON.parse(raw) as WrongPracticeState
    practiceMode.value = state.practiceMode ?? 'chapter'
    selectedChapters.value = Array.isArray(state.selectedChapters) ? state.selectedChapters : []
    randomCount.value = typeof state.randomCount === 'number' ? state.randomCount : 5
    practiceQuestions.value = Array.isArray(state.practiceQuestions) ? state.practiceQuestions : []
    submitted.value = !!state.submitted
    userAnswers.value = state.userAnswers ?? {}
    isPracticeStarted.value = !!state.isPracticeStarted
    hasGeneratedPractice.value = !!state.hasGeneratedPractice
    addedWrongQuestionIds.value = state.addedWrongQuestionIds ?? {}
  } catch {
    // ignore invalid cached state
  }
}

watch(
  [
    practiceMode,
    selectedChapters,
    randomCount,
    practiceQuestions,
    submitted,
    userAnswers,
    isPracticeStarted,
    hasGeneratedPractice,
    addedWrongQuestionIds,
  ],
  () => {
    const state: WrongPracticeState = {
      practiceMode: practiceMode.value,
      selectedChapters: selectedChapters.value,
      randomCount: randomCount.value,
      practiceQuestions: practiceQuestions.value,
      submitted: submitted.value,
      userAnswers: userAnswers.value,
      isPracticeStarted: isPracticeStarted.value,
      hasGeneratedPractice: hasGeneratedPractice.value,
      addedWrongQuestionIds: addedWrongQuestionIds.value,
    }
    sessionStorage.setItem(WRONG_PRACTICE_STATE_KEY, JSON.stringify(state))
  },
  { deep: true },
)

onMounted(() => {
  restorePageState()
})

function exportPractice() {
  if (practiceQuestions.value.length === 0) {
    alert('当前没有可导出的练习题')
    return
  }

  const lines: string[] = []
  lines.push('GeoEdu 错题练习导出')
  lines.push(`导出时间: ${new Date().toLocaleString()}`)
  lines.push(`练习模式: ${practiceMode.value === 'chapter' ? '按章节' : '随机综合'}`)
  lines.push(`题目数量: ${practiceQuestions.value.length}`)
  lines.push('')

  practiceQuestions.value.forEach((q, idx) => {
    lines.push(`${idx + 1}. [${kindLabel[q.kind]}] ${q.question}`)
    lines.push(`章节: ${q.chapter}`)
    if (q.options?.length) {
      q.options.forEach((opt, i) => lines.push(`  ${String.fromCharCode(65 + i)}. ${opt}`))
    }
    lines.push(`你的答案: ${displayUserAnswer(q)}`)
    lines.push(`参考答案: ${displayAnswer(q)}`)
    if (submitted.value) {
      lines.push(`结果: ${isCorrect(q) ? '正确' : '错误'}`)
    }
    lines.push('')
  })

  if (submitted.value) {
    lines.push(`总分: ${score.value}/${practiceQuestions.value.length}`)
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `wrong-practice-${Date.now()}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

function backToWrongBook() {
  router.push('/wrong')
}
</script>

<template>
  <div class="practice-page">
    <header class="practice-page__header">
      <div>
        <h1 class="practice-page__title">错题在线练习</h1>
        <p class="practice-page__desc">先独立作答，统一提交后再核对答案。</p>
      </div>
      <button type="button" class="practice-page__back" @click="backToWrongBook">返回错题本</button>
    </header>

    <section v-if="!isPracticeStarted" class="practice-panel">
      <div class="practice-mode">
        <label><input v-model="practiceMode" type="radio" value="chapter" /> 按章节练习</label>
        <label><input v-model="practiceMode" type="radio" value="random" /> 随机综合练习</label>
      </div>

      <div v-if="practiceMode === 'chapter'" class="chapter-grid">
        <label v-for="chapter in chapterOptions" :key="chapter" class="chapter-item">
          <input v-model="selectedChapters" type="checkbox" :value="chapter" />
          <span>{{ chapter }}</span>
        </label>
      </div>

      <div class="count-row">
        <label for="count">题目数量</label>
        <input id="count" v-model.number="randomCount" type="number" min="1" :max="maxRandomCount" />
      </div>

      <div class="action-row">
        <button type="button" class="btn btn--primary" @click="createPracticeSet">生成练习</button>
        <button
          v-if="hasGeneratedPractice"
          type="button"
          class="btn btn--primary"
          :disabled="practiceQuestions.length === 0"
          @click="startPractice"
        >
          开始练习
        </button>
        <button type="button" class="btn btn--ghost" @click="exportPractice">导出为文件</button>
      </div>
    </section>

    <section v-if="hasGeneratedPractice && practiceQuestions.length" class="practice-list">
      <article v-for="(q, index) in practiceQuestions" :key="q.id" class="practice-card">
        <p class="practice-card__meta">第 {{ index + 1 }} 题 · {{ kindLabel[q.kind] }} · {{ q.chapter }}</p>
        <p class="practice-card__question">{{ q.question }}</p>

        <div v-if="q.kind === 'single' && q.options?.length" class="practice-options">
          <label v-for="opt in q.options" :key="opt" class="option-item">
            <input
              type="radio"
              :name="`single-${q.id}`"
              :value="opt"
              :disabled="submitted || !isPracticeStarted"
              @change="updateSingle(q.id, opt)"
            />
            <span>{{ opt }}</span>
          </label>
        </div>

        <div v-else-if="q.kind === 'multiple' && q.options?.length" class="practice-options">
          <label v-for="opt in q.options" :key="opt" class="option-item">
            <input
              type="checkbox"
              :value="opt"
              :disabled="submitted || !isPracticeStarted"
              @change="toggleMultiple(q.id, opt, ($event.target as HTMLInputElement).checked)"
            />
            <span>{{ opt }}</span>
          </label>
        </div>

        <input
          v-else-if="q.kind === 'fill'"
          class="practice-input"
          type="text"
          placeholder="请输入答案"
          :disabled="submitted || !isPracticeStarted"
          @input="updateText(q.id, ($event.target as HTMLInputElement).value)"
        />

        <textarea
          v-else
          class="practice-textarea"
          rows="4"
          placeholder="请输入你的作答"
          :disabled="submitted || !isPracticeStarted"
          @input="updateText(q.id, ($event.target as HTMLTextAreaElement).value)"
        />

        <div v-if="submitted" class="check-result" :class="{ 'is-correct': isCorrect(q), 'is-wrong': !isCorrect(q) }">
          <p>你的答案：{{ displayUserAnswer(q) }}</p>
          <p>参考答案：{{ displayAnswer(q) }}</p>
          <p>{{ isCorrect(q) ? '回答正确' : '回答错误' }}</p>
          <button type="button" class="btn btn--primary" @click="askQuestionInQa(q)">去提问</button>
        </div>
      </article>
    </section>

    <section v-if="isPracticeStarted && practiceQuestions.length" class="submit-row">
      <button type="button" class="btn btn--primary" :disabled="submitted" @click="submitAll">提交并核对答案</button>
      <p v-if="submitted" class="score">本次得分：{{ score }}/{{ practiceQuestions.length }}</p>
    </section>
  </div>
</template>

<style scoped>
.practice-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 20px 40px;
}

.practice-page__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 18px;
}

.practice-page__title {
  margin: 0 0 6px;
  font-size: 1.5rem;
}

.practice-page__desc {
  margin: 0;
  color: #64748b;
}

.practice-page__back {
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 10px;
  padding: 8px 12px;
  cursor: pointer;
}

.practice-panel {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px;
  background: #f8fafc;
  margin-bottom: 16px;
}

.practice-mode {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 12px;
}

.chapter-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.chapter-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  padding: 6px 10px;
}

.count-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.count-row input {
  width: 90px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 6px 10px;
}

.action-row {
  display: flex;
  gap: 10px;
}

.btn {
  border: none;
  border-radius: 10px;
  padding: 8px 14px;
  font-weight: 600;
  cursor: pointer;
}

.btn--primary {
  background: #14532d;
  color: #fff;
}

.btn--ghost {
  border: 1px solid #d1d5db;
  background: #fff;
  color: #334155;
}

.practice-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.practice-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px;
  background: #fff;
}

.practice-card__meta {
  margin: 0 0 8px;
  font-size: 0.8rem;
  color: #64748b;
}

.practice-card__question {
  margin: 0 0 10px;
  font-weight: 600;
}

.practice-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.practice-input,
.practice-textarea {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 8px 10px;
}

.check-result {
  margin-top: 10px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #fecaca;
  background: #fef2f2;
}

.check-result.is-correct {
  border-color: #86efac;
  background: #f0fdf4;
}

.check-result p {
  margin: 4px 0;
}

.submit-row {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.score {
  margin: 0;
  font-weight: 700;
  color: #166534;
}
</style>
