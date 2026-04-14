<script setup lang="ts">
import { watch } from 'vue'

const props = defineProps<{
  open: boolean
  title: string
}>()

const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
}>()

function close() {
  emit('update:open', false)
}

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  },
)
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal" role="dialog" aria-modal="true">
      <div class="modal__backdrop" @click="close" />
      <section class="modal__panel">
        <header class="modal__header">
          <div class="modal__title">{{ title }}</div>
          <button class="modal__close" type="button" @click="close" aria-label="关闭">×</button>
        </header>
        <div class="modal__body">
          <slot />
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
}

.modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
}

.modal__panel {
  position: relative;
  width: min(860px, calc(100vw - 28px));
  max-height: min(80vh, 760px);
  display: grid;
  grid-template-rows: auto 1fr;
  border-radius: 14px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.16);
  overflow: hidden;
}

.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 12px 12px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.modal__title {
  font-weight: 700;
}

.modal__close {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.16);
  background: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  font-size: 22px;
  line-height: 1;
}

.modal__body {
  padding: 16px;
  overflow: auto;
  white-space: pre-wrap;
}
</style>

