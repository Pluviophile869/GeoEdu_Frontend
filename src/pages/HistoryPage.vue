<script setup lang="ts">
import { computed, ref } from 'vue'
import { useHistory } from '../composables/useHistory'
import type { HistoryItem } from '../types'

const { items, remove, clear } = useHistory()

type GroupMode = 'none' | 'knowledge' | 'chapter'

const groupMode = ref<GroupMode>('none')
const selectedSubGroup = ref('__all__')

function fmt(ts: number) {
  return new Date(ts).toLocaleString()
}

function sortTs(x: HistoryItem) {
  return x.updatedAt ?? x.createdAt
}

function inferChapter(question: string) {
  const q = question.toLowerCase()
  if (q.includes('地球') || q.includes('地图') || q.includes('季风') || q.includes('气候')) {
    return '第一章 地球与地图'
  }
  if (q.includes('长江') || q.includes('黄河') || q.includes('中国') || q.includes('胡焕庸')) {
    return '第二章 中国地理'
  }
  if (q.includes('欧洲') || q.includes('国家') || q.includes('世界') || q.includes('联盟')) {
    return '第三章 世界地理'
  }
  return '未分类章节'
}

function inferKnowledge(question: string) {
  const q = question.toLowerCase()
  if (q.includes('山') || q.includes('地形') || q.includes('峰')) return '地形地貌'
  if (q.includes('河') || q.includes('长江') || q.includes('水')) return '水文'
  if (q.includes('气候') || q.includes('季风') || q.includes('大气')) return '气候与大气'
  if (q.includes('人口') || q.includes('城市') || q.includes('人文')) return '人文地理'
  if (q.includes('国家') || q.includes('欧洲') || q.includes('世界')) return '世界政区'
  return '综合地理'
}

const groupedItems = computed(() => {
  if (groupMode.value === 'none') {
    return [{ label: '全部记录', rows: items.value }]
  }

  const map = new Map<string, HistoryItem[]>()
  for (const row of items.value) {
    const label =
      groupMode.value === 'chapter' ? inferChapter(row.question) : inferKnowledge(row.question)
    if (!map.has(label)) map.set(label, [])
    map.get(label)?.push(row)
  }

  return Array.from(map.entries()).map(([label, rows]) => ({
    label,
    rows: [...rows].sort((a, b) => sortTs(b) - sortTs(a)),
  }))
})

const subGroupOptions = computed(() => {
  if (groupMode.value === 'none') return []
  return groupedItems.value.map((g) => g.label)
})

const visibleGroups = computed(() => {
  if (groupMode.value === 'none' || selectedSubGroup.value === '__all__') {
    return groupedItems.value
  }
  return groupedItems.value.filter((g) => g.label === selectedSubGroup.value)
})
</script>

<template>
  <div class="page">
    <section class="card">
      <div class="card__top">
        <div>
          <div class="card__title">历史记录</div>
        </div>
        <div class="row">
          <button class="history-clear-btn" type="button" @click="clear" :disabled="items.length === 0">
            清空
          </button>
        </div>
      </div>

      <div class="group-mode" v-if="items.length">
        <span class="group-mode__label">分类方式</span>
        <div class="row">
          <button class="ghost" type="button" :data-active="groupMode === 'none'" @click="groupMode = 'none'">
            不分类
          </button>
          <button
            class="ghost"
            type="button"
            :data-active="groupMode === 'knowledge'"
            @click="groupMode = 'knowledge'"
          >
            按知识点
          </button>
          <button class="ghost" type="button" :data-active="groupMode === 'chapter'" @click="groupMode = 'chapter'">
            按章节
          </button>
        </div>

        <div class="group-submode" v-if="groupMode !== 'none'">
          <label class="group-submode__label" for="history-subgroup-select">
            {{ groupMode === 'knowledge' ? '知识点子分类' : '章节子分类' }}
          </label>
          <select id="history-subgroup-select" v-model="selectedSubGroup" class="group-submode__select">
            <option value="__all__">全部</option>
            <option v-for="name in subGroupOptions" :key="name" :value="name">{{ name }}</option>
          </select>
        </div>
      </div>

      <div class="group-list" v-if="items.length">
        <section class="group" v-for="g in visibleGroups" :key="g.label">
          <div class="group__title">{{ g.label }}</div>
          <div class="list">
            <div class="item" v-for="x in g.rows" :key="x.id">
              <div class="item__main">
                <div class="item__q">{{ x.question }}</div>
                <div class="item__meta">{{ fmt(x.createdAt) }}</div>
              </div>
              <div class="item__actions">
                <RouterLink class="ghost link-btn" :to="`/history/${x.id}`">查看</RouterLink>
                <button class="danger" type="button" @click="remove(x.id)">删除</button>
              </div>
            </div>
          </div>
        </section>
      </div>
      <div class="empty" v-else>暂无历史记录</div>
    </section>
  </div>
</template>

<style scoped>
.page {
  max-width: 900px;
  margin: 0 auto;
  padding: 8px 0 24px;
}

.card {
  border: none;
  border-radius: 12px;
  padding: 16px;
  background: #f8fafc;
}

.card__top {
  display: flex;
  gap: 12px 16px;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
}

.card__title {
  margin: 0 0 6px;
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.02em;
}

.card__top > div:first-child {
  min-width: 0;
}

.card__top .row {
  flex-shrink: 0;
}

.hint,
.group-mode__label,
.group-submode__label,
.item__meta {
  color: #64748b;
}

.hint {
  font-size: 0.875rem;
  margin-bottom: 6px;
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.list {
  display: grid;
  gap: 10px;
}

.group-mode {
  margin-top: 14px;
  display: grid;
  gap: 10px;
}

.group-mode__label {
  font-size: 0.8125rem;
  font-weight: 600;
}

.group-list {
  display: grid;
  gap: 14px;
  margin-top: 14px;
}

.group-submode {
  display: grid;
  gap: 8px;
  width: min(360px, 100%);
}

.group-submode__label {
  font-size: 0.8125rem;
  font-weight: 600;
}

.group-submode__select {
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 12px;
  background: #fff;
  color: #0f172a;
  font: inherit;
  cursor: pointer;
}

.group-submode__select:focus {
  outline: 2px solid #86efac;
  outline-offset: 1px;
}

.group {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;
  background: #fff;
}

.group__title {
  font-size: 0.875rem;
  font-weight: 700;
  margin-bottom: 10px;
  color: #14532d;
}

.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.item__q {
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
}

.item__meta {
  font-size: 0.75rem;
  margin-top: 4px;
}

.item__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.ghost,
.danger {
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  border: 1px solid #e2e8f0;
  font-weight: 600;
  background: #fff;
  color: #475569;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.link-btn {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
}

.danger {
  border-color: #fecaca;
  color: #b91c1c;
}

.danger:hover {
  background: #fef2f2;
  border-color: #fca5a5;
}

.ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ghost[data-active='true'] {
  border-color: #86efac;
  color: #14532d;
  background: #ecfdf5;
}

.empty {
  margin-top: 14px;
  padding: 28px 16px;
  text-align: center;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  color: #94a3b8;
  background: #fff;
}

.history-clear-btn {
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

.history-clear-btn:hover:enabled {
  background: #166534;
}

.history-clear-btn:active:enabled {
  transform: translateY(1px);
}

.history-clear-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

</style>

