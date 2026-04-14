<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import type { RelatedExamQuestion } from '../types'

const props = defineProps<{
  title?: string
  questions: RelatedExamQuestion[]
  modelValue?: string | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: string | null): void
}>()

const open = ref(true)
const inner = ref<string | null>(props.modelValue ?? null)

watchEffect(() => {
  inner.value = props.modelValue ?? null
})

const hasQuestions = computed(() => (props.questions?.length ?? 0) > 0)

function select(qid: string) {
  const next = inner.value === qid ? null : qid
  emit('update:modelValue', next)
}

const openSolveMap = ref<Record<string, boolean>>({})

function toggleSolve(id: string) {
  openSolveMap.value[id] = !openSolveMap.value[id]
}
</script>

<template>
  <section class="acc">
    <header class="acc__header" @click="open = !open" role="button" tabindex="0">
      <div class="acc__title">{{ title ?? '相关考题' }}</div>
      <div class="acc__right">
        <span class="acc__badge" v-if="hasQuestions">{{ questions.length }}</span>
        <span class="acc__chev" :data-open="open">▾</span>
      </div>
    </header>

    <div class="acc__body" v-if="open">
      <div class="acc__empty" v-if="!hasQuestions">暂无相关考题</div>
      <div class="acc__list" v-else>
        <article
          v-for="q in questions"
          :key="q.id"
          class="acc__item"
        >
          <div class="acc__stem">{{ q.stem }}</div>
          <ul class="acc__opts">
            <li v-for="opt in q.options" :key="`${q.id}-${opt.label}`">
              {{ opt.label }} . {{ opt.text }}
            </li>
          </ul>
          <div class="acc__actions">
            <button class="acc__btn" type="button" @click.stop="toggleSolve(q.id)">查看解答</button>
            <button
              class="acc__btn"
              type="button"
              :data-active="q.id === inner"
              @click.stop="select(q.id)"
            >
              {{ q.id === inner ? '已选中' : '选中题目' }}
            </button>
          </div>
          <div class="acc__solve" v-if="openSolveMap[q.id]">
            <div><strong>答案：</strong>{{ q.answer }}</div>
            <div><strong>解答：</strong>{{ q.explanation }}</div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.acc {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.6);
}

.acc__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  cursor: pointer;
  user-select: none;
}

.acc__title {
  font-weight: 700;
}

.acc__right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.acc__badge {
  font-variant-numeric: tabular-nums;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.14);
  background: rgba(255, 255, 255, 0.8);
}

.acc__chev {
  transition: transform 0.2s;
}
.acc__chev[data-open='false'] {
  transform: rotate(-90deg);
}

.acc__body {
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  padding: 12px 14px 14px;
}

.acc__list {
  display: grid;
  gap: 8px;
}

.acc__item {
  border: 1px solid rgba(0, 0, 0, 0.14);
  background: rgba(255, 255, 255, 0.8);
  border-radius: 10px;
  padding: 10px 12px;
  display: grid;
  gap: 8px;
}

.acc__stem {
  font-weight: 650;
}

.acc__opts {
  margin: 0;
  padding-left: 0;
  list-style: none;
  display: grid;
  gap: 4px;
}

.acc__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.acc__btn {
  border: 1px solid rgba(0, 0, 0, 0.16);
  background: rgba(255, 255, 255, 0.9);
  border-radius: 10px;
  padding: 6px 10px;
  cursor: pointer;
}

.acc__btn[data-active='true'] {
  border-color: #14532d;
  color: #14532d;
}

.acc__solve {
  border-top: 1px dashed rgba(0, 0, 0, 0.14);
  padding-top: 8px;
  color: rgba(15, 23, 42, 0.92);
  line-height: 1.6;
}

.acc__empty {
  opacity: 0.75;
}
</style>

