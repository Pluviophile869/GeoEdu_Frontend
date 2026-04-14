<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  DEFAULT_WRONG_BOOK_QUESTIONS,
  loadWrongBookQuestions,
  saveWrongBookQuestions,
  type WrongBookQuestion,
} from '../utils/wrongBook'

type ClassifyMode = 'errorRate' | 'knowledge' | 'chapter'
type Difficulty = WrongBookQuestion['difficulty']
type QuestionKind = WrongBookQuestion['kind']
type WrongQuestion = WrongBookQuestion

const router = useRouter()

const wrongQuestions = ref<WrongQuestion[]>(loadWrongBookQuestions(DEFAULT_WRONG_BOOK_QUESTIONS))

watch(
  wrongQuestions,
  (val) => {
    saveWrongBookQuestions(val)
  },
  { deep: true },
)

const classifyMode = ref<ClassifyMode>('errorRate')

const errorRateBand = ref<'all' | 'high' | 'mid' | 'low'>('all')
const selectedKnowledge = ref<string>('__all__')
const selectedChapter = ref<string>('__all__')
/** 题型筛选，与各子分类并列 */
const kindFilter = ref<'all' | QuestionKind>('all')
/** 难度筛选 */
const difficultyFilter = ref<'all' | Difficulty>('all')
/** 学习状态筛选：放在分类区下方 */
const masteryFilter = ref<'all' | 'pending' | 'mastered'>('all')

const knowledgeOptions = computed(() => {
  const set = new Set<string>()
  wrongQuestions.value.forEach((q) => q.knowledgePoints.forEach((k) => set.add(k)))
  return Array.from(set).sort()
})

const chapterOptions = computed(() => {
  const set = new Set(wrongQuestions.value.map((q) => q.chapter))
  return Array.from(set).sort()
})

function bandMatches(rate: number, band: typeof errorRateBand.value): boolean {
  if (band === 'all') return true
  if (band === 'high') return rate >= 60
  if (band === 'mid') return rate >= 30 && rate < 60
  return rate < 30
}

const filteredQuestions = computed(() => {
  let list = [...wrongQuestions.value]

  if (masteryFilter.value === 'pending') {
    list = list.filter((q) => !q.mastered)
  } else if (masteryFilter.value === 'mastered') {
    list = list.filter((q) => q.mastered)
  }

  if (classifyMode.value === 'errorRate') {
    list = list.filter((q) => bandMatches(q.errorRate, errorRateBand.value))
  } else if (classifyMode.value === 'knowledge') {
    if (selectedKnowledge.value !== '__all__') {
      list = list.filter((q) => q.knowledgePoints.includes(selectedKnowledge.value))
    }
  } else {
    if (selectedChapter.value !== '__all__') {
      list = list.filter((q) => q.chapter === selectedChapter.value)
    }
  }

  if (kindFilter.value !== 'all') {
    list = list.filter((q) => q.kind === kindFilter.value)
  }

  if (difficultyFilter.value !== 'all') {
    list = list.filter((q) => q.difficulty === difficultyFilter.value)
  }

  return list
})

const stats = computed(() => {
  const all = wrongQuestions.value
  return {
    total: all.length,
    pending: all.filter((q) => !q.mastered).length,
    mastered: all.filter((q) => q.mastered).length,
  }
})

const difficultyLabel: Record<Difficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
}

const kindLabel: Record<QuestionKind, string> = {
  single: '单选题',
  multiple: '多选题',
  fill: '填空题',
  short: '简答题',
}

const kindFilterOptions: { key: 'all' | QuestionKind; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'single', label: kindLabel.single },
  { key: 'multiple', label: kindLabel.multiple },
  { key: 'fill', label: kindLabel.fill },
  { key: 'short', label: kindLabel.short },
]

const difficultyFilterOptions: { key: 'all' | Difficulty; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'easy', label: difficultyLabel.easy },
  { key: 'medium', label: difficultyLabel.medium },
  { key: 'hard', label: difficultyLabel.hard },
]

function difficultyClass(d: Difficulty): string {
  return `difficulty--${d}`
}

function kindClass(k: QuestionKind): string {
  return `qkind--${k}`
}

function markMastered(id: number) {
  const q = wrongQuestions.value.find((x) => x.id === id)
  if (q) q.mastered = true
}

function deleteQuestion(id: number) {
  wrongQuestions.value = wrongQuestions.value.filter((q) => q.id !== id)
  const next = { ...answerExpanded.value }
  delete next[id]
  answerExpanded.value = next
}

function goWrongQuiz() {
  router.push({ path: '/wrong/practice' })
}

const errorRateOptions = [
  { key: 'all' as const, label: '全部' },
  { key: 'high' as const, label: '高 (≥60%)' },
  { key: 'mid' as const, label: '中 (30%–59%)' },
  { key: 'low' as const, label: '低 (30%以下)' },
]

const answerExpanded = ref<Record<number, boolean>>({})

function isAnswerOpen(id: number): boolean {
  return !!answerExpanded.value[id]
}

function toggleAnswer(id: number) {
  answerExpanded.value = {
    ...answerExpanded.value,
    [id]: !answerExpanded.value[id],
  }
}

function isOptionCorrect(q: WrongQuestion, opt: string): boolean {
  if (q.kind === 'single') return q.correctAnswer === opt
  if (q.kind === 'multiple') return (q.correctAnswers ?? []).includes(opt)
  return false
}
</script>

<template>
  <div class="wrong-page">
    <header class="wrong-page__header">
      <div>
        <h1 class="wrong-page__title">错题本</h1>
        <p class="wrong-page__desc">
          共 {{ stats.total }} 道 · 待巩固 {{ stats.pending }} · 已掌握 {{ stats.mastered }}
        </p>
      </div>
      <button type="button" class="wrong-page__cta" @click="goWrongQuiz">去做错题</button>
    </header>

    <section class="wrong-page__classify" aria-label="错题分类">
      <div class="wrong-page__modes">
        <span class="wrong-page__modes-label">分类</span>
        <div class="wrong-page__segment" role="tablist">
          <button
            type="button"
            role="tab"
            :aria-selected="classifyMode === 'errorRate'"
            :class="{ 'is-active': classifyMode === 'errorRate' }"
            @click="classifyMode = 'errorRate'"
          >
            按错误率
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="classifyMode === 'knowledge'"
            :class="{ 'is-active': classifyMode === 'knowledge' }"
            @click="classifyMode = 'knowledge'"
          >
            按知识点
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="classifyMode === 'chapter'"
            :class="{ 'is-active': classifyMode === 'chapter' }"
            @click="classifyMode = 'chapter'"
          >
            按章节
          </button>
        </div>
      </div>

      <div v-if="classifyMode === 'errorRate'" class="wrong-page__subfilter-row">
        <div class="wrong-page__subfilter-block">
          <label class="wrong-page__subfilter-label" for="wrong-filter-error-rate">错误率</label>
          <div class="wrong-page__select-wrap">
            <select id="wrong-filter-error-rate" v-model="errorRateBand" class="wrong-page__select">
              <option v-for="opt in errorRateOptions" :key="opt.key" :value="opt.key">
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>
        <div class="wrong-page__subfilter-block">
          <label class="wrong-page__subfilter-label" for="wrong-filter-kind-rate">题型</label>
          <div class="wrong-page__select-wrap">
            <select id="wrong-filter-kind-rate" v-model="kindFilter" class="wrong-page__select">
              <option v-for="opt in kindFilterOptions" :key="opt.key" :value="opt.key">
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>
        <div class="wrong-page__subfilter-block">
          <label class="wrong-page__subfilter-label" for="wrong-filter-difficulty-rate">难度</label>
          <div class="wrong-page__select-wrap">
            <select id="wrong-filter-difficulty-rate" v-model="difficultyFilter" class="wrong-page__select">
              <option v-for="opt in difficultyFilterOptions" :key="opt.key" :value="opt.key">
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <div v-else-if="classifyMode === 'knowledge'" class="wrong-page__subfilter-row">
        <div class="wrong-page__subfilter-block">
          <label class="wrong-page__subfilter-label" for="wrong-filter-knowledge">知识点</label>
          <div class="wrong-page__select-wrap">
            <select id="wrong-filter-knowledge" v-model="selectedKnowledge" class="wrong-page__select">
              <option value="__all__">全部知识点</option>
              <option v-for="k in knowledgeOptions" :key="k" :value="k">{{ k }}</option>
            </select>
          </div>
        </div>
        <div class="wrong-page__subfilter-block">
          <label class="wrong-page__subfilter-label" for="wrong-filter-kind-knowledge">题型</label>
          <div class="wrong-page__select-wrap">
            <select id="wrong-filter-kind-knowledge" v-model="kindFilter" class="wrong-page__select">
              <option v-for="opt in kindFilterOptions" :key="opt.key" :value="opt.key">
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>
        <div class="wrong-page__subfilter-block">
          <label class="wrong-page__subfilter-label" for="wrong-filter-difficulty-knowledge">难度</label>
          <div class="wrong-page__select-wrap">
            <select id="wrong-filter-difficulty-knowledge" v-model="difficultyFilter" class="wrong-page__select">
              <option v-for="opt in difficultyFilterOptions" :key="opt.key" :value="opt.key">
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <div v-else class="wrong-page__subfilter-row">
        <div class="wrong-page__subfilter-block">
          <label class="wrong-page__subfilter-label" for="wrong-filter-chapter">章节</label>
          <div class="wrong-page__select-wrap">
            <select id="wrong-filter-chapter" v-model="selectedChapter" class="wrong-page__select">
              <option value="__all__">全部章节</option>
              <option v-for="c in chapterOptions" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
        </div>
        <div class="wrong-page__subfilter-block">
          <label class="wrong-page__subfilter-label" for="wrong-filter-kind-chapter">题型</label>
          <div class="wrong-page__select-wrap">
            <select id="wrong-filter-kind-chapter" v-model="kindFilter" class="wrong-page__select">
              <option v-for="opt in kindFilterOptions" :key="opt.key" :value="opt.key">
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>
        <div class="wrong-page__subfilter-block">
          <label class="wrong-page__subfilter-label" for="wrong-filter-difficulty-chapter">难度</label>
          <div class="wrong-page__select-wrap">
            <select id="wrong-filter-difficulty-chapter" v-model="difficultyFilter" class="wrong-page__select">
              <option v-for="opt in difficultyFilterOptions" :key="opt.key" :value="opt.key">
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </section>

    <section class="wrong-page__status-filter" aria-label="掌握状态筛选">
      <button
        type="button"
        class="wrong-page__status-btn"
        :class="{ 'is-active': masteryFilter === 'all' }"
        @click="masteryFilter = 'all'"
      >
        全部
      </button>
      <button
        type="button"
        class="wrong-page__status-btn"
        :class="{ 'is-active': masteryFilter === 'pending' }"
        @click="masteryFilter = 'pending'"
      >
        待巩固
      </button>
      <button
        type="button"
        class="wrong-page__status-btn"
        :class="{ 'is-active': masteryFilter === 'mastered' }"
        @click="masteryFilter = 'mastered'"
      >
        已掌握
      </button>
    </section>

    <ul class="wrong-page__list">
      <li v-for="q in filteredQuestions" :key="q.id" class="wrong-card">
        <div class="wrong-card__top">
          <span class="wrong-card__difficulty" :class="difficultyClass(q.difficulty)">
            {{ difficultyLabel[q.difficulty] }}
          </span>
          <span class="wrong-card__qkind" :class="kindClass(q.kind)">{{ kindLabel[q.kind] }}</span>
          <div class="wrong-card__tags">
            <span v-for="kp in q.knowledgePoints" :key="kp" class="wrong-card__tag">{{ kp }}</span>
          </div>
          <span class="wrong-card__chapter">{{ q.chapter }}</span>
        </div>

        <div class="wrong-card__stem">
          <p class="wrong-card__question">{{ q.question }}</p>

          <ul v-if="q.kind === 'single' && q.options?.length" class="wrong-card__options" aria-label="选项">
            <li
              v-for="(opt, idx) in q.options"
              :key="idx"
              class="wrong-card__option"
              :class="{ 'wrong-card__option--correct': isAnswerOpen(q.id) && isOptionCorrect(q, opt) }"
            >
              <span class="wrong-card__option-key">{{ String.fromCharCode(65 + idx) }}.</span>
              <span>{{ opt }}</span>
            </li>
          </ul>

          <ul v-else-if="q.kind === 'multiple' && q.options?.length" class="wrong-card__options" aria-label="选项">
            <li
              v-for="(opt, idx) in q.options"
              :key="idx"
              class="wrong-card__option"
              :class="{ 'wrong-card__option--correct': isAnswerOpen(q.id) && isOptionCorrect(q, opt) }"
            >
              <span class="wrong-card__option-key" aria-hidden="true">☑</span>
              <span>{{ opt }}</span>
            </li>
          </ul>
        </div>

        <div class="wrong-card__answer-row">
          <button
            type="button"
            class="wrong-card__answer-toggle"
            :aria-expanded="isAnswerOpen(q.id)"
            :aria-controls="`wrong-answer-${q.id}`"
            @click="toggleAnswer(q.id)"
          >
            <span class="wrong-card__answer-toggle-text">{{
              isAnswerOpen(q.id) ? '收起答案' : '显示答案'
            }}</span>
            <span class="wrong-card__answer-toggle-chevron" :data-open="isAnswerOpen(q.id)">▼</span>
          </button>
        </div>

        <Transition name="wrong-answer">
          <div
            v-show="isAnswerOpen(q.id)"
            :id="`wrong-answer-${q.id}`"
            class="wrong-card__answer"
            role="region"
            :aria-label="`第 ${q.id} 题参考答案`"
          >
            <template v-if="q.kind === 'single' || q.kind === 'multiple'">
              <span class="wrong-card__answer-label">参考答案</span>
              <p v-if="q.kind === 'single'" class="wrong-card__answer-text">{{ q.correctAnswer }}</p>
              <p v-else class="wrong-card__answer-text">{{ (q.correctAnswers ?? []).join('、') }}</p>
            </template>
            <template v-else-if="q.kind === 'fill'">
              <span class="wrong-card__answer-label">参考答案</span>
              <p class="wrong-card__answer-text">{{ q.correctAnswer }}</p>
            </template>
            <template v-else>
              <span class="wrong-card__answer-label">参考答案</span>
              <p class="wrong-card__answer-text wrong-card__answer-text--long">{{ q.correctAnswer }}</p>
            </template>
          </div>
        </Transition>

        <div class="wrong-card__footer">
          <div class="wrong-card__stats">
            <span class="wrong-card__meta">错误率 {{ q.errorRate }}%</span>
            <span class="wrong-card__meta">错误 {{ q.wrongCount }} 次</span>
          </div>
          <div class="wrong-card__actions">
            <button type="button" class="wrong-card__btn wrong-card__btn--ghost" @click="deleteQuestion(q.id)">
              删除
            </button>
            <button type="button" class="wrong-card__btn wrong-card__btn--primary" @click="markMastered(q.id)">
              标记为已掌握
            </button>
          </div>
        </div>
      </li>
    </ul>

    <div v-if="filteredQuestions.length === 0" class="wrong-page__empty">
      <p class="wrong-page__empty-title">当前条件下没有待巩固错题</p>
      <p class="wrong-page__empty-hint">可切换分类或去问答中继续积累错题。</p>
      <button type="button" class="wrong-page__cta wrong-page__cta--inline" @click="goWrongQuiz">
        去做错题
      </button>
    </div>
  </div>
</template>

<style scoped>
.wrong-page {
  max-width: 880px;
  margin: 0 auto;
  padding: 24px 20px 40px;
}

.wrong-page__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.wrong-page__title {
  margin: 0 0 6px;
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.02em;
}

.wrong-page__desc {
  margin: 0;
  font-size: 0.875rem;
  color: #64748b;
}

.wrong-page__cta {
  flex-shrink: 0;
  padding: 10px 18px;
  border: none;
  border-radius: 10px;
  background: #14532d;
  color: #fff;
  font-weight: 600;
  font-size: 0.9375rem;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
  transition: background 0.15s ease, transform 0.1s ease;
}

.wrong-page__cta:hover {
  background: #166534;
}

.wrong-page__cta:active {
  transform: translateY(1px);
}

.wrong-page__cta--inline {
  margin-top: 12px;
}

.wrong-page__classify {
  margin-bottom: 20px;
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

.wrong-page__status-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}

.wrong-page__status-btn {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid #d1d5db;
  background: #fff;
  color: #475569;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
}

.wrong-page__status-btn:hover {
  border-color: #94a3b8;
}

.wrong-page__status-btn.is-active {
  background: #ecfdf5;
  border-color: #86efac;
  color: #14532d;
}

.wrong-page__modes {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.wrong-page__modes-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #475569;
}

.wrong-page__segment {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}

.wrong-page__segment button {
  padding: 8px 14px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #475569;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.wrong-page__segment button:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.wrong-page__segment button.is-active {
  background: #ecfdf5;
  color: #14532d;
  box-shadow: inset 0 0 0 1px #bbf7d0;
}

.wrong-page__subfilter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 16px 24px;
}

.wrong-page__subfilter-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  flex: 1 1 220px;
}

.wrong-page__subfilter-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #475569;
}

.wrong-page__select-wrap {
  display: block;
  width: 100%;
}

.wrong-page__select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  color: #0f172a;
  font-size: 0.875rem;
  cursor: pointer;
}

.wrong-page__select:focus {
  outline: 2px solid #86efac;
  outline-offset: 1px;
}

.visually-hidden {
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

.wrong-page__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.wrong-card {
  padding: 18px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.wrong-card__top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin-bottom: 12px;
}

.wrong-card__difficulty {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
}

.wrong-card__qkind {
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  letter-spacing: 0.02em;
}

.qkind--single {
  background: #eff6ff;
  color: #1d4ed8;
}

.qkind--multiple {
  background: #faf5ff;
  color: #7c3aed;
}

.qkind--fill {
  background: #fff7ed;
  color: #c2410c;
}

.qkind--short {
  background: #f0fdf4;
  color: #14532d;
}

.difficulty--easy {
  background: #ecfdf5;
  color: #166534;
}

.difficulty--medium {
  background: #fffbeb;
  color: #a16207;
}

.difficulty--hard {
  background: #fef2f2;
  color: #b91c1c;
}

.wrong-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
  min-width: 120px;
  align-items: center;
}

.wrong-card__tag {
  font-size: 0.75rem;
  padding: 4px 10px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #334155;
  border: 1px solid #e2e8f0;
}

.wrong-card__chapter {
  margin-left: auto;
  font-size: 0.75rem;
  color: #94a3b8;
  max-width: 100%;
  text-align: right;
}

@media (max-width: 560px) {
  .wrong-card__chapter {
    margin-left: 0;
    text-align: left;
    width: 100%;
  }
}

.wrong-card__stem {
  margin-bottom: 8px;
}

.wrong-card__question {
  margin: 0 0 10px;
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.55;
}

.wrong-card__options {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.wrong-card__option {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  font-size: 0.875rem;
  color: #334155;
  line-height: 1.45;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #fafafa;
}

.wrong-card__option--correct {
  border-color: #86efac;
  background: #f0fdf4;
  color: #14532d;
  font-weight: 600;
}

.wrong-card__option-key {
  flex-shrink: 0;
  font-weight: 700;
  color: #64748b;
}

.wrong-card__option--correct .wrong-card__option-key {
  color: #14532d;
}

.wrong-card__answer-row {
  margin-bottom: 0;
}

.wrong-card__answer-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 8px;
  padding: 6px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  color: #14532d;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.wrong-card__answer-toggle:hover {
  background: #f0fdf4;
  border-color: #86efac;
}

.wrong-card__answer-toggle:focus-visible {
  outline: 2px solid #14532d;
  outline-offset: 2px;
}

.wrong-card__answer-toggle-chevron {
  display: inline-block;
  font-size: 0.625rem;
  line-height: 1;
  transition: transform 0.2s ease;
}

.wrong-card__answer-toggle-chevron[data-open='true'] {
  transform: rotate(-180deg);
}

.wrong-answer-enter-active,
.wrong-answer-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.wrong-answer-enter-from,
.wrong-answer-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.wrong-card__answer {
  margin: 0 0 14px;
  padding: 12px 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}

.wrong-card__answer-label {
  display: block;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #94a3b8;
  margin-bottom: 6px;
}

.wrong-card__answer-text {
  margin: 0;
  font-size: 0.9375rem;
  color: #334155;
  line-height: 1.5;
}

.wrong-card__answer-text--long {
  white-space: pre-wrap;
}

.wrong-card__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
}

.wrong-card__stats {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.wrong-card__meta {
  font-size: 0.8125rem;
  color: #64748b;
}

.wrong-card__actions {
  display: flex;
  flex-wrap: wrap;
  flex-shrink: 0;
  justify-content: flex-end;
  gap: 10px;
  margin-left: auto;
}

.wrong-card__btn {
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.wrong-card__btn--ghost {
  background: #fff;
  border-color: #e2e8f0;
  color: #64748b;
}

.wrong-card__btn--ghost:hover {
  background: #fef2f2;
  border-color: #fecaca;
  color: #b91c1c;
}

.wrong-card__btn--primary {
  background: #14532d;
  color: #fff;
}

.wrong-card__btn--primary:hover {
  background: #166534;
}

.wrong-page__empty {
  margin-top: 8px;
  padding: 40px 20px;
  text-align: center;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
}

.wrong-page__empty-title {
  margin: 0 0 6px;
  font-weight: 600;
  color: #334155;
}

.wrong-page__empty-hint {
  margin: 0;
  font-size: 0.875rem;
  color: #94a3b8;
}
</style>
