<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { addQuestionToWrongBook } from '../utils/wrongBook'

type Question = {
  id: string
  text: string
  type: '单选' | '多选' | '判断' | '简答'
  chapter: string
  options?: string[]
  answer: string
}

type PracticeMode = 'chapter' | 'random'

const router = useRouter()
const practiceMode = ref<PracticeMode>('chapter')
const selectedChapters = ref<string[]>([])
const questionCount = ref(4)
const submitted = ref(false)
const practiceQuestions = ref<Question[]>([])
const userAnswers = ref<Record<string, string | string[]>>({})
const isPracticeStarted = ref(false)
const hasGeneratedPractice = ref(false)
const addedWrongQuestionIds = ref<Record<string, boolean>>({})
const QUESTION_PRACTICE_STATE_KEY = 'geoedu_question_practice_state_v1'

interface QuestionPracticeState {
  practiceMode: PracticeMode
  selectedChapters: string[]
  questionCount: number
  submitted: boolean
  practiceQuestions: Question[]
  userAnswers: Record<string, string | string[]>
  isPracticeStarted: boolean
  hasGeneratedPractice: boolean
  addedWrongQuestionIds: Record<string, boolean>
}

const allQuestions = ref<Question[]>([
  {
    id: '1',
    text: '地球自转的周期是？',
    type: '单选',
    chapter: '自然地理',
    options: ['A. 12小时', 'B. 24小时', 'C. 一个月', 'D. 一年'],
    answer: 'B',
  },
  {
    id: '2',
    text: '以下哪些属于大气环流的组成部分？（多选）',
    type: '多选',
    chapter: '自然地理',
    options: ['A. 三圈环流', 'B. 季风环流', 'C. 海陆风', 'D. 焚风'],
    answer: 'ABC',
  },
  {
    id: '3',
    text: '洋流对沿岸气候的影响是：暖流降温减湿，寒流增温增湿。',
    type: '判断',
    chapter: '自然地理',
    options: ['对', '错'],
    answer: '错',
  },
  {
    id: '4',
    text: '简述人口迁移对迁入地的积极影响。',
    type: '简答',
    chapter: '人文地理',
    answer: '提供劳动力、促进经济发展、提升文化多样性等。',
  },
])

const chapterOptions = computed(() => Array.from(new Set(allQuestions.value.map((q) => q.chapter))))

function shuffle<T>(arr: T[]) {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function generatePractice() {
  let base = allQuestions.value
  if (practiceMode.value === 'chapter') {
    if (!selectedChapters.value.length) {
      alert('请至少选择一个章节')
      return
    }
    base = base.filter((q) => selectedChapters.value.includes(q.chapter))
  }
  if (!base.length) {
    alert('当前条件没有可练习题目')
    return
  }
  const count = Math.max(1, Math.min(questionCount.value, base.length))
  practiceQuestions.value = shuffle(base).slice(0, count)
  submitted.value = false
  userAnswers.value = {}
  isPracticeStarted.value = false
  hasGeneratedPractice.value = true
  addedWrongQuestionIds.value = {}
}

function startPractice() {
  if (!practiceQuestions.value.length) {
    alert('请先生成练习')
    return
  }
  isPracticeStarted.value = true
}

function selectSingle(id: string, value: string) {
  userAnswers.value[id] = value
}

function toggleMultiple(id: string, value: string, checked: boolean) {
  const current = Array.isArray(userAnswers.value[id]) ? (userAnswers.value[id] as string[]) : []
  userAnswers.value[id] = checked ? [...new Set([...current, value])] : current.filter((x) => x !== value)
}

function setText(id: string, value: string) {
  userAnswers.value[id] = value
}

function normalizeMultipleAnswer(ans: string) {
  return ans.split('').sort().join('')
}

function isCorrect(q: Question): boolean {
  const ans = userAnswers.value[q.id]
  if (q.type === '多选') {
    const user = Array.isArray(ans) ? ans.map((x) => x[0]).sort().join('') : ''
    return user === normalizeMultipleAnswer(q.answer)
  }
  const userText = Array.isArray(ans) ? '' : (ans ?? '').toString().trim()
  return userText === q.answer.trim()
}

const score = computed(() => practiceQuestions.value.filter((q) => isCorrect(q)).length)

function submitAll() {
  if (!practiceQuestions.value.length) {
    alert('请先生成练习')
    return
  }
  submitted.value = true
}

function showUserAnswer(id: string) {
  const ans = userAnswers.value[id]
  if (!ans) return '未作答'
  return Array.isArray(ans) ? ans.join('、') : ans
}

function toMultipleCorrectAnswers(q: Question): string[] {
  if (!q.options?.length) return []
  const answerSet = new Set(q.answer.split(''))
  return q.options.filter((opt) => answerSet.has(opt[0]))
}

function resolveKind(type: Question['type']) {
  if (type === '单选' || type === '判断') return 'single'
  if (type === '多选') return 'multiple'
  return 'short'
}

function askAddToWrongBook(q: Question) {
  if (addedWrongQuestionIds.value[q.id]) return
  addQuestionToWrongBook({
    kind: resolveKind(q.type),
    question: q.text,
    options: q.options,
    correctAnswer: q.type === '多选' ? undefined : q.answer,
    correctAnswers: q.type === '多选' ? toMultipleCorrectAnswers(q) : undefined,
    chapter: q.chapter,
  })
  addedWrongQuestionIds.value = { ...addedWrongQuestionIds.value, [q.id]: true }
}

function askQuestionInQa(q: Question) {
  router.push({
    path: '/qa',
    query: { prefill: q.text },
  })
}

function restorePageState() {
  try {
    const raw = sessionStorage.getItem(QUESTION_PRACTICE_STATE_KEY)
    if (!raw) return
    const state = JSON.parse(raw) as QuestionPracticeState
    practiceMode.value = state.practiceMode ?? 'chapter'
    selectedChapters.value = Array.isArray(state.selectedChapters) ? state.selectedChapters : []
    questionCount.value = typeof state.questionCount === 'number' ? state.questionCount : 4
    submitted.value = !!state.submitted
    practiceQuestions.value = Array.isArray(state.practiceQuestions) ? state.practiceQuestions : []
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
    questionCount,
    submitted,
    practiceQuestions,
    userAnswers,
    isPracticeStarted,
    hasGeneratedPractice,
    addedWrongQuestionIds,
  ],
  () => {
    const state: QuestionPracticeState = {
      practiceMode: practiceMode.value,
      selectedChapters: selectedChapters.value,
      questionCount: questionCount.value,
      submitted: submitted.value,
      practiceQuestions: practiceQuestions.value,
      userAnswers: userAnswers.value,
      isPracticeStarted: isPracticeStarted.value,
      hasGeneratedPractice: hasGeneratedPractice.value,
      addedWrongQuestionIds: addedWrongQuestionIds.value,
    }
    sessionStorage.setItem(QUESTION_PRACTICE_STATE_KEY, JSON.stringify(state))
  },
  { deep: true },
)

onMounted(() => {
  restorePageState()
})

function exportResult() {
  if (!practiceQuestions.value.length) {
    alert('当前没有可导出内容')
    return
  }
  const lines: string[] = []
  lines.push('GeoEdu 题库练习导出')
  lines.push(`导出时间: ${new Date().toLocaleString()}`)
  lines.push('')
  practiceQuestions.value.forEach((q, idx) => {
    lines.push(`${idx + 1}. ${q.text}`)
    lines.push(`章节: ${q.chapter} | 题型: ${q.type}`)
    lines.push(`你的答案: ${showUserAnswer(q.id)}`)
    lines.push(`参考答案: ${q.answer}`)
    if (submitted.value) lines.push(`结果: ${isCorrect(q) ? '正确' : '错误'}`)
    lines.push('')
  })
  if (submitted.value) lines.push(`总分: ${score.value}/${practiceQuestions.value.length}`)
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `question-practice-${Date.now()}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

function backToBank() {
  router.push('/question-bank')
}
</script>

<template>
  <div class="practice-page">
    <header class="practice-page__header">
      <div>
        <h1 class="practice-page__title">题库在线练习</h1>
        <p class="practice-page__desc">先作答，统一提交后核对答案。</p>
      </div>
      <button type="button" class="practice-page__back" @click="backToBank">返回题库</button>
    </header>

    <section v-if="!isPracticeStarted" class="practice-panel">
      <div class="practice-mode">
        <label><input v-model="practiceMode" type="radio" value="chapter" /> 按章节练习</label>
        <label><input v-model="practiceMode" type="radio" value="random" /> 随机综合练习</label>
      </div>
      <div v-if="practiceMode === 'chapter'" class="chapter-grid">
        <label v-for="c in chapterOptions" :key="c" class="chapter-item">
          <input v-model="selectedChapters" type="checkbox" :value="c" />
          <span>{{ c }}</span>
        </label>
      </div>
      <div class="count-row">
        <label>题目数量</label>
        <input v-model.number="questionCount" type="number" min="1" :max="allQuestions.length" />
      </div>
      <div class="action-row">
        <button type="button" class="btn btn--primary" @click="generatePractice">生成练习</button>
        <button
          v-if="hasGeneratedPractice"
          type="button"
          class="btn btn--primary"
          :disabled="!practiceQuestions.length"
          @click="startPractice"
        >
          开始练习
        </button>
        <button type="button" class="btn btn--ghost" @click="exportResult">导出为文件</button>
      </div>
    </section>

    <section v-if="hasGeneratedPractice && practiceQuestions.length" class="practice-list">
      <article v-for="(q, idx) in practiceQuestions" :key="q.id" class="practice-card">
        <p class="practice-card__meta">第 {{ idx + 1 }} 题 · {{ q.type }} · {{ q.chapter }}</p>
        <p class="practice-card__question">{{ q.text }}</p>

        <div v-if="(q.type === '单选' || q.type === '判断') && q.options?.length" class="practice-options">
          <label v-for="opt in q.options" :key="opt" class="option-item">
            <input
              type="radio"
              :name="`single-${q.id}`"
              :disabled="submitted || !isPracticeStarted"
              @change="selectSingle(q.id, opt[0])"
            />
            <span>{{ opt }}</span>
          </label>
        </div>

        <div v-else-if="q.type === '多选' && q.options?.length" class="practice-options">
          <label v-for="opt in q.options" :key="opt" class="option-item">
            <input
              type="checkbox"
              :disabled="submitted || !isPracticeStarted"
              @change="toggleMultiple(q.id, opt, ($event.target as HTMLInputElement).checked)"
            />
            <span>{{ opt }}</span>
          </label>
        </div>

        <textarea
          v-else
          class="practice-textarea"
          rows="4"
          :disabled="submitted || !isPracticeStarted"
          placeholder="请输入作答内容"
          @input="setText(q.id, ($event.target as HTMLTextAreaElement).value)"
        />

        <div v-if="submitted" class="check-result" :class="{ 'is-correct': isCorrect(q) }">
          <p>你的答案：{{ showUserAnswer(q.id) }}</p>
          <p>参考答案：{{ q.answer }}</p>
          <button type="button" class="btn btn--primary" @click="askQuestionInQa(q)">去提问</button>
          <button
            v-if="!isCorrect(q)"
            type="button"
            class="btn btn--ghost"
            :disabled="!!addedWrongQuestionIds[q.id]"
            @click="askAddToWrongBook(q)"
          >
            {{ addedWrongQuestionIds[q.id] ? '已收藏到错题本' : '收藏到错题本' }}
          </button>
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
.practice-page { max-width: 900px; margin: 0 auto; padding: 24px 20px 40px; }
.practice-page__header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 18px; }
.practice-page__title { margin: 0 0 6px; font-size: 1.5rem; }
.practice-page__desc { margin: 0; color: #64748b; }
.practice-page__back { border: 1px solid #d1d5db; background: #fff; border-radius: 10px; padding: 8px 12px; cursor: pointer; }
.practice-panel { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; background: #f8fafc; margin-bottom: 16px; }
.practice-mode { display: flex; flex-wrap: wrap; gap: 14px; margin-bottom: 12px; }
.chapter-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.chapter-item { display: inline-flex; align-items: center; gap: 6px; background: #fff; border: 1px solid #e2e8f0; border-radius: 999px; padding: 6px 10px; }
.count-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.count-row input { width: 90px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px 10px; }
.action-row { display: flex; gap: 10px; }
.btn { border: none; border-radius: 10px; padding: 8px 14px; font-weight: 600; cursor: pointer; }
.btn--primary { background: #14532d; color: #fff; }
.btn--ghost { border: 1px solid #d1d5db; background: #fff; color: #334155; }
.practice-list { display: flex; flex-direction: column; gap: 12px; }
.practice-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; background: #fff; }
.practice-card__meta { margin: 0 0 8px; font-size: 0.8rem; color: #64748b; }
.practice-card__question { margin: 0 0 10px; font-weight: 600; }
.practice-options { display: flex; flex-direction: column; gap: 8px; }
.option-item { display: flex; gap: 8px; align-items: flex-start; }
.practice-textarea { width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 10px; }
.check-result { margin-top: 10px; padding: 10px; border-radius: 8px; border: 1px solid #fecaca; background: #fef2f2; }
.check-result.is-correct { border-color: #86efac; background: #f0fdf4; }
.check-result p { margin: 4px 0; }
.submit-row { margin-top: 16px; display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.score { margin: 0; font-weight: 700; color: #166534; }
</style>
