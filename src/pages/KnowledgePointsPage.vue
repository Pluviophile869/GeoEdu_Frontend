<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getUserInfoFromStorage, normalizeUserRole } from '../utils/auth'

type MediaType = 'image' | 'video' | 'videoLink'

type MediaItem = {
  type: MediaType
  url: string
  title?: string
}

type KnowledgeItem = {
  id: string
  title: string
  summary: string
  tags: string[]
  chapter: string
  content: string
  media: MediaItem[]
}

const STORAGE_KEY = 'geoedu.knowledge.items.v1'
const route = useRoute()
const router = useRouter()
const keyword = ref('')
const selectedChapter = ref('')

const chapters = [
  { value: '', label: '全部章节' },
  { value: '自然地理', label: '自然地理' },
  { value: '人文地理', label: '人文地理' },
  { value: '区域地理', label: '区域地理' },
]

const defaultItems: KnowledgeItem[] = [
  {
    id: 'kp-1',
    title: '地球运动与昼夜更替',
    summary: '自转方向、周期、晨昏线与地方时的基本关系。',
    tags: ['自然地理', '地球运动'],
    chapter: '自然地理',
    content:
      '地球自西向东自转，周期约 24 小时。晨昏线将地球分为昼半球和夜半球，随着地球自转不断移动。地方时随着经度变化而不同，经度每相差 15°，地方时相差 1 小时。',
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4', title: '地球示意图' },
    ],
  },
  {
    id: 'kp-2',
    title: '大气环流与气候类型',
    summary: '气压带风带分布及对降水、气温的影响。',
    tags: ['气候', '大气'],
    chapter: '自然地理',
    content:
      '全球三圈环流决定了主要风带和气压带分布，不同纬度的热量收支差异导致大气运动。季风系统叠加海陆热力差异，塑造东亚和南亚典型气候格局。',
    media: [
      { type: 'videoLink', url: 'https://www.bilibili.com/video/BV1GJ411x7h7/', title: '大气环流讲解视频' },
    ],
  },
  {
    id: 'kp-3',
    title: '洋流对沿岸气候的影响',
    summary: '暖流增温增湿、寒流降温减湿及典型区域案例。',
    tags: ['洋流', '气候'],
    chapter: '自然地理',
    content:
      '暖流会增强沿岸空气湿度和气温，寒流通常使沿岸降温减湿，并可能形成雾。结合世界洋流分布图，可分析欧洲西岸温和湿润与部分西岸荒漠并存的原因。',
    media: [
      { type: 'video', url: 'https://www.w3schools.com/html/mov_bbb.mp4', title: '洋流动态演示' },
    ],
  },
  {
    id: 'kp-4',
    title: '人口迁移的主要动力',
    summary: '经济因素、政策与环境对人口流动的作用。',
    tags: ['人文地理', '人口'],
    chapter: '人文地理',
    content:
      '人口迁移受推力与拉力共同作用。就业机会、教育医疗、收入预期等经济社会因素通常是核心驱动；自然灾害与环境变化也会引发被动迁移。',
    media: [],
  },
]

const items = ref<KnowledgeItem[]>([])
const detailItem = ref<KnowledgeItem | null>(null)
const showDetailModal = ref(false)

const showEditModal = ref(false)
const editingId = ref<string | null>(null)
const imageInputRef = ref<HTMLInputElement | null>(null)
const imageCaptureRef = ref<HTMLInputElement | null>(null)
const videoInputRef = ref<HTMLInputElement | null>(null)
const videoCaptureRef = ref<HTMLInputElement | null>(null)
const form = ref({
  title: '',
  summary: '',
  chapter: '自然地理',
  tagsText: '',
  content: '',
  imageUrl: '',
  videoUrl: '',
  videoLink: '',
})

const MAX_IMAGE_SIZE = 4 * 1024 * 1024
const MAX_VIDEO_SIZE = 12 * 1024 * 1024

const isTeacher = computed(() => {
  const user = getUserInfoFromStorage()
  return normalizeUserRole(user?.role) === 'teacher'
})

function persistItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.value))
}

function loadItems() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    items.value = defaultItems
    persistItems()
    return
  }
  try {
    items.value = JSON.parse(stored) as KnowledgeItem[]
  } catch {
    items.value = defaultItems
    persistItems()
  }
}

onMounted(() => {
  loadItems()
  const focusId = String(route.query.focus ?? '')
  if (focusId) {
    const target = items.value.find((it) => it.id === focusId)
    if (target) {
      detailItem.value = target
      showDetailModal.value = true
    }
  }
})

const filtered = computed(() => {
  let result = items.value
  if (selectedChapter.value) {
    result = result.filter((x) => x.chapter === selectedChapter.value)
  }

  const k = keyword.value.trim()
  if (k) {
    result = result.filter(
      (x) => x.title.includes(k) || x.summary.includes(k) || x.content.includes(k) || x.tags.some((t) => t.includes(k)),
    )
  }
  return result
})

function handleViewDetail(item: KnowledgeItem) {
  detailItem.value = item
  showDetailModal.value = true
}

function handleViewExercises(item: KnowledgeItem) {
  router.push({
    path: '/question-bank',
    query: {
      from: 'knowledge',
      knowledgeId: item.id,
      knowledgeTitle: item.title,
      chapter: item.chapter,
      keyword: item.tags[0] || item.title,
    },
  })
}

function closeDetailModal() {
  showDetailModal.value = false
  detailItem.value = null
}

function openAddModal() {
  editingId.value = null
  form.value = {
    title: '',
    summary: '',
    chapter: '自然地理',
    tagsText: '',
    content: '',
    imageUrl: '',
    videoUrl: '',
    videoLink: '',
  }
  showEditModal.value = true
}

function openEditModal(item: KnowledgeItem) {
  editingId.value = item.id
  form.value = {
    title: item.title,
    summary: item.summary,
    chapter: item.chapter,
    tagsText: item.tags.join(', '),
    content: item.content,
    imageUrl: item.media.find((m) => m.type === 'image')?.url ?? '',
    videoUrl: item.media.find((m) => m.type === 'video')?.url ?? '',
    videoLink: item.media.find((m) => m.type === 'videoLink')?.url ?? '',
  }
  showEditModal.value = true
}

function deleteKnowledgeItem(id: string) {
  if (!confirm('确定要删除这个知识点吗？')) return
  items.value = items.value.filter((x) => x.id !== id)
  persistItems()
  if (detailItem.value?.id === id) {
    closeDetailModal()
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsDataURL(file)
  })
}

async function handleMediaFileChange(event: Event, target: 'image' | 'video') {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  const file = input.files[0]
  const isImage = target === 'image'
  if (isImage && !file.type.startsWith('image/')) {
    alert('请选择图片文件')
    input.value = ''
    return
  }
  if (!isImage && !file.type.startsWith('video/')) {
    alert('请选择视频文件')
    input.value = ''
    return
  }

  if (isImage && file.size > MAX_IMAGE_SIZE) {
    alert('图片过大，请选择 4MB 以内文件')
    input.value = ''
    return
  }
  if (!isImage && file.size > MAX_VIDEO_SIZE) {
    alert('视频过大，请选择 12MB 以内文件')
    input.value = ''
    return
  }

  try {
    const dataUrl = await fileToDataUrl(file)
    if (isImage) {
      form.value.imageUrl = dataUrl
    } else {
      form.value.videoUrl = dataUrl
    }
  } catch {
    alert('文件读取失败，请重试')
  } finally {
    input.value = ''
  }
}

function clearMedia(target: 'image' | 'video') {
  if (target === 'image') form.value.imageUrl = ''
  else form.value.videoUrl = ''
}

function saveKnowledgeItem() {
  const title = form.value.title.trim()
  const summary = form.value.summary.trim()
  const content = form.value.content.trim()
  if (!title || !summary || !content) {
    alert('请填写标题、简介和详情内容')
    return
  }

  const tags = form.value.tagsText
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)

  const media: MediaItem[] = []
  if (form.value.imageUrl.trim()) media.push({ type: 'image', url: form.value.imageUrl.trim(), title: '图片资料' })
  if (form.value.videoUrl.trim()) media.push({ type: 'video', url: form.value.videoUrl.trim(), title: '视频资料' })
  if (form.value.videoLink.trim()) {
    media.push({ type: 'videoLink', url: form.value.videoLink.trim(), title: '视频链接' })
  }

  const payload: KnowledgeItem = {
    id: editingId.value ?? `kp-${Date.now()}`,
    title,
    summary,
    chapter: form.value.chapter,
    tags,
    content,
    media,
  }

  if (editingId.value) {
    const idx = items.value.findIndex((x) => x.id === editingId.value)
    if (idx !== -1) items.value[idx] = payload
  } else {
    items.value.unshift(payload)
  }
  persistItems()
  showEditModal.value = false
}
</script>

<template>
  <div class="kp-page">
    <div class="kp-header">
      <h1 class="kp-title">知识点</h1>
      <button v-if="isTeacher" type="button" class="kp-add-btn" @click="openAddModal">添加知识点</button>
    </div>

    <section class="kp-filter" aria-label="知识点筛选">
      <div class="kp-filter-row">
        <div class="kp-filter-field">
          <label class="kp-filter__label" for="kp-search">关键词</label>
          <input
            id="kp-search"
            v-model="keyword"
            class="kp-search"
            type="search"
            placeholder="搜索知识点标题、标签…"
            aria-label="搜索知识点"
          />
        </div>
        <div class="kp-filter-field">
          <label class="kp-filter__label" for="kp-chapter">章节分类</label>
          <select
            id="kp-chapter"
            v-model="selectedChapter"
            class="kp-select"
            aria-label="选择章节"
          >
            <option
              v-for="ch in chapters"
              :key="ch.value"
              :value="ch.value"
            >
              {{ ch.label }}
            </option>
          </select>
        </div>
      </div>
    </section>

    <ul class="kp-list">
      <li v-for="item in filtered" :key="item.id" class="kp-card">
        <h2 class="kp-card__title">{{ item.title }}</h2>
        <p class="kp-card__summary">{{ item.summary }}</p>
        <div class="kp-card__tags">
          <span v-for="t in item.tags" :key="t" class="kp-tag">{{ t }}</span>
        </div>
        <div v-if="isTeacher" class="kp-card__actions kp-card__actions--teacher">
          <div class="kp-card__actions-left">
            <button
              class="kp-card__action-btn kp-card__exercise-btn"
              type="button"
              @click="handleViewExercises(item)"
              aria-label="相关习题"
            >
              相关习题
            </button>
            <button
              class="kp-card__action-btn kp-card__detail-btn"
              type="button"
              @click="handleViewDetail(item)"
              aria-label="查看详情"
            >
              查看详情
            </button>
          </div>
          <div class="kp-card__actions-right">
            <button
              class="kp-card__action-btn kp-card__edit-btn"
              type="button"
              @click="openEditModal(item)"
              aria-label="编辑知识点"
            >
              编辑
            </button>
            <button
              class="kp-card__action-btn kp-card__delete-btn"
              type="button"
              @click="deleteKnowledgeItem(item.id)"
              aria-label="删除知识点"
            >
              删除
            </button>
          </div>
        </div>
        <div v-else class="kp-card__actions">
          <button
            class="kp-card__action-btn kp-card__exercise-btn"
            type="button"
            @click="handleViewExercises(item)"
            aria-label="相关习题"
          >
            相关习题
          </button>
          <button
            class="kp-card__action-btn kp-card__detail-btn"
            type="button"
            @click="handleViewDetail(item)"
            aria-label="查看详情"
          >
            查看详情
          </button>
        </div>
      </li>
    </ul>

    <p v-if="filtered.length === 0" class="kp-empty">没有匹配的知识点，换个关键词或章节试试。</p>

    <Teleport to="body">
      <div v-if="showDetailModal && detailItem" class="kp-modal-overlay" @click.self="closeDetailModal">
        <div class="kp-modal">
          <div class="kp-modal__head">
            <h3>{{ detailItem.title }}</h3>
            <button type="button" class="kp-modal__close" @click="closeDetailModal">关闭</button>
          </div>
          <p class="kp-modal__chapter">章节：{{ detailItem.chapter }}</p>
          <p class="kp-modal__content">{{ detailItem.content }}</p>

          <div v-if="detailItem.media.some((m) => m.type === 'image')" class="kp-modal__media">
            <div class="kp-media-card">
              <p class="kp-media-card__title">图片资料</p>
              <img
                v-for="(img, idx) in detailItem.media.filter((m) => m.type === 'image')"
                :key="idx"
                :src="img.url"
                alt="知识点配图"
                class="kp-media-image"
              />
            </div>
          </div>

          <div class="kp-video-section">
            <p class="kp-media-card__title">视频讲解</p>
            <video
              v-if="detailItem.media.some((m) => m.type === 'video')"
              :src="detailItem.media.find((m) => m.type === 'video')?.url"
              controls
              class="kp-media-video"
            />
            <a
              v-else-if="detailItem.media.some((m) => m.type === 'videoLink')"
              :href="detailItem.media.find((m) => m.type === 'videoLink')?.url"
              target="_blank"
              rel="noopener noreferrer"
              class="kp-media-link"
            >
              打开视频链接
            </a>
            <p v-else class="kp-video-empty">暂无</p>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showEditModal" class="kp-modal-overlay" @click.self="showEditModal = false">
        <div class="kp-modal">
          <div class="kp-modal__head">
            <h3>{{ editingId ? '编辑知识点' : '新增知识点' }}</h3>
            <button type="button" class="kp-modal__close" @click="showEditModal = false">关闭</button>
          </div>

          <div class="kp-form">
            <label>标题 *</label>
            <input v-model="form.title" type="text" />
            <label>简介 *</label>
            <input v-model="form.summary" type="text" />
            <label>章节 *</label>
            <select v-model="form.chapter">
              <option v-for="c in chapters.filter((x) => x.value)" :key="c.value" :value="c.value">{{ c.label }}</option>
            </select>
            <label>标签（英文逗号分隔）</label>
            <input v-model="form.tagsText" type="text" placeholder="如：气候, 大气" />
            <label>详情内容 *</label>
            <textarea v-model="form.content" rows="4" />
            <label>图片 URL（可选）</label>
            <input v-model="form.imageUrl" type="url" />
            <div class="kp-upload-row">
              <button type="button" class="kp-card__action-btn" @click="imageInputRef?.click()">本地选择图片</button>
              <button type="button" class="kp-card__action-btn" @click="imageCaptureRef?.click()">拍照上传</button>
              <button v-if="form.imageUrl" type="button" class="kp-card__action-btn kp-card__edit-btn" @click="clearMedia('image')">清除图片</button>
            </div>
            <input ref="imageInputRef" class="kp-hidden-input" type="file" accept="image/*" @change="(e) => handleMediaFileChange(e, 'image')" />
            <input ref="imageCaptureRef" class="kp-hidden-input" type="file" accept="image/*" capture="environment" @change="(e) => handleMediaFileChange(e, 'image')" />
            <label>视频 URL（可选，mp4 等）</label>
            <input v-model="form.videoUrl" type="url" />
            <div class="kp-upload-row">
              <button type="button" class="kp-card__action-btn" @click="videoInputRef?.click()">本地选择视频</button>
              <button type="button" class="kp-card__action-btn" @click="videoCaptureRef?.click()">拍视频上传</button>
              <button v-if="form.videoUrl" type="button" class="kp-card__action-btn kp-card__edit-btn" @click="clearMedia('video')">清除视频</button>
            </div>
            <input ref="videoInputRef" class="kp-hidden-input" type="file" accept="video/*" @change="(e) => handleMediaFileChange(e, 'video')" />
            <input ref="videoCaptureRef" class="kp-hidden-input" type="file" accept="video/*" capture="environment" @change="(e) => handleMediaFileChange(e, 'video')" />
            <label>视频链接（可选，网页链接）</label>
            <input v-model="form.videoLink" type="url" />
            <div class="kp-form__actions">
              <button type="button" class="kp-card__action-btn" @click="showEditModal = false">取消</button>
              <button type="button" class="kp-card__action-btn kp-card__detail-btn" @click="saveKnowledgeItem">保存</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.kp-page {
  max-width: 880px;
  margin: 0 auto;
  padding: 24px 20px 40px;
}

.kp-header {
  margin-bottom: 24px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.kp-title {
  margin: 0 0 6px;
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.02em;
}

.kp-desc {
  margin: 0;
  color: #64748b;
  font-size: 0.875rem;
}

.kp-filter {
  margin-bottom: 20px;
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

.kp-filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-end;
}

.kp-filter-field {
  flex: 1;
  min-width: 180px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.kp-filter__label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #475569;
}

.kp-search,
.kp-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  color: #0f172a;
  font: inherit;
  cursor: pointer;
}

.kp-search:focus,
.kp-select:focus {
  outline: 2px solid #86efac;
  outline-offset: 1px;
}

.kp-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 12px;
}

.kp-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px 18px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  display: flex;
  flex-direction: column;
}

.kp-card__title {
  margin: 0 0 8px;
  font-size: 1.05rem;
  font-weight: 700;
  color: #14532d;
}

.kp-card__summary {
  margin: 0 0 12px;
  color: #334155;
  line-height: 1.6;
  font-size: 14px;
}

.kp-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 0;
}

.kp-tag {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
}

.kp-card__actions {
  margin-top: auto;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.kp-card__actions--teacher {
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.kp-card__actions-left,
.kp-card__actions-right {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.kp-card__action-btn {
  background-color: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 20px;
  padding: 6px 16px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  line-height: 1.4;
}

.kp-card__detail-btn {
  color: #2c6e2f;
}
.kp-card__detail-btn:hover,
.kp-card__detail-btn:focus {
  background-color: #f0fdf4;
  border-color: #86efac;
  color: #166534;
  outline: none;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.kp-card__exercise-btn {
  color: #1e40af;
}
.kp-card__exercise-btn:hover,
.kp-card__exercise-btn:focus {
  background-color: #eff6ff;
  border-color: #93c5fd;
  color: #1e3a8a;
  outline: none;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.kp-card__delete-btn {
  color: #b91c1c;
}

.kp-card__delete-btn:hover,
.kp-card__delete-btn:focus {
  background-color: #fef2f2;
  border-color: #fecaca;
  color: #b91c1c;
  outline: none;
}

.kp-empty {
  margin-top: 8px;
  padding: 40px 20px;
  text-align: center;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  color: #94a3b8;
}

.kp-add-btn {
  background-color: #14532d;
  color: white;
  border: none;
  border-radius: 10px;
  padding: 10px 18px;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
  transition: background 0.15s ease;
}

.kp-card__edit-btn {
  color: #7c3aed;
}

.kp-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: grid;
  place-items: center;
  z-index: 1000;
}

.kp-modal {
  width: min(760px, 92vw);
  max-height: 85vh;
  overflow-y: auto;
  background: #fff;
  border-radius: 12px;
  padding: 16px;
}

.kp-modal__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.kp-modal__head h3 {
  margin: 0;
}

.kp-modal__close {
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
}

.kp-modal__chapter {
  margin: 10px 0 8px;
  color: #64748b;
}

.kp-modal__content {
  white-space: pre-wrap;
  line-height: 1.7;
  color: #334155;
}

.kp-modal__media {
  margin-top: 12px;
  display: grid;
  gap: 10px;
}

.kp-media-card {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px;
}

.kp-media-card__title {
  margin: 0 0 8px;
  font-size: 0.85rem;
  color: #475569;
}

.kp-media-image,
.kp-media-video {
  width: 100%;
  border-radius: 8px;
}

.kp-media-link {
  color: #1d4ed8;
}

.kp-video-section {
  margin-top: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px;
}

.kp-video-empty {
  margin: 0;
  color: #94a3b8;
  font-size: 0.9rem;
}

.kp-form {
  margin-top: 12px;
  display: grid;
  gap: 8px;
}

.kp-form input,
.kp-form select,
.kp-form textarea {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 8px 10px;
  font: inherit;
}

.kp-form__actions {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.kp-upload-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: -2px;
  margin-bottom: 4px;
}

.kp-hidden-input {
  display: none;
}

/* 响应式：小屏幕时筛选条件垂直排列 */
@media (max-width: 560px) {
  .kp-filter-row {
    flex-direction: column;
    align-items: stretch;
  }
  .kp-filter-field {
    min-width: auto;
  }
}
</style>