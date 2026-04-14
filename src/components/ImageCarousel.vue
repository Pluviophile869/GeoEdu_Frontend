<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  images: string[]
}>()

const idx = ref(0)

watch(
  () => props.images,
  () => {
    idx.value = 0
  },
  { deep: true },
)

const hasImages = computed(() => (props.images?.length ?? 0) > 0)
const current = computed(() => (hasImages.value ? props.images[idx.value] : ''))

function prev() {
  if (!hasImages.value) return
  idx.value = (idx.value - 1 + props.images.length) % props.images.length
}

function next() {
  if (!hasImages.value) return
  idx.value = (idx.value + 1) % props.images.length
}
</script>

<template>
  <section class="carousel">
    <header class="carousel__header">
      <div class="carousel__title">配图</div>
      <div class="carousel__controls" v-if="hasImages">
        <button class="btn" type="button" @click="prev">上一张</button>
        <div class="carousel__count">{{ idx + 1 }} / {{ images.length }}</div>
        <button class="btn" type="button" @click="next">下一张</button>
      </div>
    </header>

    <div class="carousel__body" v-if="hasImages">
      <img class="carousel__img" :src="current" alt="illustration" />
      <div class="carousel__dots">
        <button
          v-for="(_, i) in images"
          :key="i"
          class="dot"
          type="button"
          :aria-label="`查看第 ${i + 1} 张`"
          :data-active="i === idx"
          @click="idx = i"
        />
      </div>
    </div>

    <div class="carousel__empty" v-else>暂无配图</div>
  </section>
</template>

<style scoped>
.carousel {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.6);
}

.carousel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.carousel__title {
  font-weight: 600;
}

.carousel__controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.carousel__count {
  font-variant-numeric: tabular-nums;
  opacity: 0.8;
}

.carousel__body {
  display: grid;
  gap: 10px;
}

.carousel__img {
  width: 100%;
  height: auto;
  object-fit: contain;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.06);
}

.carousel__dots {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.28);
  background: transparent;
  cursor: pointer;
}

.dot[data-active='true'] {
  background: #7c3aed;
  border-color: #7c3aed;
}

.carousel__empty {
  opacity: 0.7;
  padding: 8px 0;
}

.btn {
  border: 1px solid rgba(0, 0, 0, 0.16);
  background: rgba(255, 255, 255, 0.8);
  border-radius: 10px;
  padding: 6px 10px;
  cursor: pointer;
}

.btn:hover {
  background: rgba(255, 255, 255, 1);
}
</style>

