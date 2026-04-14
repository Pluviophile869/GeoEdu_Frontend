import { computed, ref } from 'vue'
import type { HistoryItem } from '../types'

const STORAGE_KEY = 'geoedu.history.v1'

function safeParseHistory(raw: string | null): HistoryItem[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Minimal validation to avoid runtime crashes.
    return parsed.filter(Boolean) as HistoryItem[]
  } catch {
    return []
  }
}

export function useHistory() {
  const items = ref<HistoryItem[]>(safeParseHistory(localStorage.getItem(STORAGE_KEY)))

  const sortedItems = computed(() => {
    const ts = (x: HistoryItem) => x.updatedAt ?? x.createdAt
    return [...items.value].sort((a, b) => ts(b) - ts(a))
  })

  function persist(next: HistoryItem[]) {
    items.value = next
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  function add(item: HistoryItem) {
    const next = [item, ...items.value]
    persist(next)
  }

  function upsert(item: HistoryItem) {
    const idx = items.value.findIndex((x) => x.id === item.id)
    if (idx === -1) {
      add(item)
      return
    }
    const next = [...items.value]
    next[idx] = item
    persist(next)
  }

  function remove(id: string) {
    persist(items.value.filter((x) => x.id !== id))
  }

  function clear() {
    persist([])
  }

  function findById(id: string | null | undefined) {
    if (!id) return null
    return items.value.find((x) => x.id === id) ?? null
  }

  return {
    items: sortedItems,
    add,
    upsert,
    remove,
    clear,
    findById,
  }
}

