<script setup lang="ts">
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

const props = defineProps<{
  markdown: string
}>()

// Keep a single instance to avoid re-parsing on every render.
const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: true,
})

const sanitizedHtml = computed(() => {
  const raw = md.render(props.markdown ?? '')
  return DOMPurify.sanitize(raw)
})
</script>

<template>
  <article class="md">
    <div class="md__content" v-html="sanitizedHtml" />
  </article>
</template>

<style scoped>
.md__content :first-child {
  margin-top: 0;
}

.md__content p {
  margin: 0 0 12px;
}

.md__content h1,
.md__content h2,
.md__content h3 {
  margin: 16px 0 10px;
}

.md__content ul,
.md__content ol {
  padding-left: 18px;
  margin: 0 0 12px;
}

.md__content pre {
  background: rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  padding: 12px;
  overflow: auto;
}

.md__content code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
}

.md__content a {
  color: #7c3aed;
  word-break: break-word;
}
</style>

