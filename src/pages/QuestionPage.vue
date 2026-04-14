<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ocrImageApi } from '../api/ocr'
import { getUserInfoFromStorage, normalizeUserRole } from '../utils/auth'

declare const Tesseract: any

type Question = {
  id: string
  text: string
  type: string
  difficulty: string
  chapter: string
  options?: string[]
  answer: string
  explanation: string
  image?: string
}

const isTeacher = computed(() => {
  const user = getUserInfoFromStorage()
  return normalizeUserRole(user?.role) === 'teacher'
})
const route = useRoute()
const router = useRouter()
const fromKnowledge = ref(false)
const fromKnowledgeId = ref('')
const fromKnowledgeTitle = ref('')

const selectedType = ref('')
const selectedDifficulty = ref('')
const selectedChapter = ref('')
const keyword = ref('')

function applyKnowledgeSourceQuery() {
  fromKnowledge.value = route.query.from === 'knowledge'
  fromKnowledgeId.value = String(route.query.knowledgeId ?? '')
  fromKnowledgeTitle.value = String(route.query.knowledgeTitle ?? '')
  if (!fromKnowledge.value) return

  const chapter = String(route.query.chapter ?? '')
  const kw = String(route.query.keyword ?? '')
  if (chapter) selectedChapter.value = chapter
  if (kw) keyword.value = kw
}

watch(
  () => route.query,
  () => applyKnowledgeSourceQuery(),
  { immediate: true },
)

function backToKnowledgePoint() {
  router.push({
    path: '/knowledge',
    query: fromKnowledgeId.value ? { focus: fromKnowledgeId.value } : undefined,
  })
}

function goQuestionPractice() {
  router.push('/question-bank/practice')
}

const typeOptions = [
  { value: '', label: '全部题型' },
  { value: '单选', label: '单选题' },
  { value: '多选', label: '多选题' },
  { value: '判断', label: '判断题' },
  { value: '简答', label: '简答题' },
]

const difficultyOptions = [
  { value: '', label: '全部难度' },
  { value: '简单', label: '简单' },
  { value: '中等', label: '中等' },
  { value: '困难', label: '困难' },
]

const chapterOptions = [
  { value: '', label: '全部章节' },
  { value: '自然地理', label: '自然地理' },
  { value: '人文地理', label: '人文地理' },
]

const questions = ref<Question[]>([
  {
    id: '1',
    text: '地球自转的周期是？',
    type: '单选',
    difficulty: '简单',
    chapter: '自然地理',
    options: ['A. 12小时', 'B. 24小时', 'C. 一个月', 'D. 一年'],
    answer: 'B',
    explanation: '地球自转一周的时间约为24小时，即一天。',
  },
  {
    id: '2',
    text: '以下哪些属于大气环流的组成部分？（多选）',
    type: '多选',
    difficulty: '中等',
    chapter: '自然地理',
    options: ['A. 三圈环流', 'B. 季风环流', 'C. 海陆风', 'D. 焚风'],
    answer: 'ABC',
    explanation: '大气环流包括三圈环流、季风环流、海陆风等局部环流，焚风是下沉气流形成的干热风，不属于环流系统。',
  },
  {
    id: '3',
    text: '洋流对沿岸气候的影响是：暖流降温减湿，寒流增温增湿。',
    type: '判断',
    difficulty: '简单',
    chapter: '自然地理',
    options: ['对', '错'],
    answer: '错',
    explanation: '暖流增温增湿，寒流降温减湿。',
  },
  {
    id: '4',
    text: '简述人口迁移对迁入地的积极影响。',
    type: '简答',
    difficulty: '中等',
    chapter: '人文地理',
    answer: '提供廉价劳动力、促进经济发展、增加文化多样性等。',
    explanation: '人口迁入为城市提供劳动力，推动产业和消费，但也可能带来资源紧张。',
  },
])

const expandedId = ref<string | null>(null)

const toggleExplanation = (id: string) => {
  expandedId.value = expandedId.value === id ? null : id
}

const filteredQuestions = computed(() => {
  let result = questions.value
  if (selectedType.value) result = result.filter((q) => q.type === selectedType.value)
  if (selectedDifficulty.value) result = result.filter((q) => q.difficulty === selectedDifficulty.value)
  if (selectedChapter.value) result = result.filter((q) => q.chapter === selectedChapter.value)
  const kw = keyword.value.trim()
  if (kw) {
    result = result.filter((q) => q.text.includes(kw) || q.answer.includes(kw) || q.explanation.includes(kw))
  }
  return result
})

const difficultyClass = (difficulty: string) => {
  switch (difficulty) {
    case '简单': return 'difficulty-easy'
    case '中等': return 'difficulty-medium'
    case '困难': return 'difficulty-hard'
    default: return ''
  }
}

const questionKindClass = (type: string) => {
  switch (type) {
    case '单选':
      return 'qkind--single'
    case '多选':
      return 'qkind--multiple'
    case '判断':
      return 'qkind--fill'
    case '简答':
      return 'qkind--short'
    default:
      return ''
  }
}

const questionTags = (q: Question): string[] => {
  if (q.chapter === '自然地理') return ['自然地理', '基础概念']
  if (q.chapter === '人文地理') return ['人文地理', '社会现象']
  return ['区域地理', '综合应用']
}

const showModal = ref(false)
const editingId = ref<string | null>(null)

const formData = ref<Partial<Question>>({
  text: '',
  type: '单选',
  difficulty: '简单',
  chapter: '自然地理',
  options: [],
  answer: '',
  explanation: '',
  image: '',
})

const optionsStr = ref('')
const ocrLoading = ref(false)
const ocrProgress = ref(0)
const ocrPreviewText = ref('')
const ocrEngine = ref<'backend' | 'local' | ''>('')
const imagePreview = ref<string>('')

const loadTesseract = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if ((window as any).Tesseract) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Tesseract.js 加载失败'))
    document.head.appendChild(script)
  })
}

const recognizeImageLocal = async (file: File) => {
  try {
    await loadTesseract()

    const worker = await Tesseract.createWorker({
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          ocrProgress.value = Math.floor(m.progress * 100)
        }
      },
    })
    await worker.loadLanguage('chi_sim+eng')
    await worker.initialize('chi_sim+eng')
    const { data: { text } } = await worker.recognize(file)
    await worker.terminate()

    ocrLoading.value = false
    return text.trim()
  } catch (error) {
    console.error('OCR 识别失败:', error)
    return ''
  }
}

const recognizeImage = async (file: File) => {
  ocrLoading.value = true
  ocrProgress.value = 0
  ocrEngine.value = ''

  try {
    // 先走后端 OCR（你后端接通后会优先生效）
    ocrProgress.value = 20
    const res = await ocrImageApi(file)
    const text = (res?.text || '').trim()
    if (text) {
      ocrProgress.value = 100
      ocrEngine.value = 'backend'
      return text
    }
    // 后端返回空时兜底本地识别
    const fallbackText = await recognizeImageLocal(file)
    ocrEngine.value = 'local'
    return fallbackText
  } catch (error) {
    // 后端不可用时自动回退本地 OCR
    const fallbackText = await recognizeImageLocal(file)
    ocrEngine.value = 'local'
    if (!fallbackText) {
      console.error('OCR 识别失败:', error)
      alert('识别失败，请检查网络或稍后重试')
    }
    return fallbackText
  } finally {
    ocrLoading.value = false
  }
}

const processOcrFile = async (file: File) => {
  if (!file.type.startsWith('image/')) {
    alert('请上传图片文件')
    return
  }
  const recognizedText = await recognizeImage(file)
  if (recognizedText) {
    ocrPreviewText.value = recognizedText
  }
}

const handleImageUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return
  const file = input.files[0]
  await processOcrFile(file)
  input.value = ''
}

function applyRecognizedText(mode: 'replace' | 'append') {
  if (!ocrPreviewText.value.trim()) return
  if (mode === 'replace') {
    formData.value.text = ocrPreviewText.value.trim()
  } else if (formData.value.text?.trim()) {
    formData.value.text = `${formData.value.text.trim()}\n${ocrPreviewText.value.trim()}`
  } else {
    formData.value.text = ocrPreviewText.value.trim()
  }
}

function clearRecognizedText() {
  ocrPreviewText.value = ''
}

const handleQuestionImageUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return
  const file = input.files[0]
  if (!file.type.startsWith('image/')) {
    alert('请上传图片文件')
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => {
    const base64 = e.target?.result as string
    formData.value.image = base64
    imagePreview.value = base64
  }
  reader.readAsDataURL(file)
  input.value = ''
}

const clearQuestionImage = () => {
  formData.value.image = ''
  imagePreview.value = ''
}

watch(() => formData.value.type, (newType) => {
  if (newType === '判断') {
    optionsStr.value = '对, 错'
  } else if (newType === '单选' || newType === '多选') {
    if (optionsStr.value === '对, 错') optionsStr.value = ''
  }
})

const openAddModal = () => {
  editingId.value = null
  formData.value = {
    text: '',
    type: '单选',
    difficulty: '简单',
    chapter: '自然地理',
    options: [],
    answer: '',
    explanation: '',
    image: '',
  }
  optionsStr.value = ''
  ocrPreviewText.value = ''
  imagePreview.value = ''
  showModal.value = true
}

const openEditModal = (q: Question) => {
  editingId.value = q.id
  formData.value = { ...q }
  optionsStr.value = q.options ? q.options.join(', ') : ''
  ocrPreviewText.value = ''
  imagePreview.value = q.image || ''
  showModal.value = true
}

const saveQuestion = () => {
  if (!formData.value.text || !formData.value.type || !formData.value.difficulty || !formData.value.chapter || !formData.value.answer || !formData.value.explanation) {
    alert('请填写完整信息')
    return
  }
  let options: string[] | undefined = undefined
  if (formData.value.type === '单选' || formData.value.type === '多选') {
    options = optionsStr.value.split(',').map(s => s.trim()).filter(s => s)
    if (options.length === 0) {
      alert('选择题至少需要一个选项')
      return
    }
  } else if (formData.value.type === '判断') {
    options = ['对', '错']
  }
  const newQuestion: Question = {
    id: editingId.value || Date.now().toString(),
    text: formData.value.text!,
    type: formData.value.type!,
    difficulty: formData.value.difficulty!,
    chapter: formData.value.chapter!,
    options,
    answer: formData.value.answer!,
    explanation: formData.value.explanation!,
    image: formData.value.image || '',
  }
  if (editingId.value) {
    const index = questions.value.findIndex(q => q.id === editingId.value)
    if (index !== -1) questions.value[index] = newQuestion
  } else {
    questions.value.push(newQuestion)
  }
  showModal.value = false
}

const deleteQuestion = (id: string) => {
  if (confirm('确定要删除这道题目吗？')) {
    questions.value = questions.value.filter(q => q.id !== id)
    if (expandedId.value === id) expandedId.value = null
  }
}
</script>

<template>
  <div class="qb-page">
    <header class="qb-header">
      <div>
        <h1 class="qb-title"> 题库</h1>
      </div>
      <div class="qb-header__actions">
        <button v-if="isTeacher" class="qb-add-btn" @click="openAddModal"><span class="icon">＋</span> 添加题目</button>
        <button type="button" class="qb-practice-btn" @click="goQuestionPractice">去做题</button>
        <button v-if="fromKnowledge" type="button" class="qb-back-kp-btn" @click="backToKnowledgePoint">
          回到相关知识点{{ fromKnowledgeTitle ? `：${fromKnowledgeTitle}` : '' }}
        </button>
      </div>
    </header>

    <section class="qb-filter" aria-label="题目筛选">
      <div class="qb-filter-row">
        <div class="qb-filter-field">
          <label class="qb-filter__label"> 关键词</label>
          <input id="qb-search" v-model="keyword" class="qb-search" type="search" placeholder="搜索题干、答案或解析…" />
        </div>
        <div class="qb-filter-field">
          <label class="qb-filter__label">题型</label>
          <select id="qb-type" v-model="selectedType" class="qb-select">
            <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="qb-filter-field">
          <label class="qb-filter__label"> 难度</label>
          <select id="qb-difficulty" v-model="selectedDifficulty" class="qb-select">
            <option v-for="opt in difficultyOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="qb-filter-field">
          <label class="qb-filter__label"> 章节</label>
          <select id="qb-chapter" v-model="selectedChapter" class="qb-select">
            <option v-for="ch in chapterOptions" :key="ch.value" :value="ch.value">{{ ch.label }}</option>
          </select>
        </div>
      </div>
    </section>

    <ul class="qb-list">
      <li v-for="q in filteredQuestions" :key="q.id" class="qb-card">
        <div v-if="q.image" class="qb-card__image">
          <img :src="q.image" alt="题目配图" />
        </div>

        <div class="qb-card__top">
          <span class="qb-card__difficulty" :class="difficultyClass(q.difficulty)">{{ q.difficulty }}</span>
          <span class="qb-card__qkind" :class="questionKindClass(q.type)">{{ q.type }}题</span>
          <div class="qb-card__tags">
            <span v-for="tag in questionTags(q)" :key="tag" class="qb-card__tag">{{ tag }}</span>
          </div>
          <span class="qb-card__chapter">{{ q.chapter }}</span>
        </div>

        <div class="qb-card__stem">
          <h2 class="qb-card__title">{{ q.text }}</h2>
        </div>

        <div v-if="q.options && q.options.length" class="qb-card__options">
          <div v-for="opt in q.options" :key="opt" class="qb-option">{{ opt }}</div>
        </div>

        <div class="qb-card__actions-row">
          <button class="qb-answer-btn" @click="toggleExplanation(q.id)">
            <span class="icon">◷</span> {{ expandedId === q.id ? '隐藏解析' : '查看解析' }}
          </button>
          <div v-if="isTeacher" class="qb-teacher-actions">
            <button class="qb-edit-btn" @click="openEditModal(q)"> 编辑</button>
            <button class="qb-delete-btn" @click="deleteQuestion(q.id)"> 删除</button>
          </div>
        </div>

        <div v-if="expandedId === q.id" class="qb-card__explanation">
          <div class="qb-answer"><strong>答案：</strong>{{ q.answer }}</div>
          <div class="qb-explanation"><strong>解析：</strong>{{ q.explanation }}</div>
        </div>
      </li>
    </ul>

    <p v-if="filteredQuestions.length === 0" class="qb-empty">
      <span class="icon">◌</span> 没有找到匹配的题目，请调整筛选条件。
    </p>

    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
        <div class="modal-container">
          <h3>{{ editingId ? '编辑题目' : '添加题目' }}</h3>
          <form @submit.prevent="saveQuestion">
            <!-- 图片识别题干：仅在添加模式下显示 -->
            <div v-if="!editingId" class="form-group ocr-group">
              <label>图片识别题干</label>
              <div class="ocr-upload">
                <label class="ocr-label" :class="{ 'ocr-loading': ocrLoading }">
                  <input type="file" accept="image/*" @change="handleImageUpload" :disabled="ocrLoading" />
                  <span v-if="!ocrLoading">本地上传识别</span>
                  <span v-else>识别中 {{ ocrProgress }}%</span>
                </label>
                <label class="ocr-label" :class="{ 'ocr-loading': ocrLoading }">
                  <input type="file" accept="image/*" capture="environment" @change="handleImageUpload" :disabled="ocrLoading" />
                  <span v-if="!ocrLoading">拍照识别</span>
                  <span v-else>识别中 {{ ocrProgress }}%</span>
                </label>
                <p class="ocr-hint">支持中英文混合识别，结果将填入题干框（可手动修改）</p>
                <div v-if="ocrPreviewText" class="ocr-result">
                  <p class="ocr-result__title">识别结果预览</p>
                  <p class="ocr-result__engine">
                    识别来源：{{ ocrEngine === 'backend' ? '后端 OCR 接口' : '本地 OCR（回退）' }}
                  </p>
                  <pre class="ocr-result__text">{{ ocrPreviewText }}</pre>
                  <div class="ocr-result__actions">
                    <button type="button" class="qb-edit-btn" @click="applyRecognizedText('replace')">替换题干</button>
                    <button type="button" class="qb-answer-btn" @click="applyRecognizedText('append')">追加到题干</button>
                    <button type="button" class="qb-delete-btn" @click="clearRecognizedText">清空结果</button>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>题目配图（可选）</label>
              <div class="image-upload">
                <div v-if="imagePreview" class="image-preview">
                  <img :src="imagePreview" alt="题目配图预览" />
                  <button type="button" class="clear-image-btn" @click="clearQuestionImage">✖ 清除</button>
                </div>
                <label v-else class="upload-label">
                  <input type="file" accept="image/*" @change="handleQuestionImageUpload" />
                  <span class="icon"></span> 上传图片
                </label>
              </div>
            </div>

            <div class="form-group">
              <label>题干 *</label>
              <textarea v-model="formData.text" rows="2" required></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>题型 *</label>
                <select v-model="formData.type">
                  <option value="单选">单选题</option>
                  <option value="多选">多选题</option>
                  <option value="判断">判断题</option>
                  <option value="简答">简答题</option>
                </select>
              </div>
              <div class="form-group">
                <label>难度 *</label>
                <select v-model="formData.difficulty">
                  <option value="简单">简单</option>
                  <option value="中等">中等</option>
                  <option value="困难">困难</option>
                </select>
              </div>
              <div class="form-group">
                <label>章节 *</label>
                <select v-model="formData.chapter">
                  <option value="自然地理">自然地理</option>
                  <option value="人文地理">人文地理</option>
                </select>
              </div>
            </div>
            <div v-if="formData.type === '单选' || formData.type === '多选'" class="form-group">
              <label>选项（用英文逗号分隔）*</label>
              <input v-model="optionsStr" type="text" placeholder="例如：A. 北京, B. 上海, C. 广州" />
            </div>
            <div v-else-if="formData.type === '判断'" class="form-group">
              <label>选项（判断题固定为“对, 错”）</label>
              <input type="text" value="对, 错" disabled class="disabled-input" />
            </div>
            <div class="form-group">
              <label>答案 *</label>
              <input v-model="formData.answer" type="text" placeholder="例如：B 或 错 或 简述内容" />
            </div>
            <div class="form-group">
              <label>解析 *</label>
              <textarea v-model="formData.explanation" rows="3" required></textarea>
            </div>
            <div class="modal-buttons">
              <button type="button" class="cancel-btn" @click="showModal = false">取消</button>
              <button type="submit" class="save-btn">保存</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* 原有样式保持不变，新增图片相关样式 */
.qb-page {
  max-width: 880px;
  margin: 0 auto;
  padding: 24px 20px 40px;
}
.qb-header {
  margin-bottom: 24px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.qb-header__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}
.qb-title {
  margin: 0 0 6px;
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.02em;
}
.qb-desc {
  margin: 0;
  color: #64748b;
  font-size: 0.875rem;
}

.qb-back-kp-btn {
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #1e40af;
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 0.82rem;
  cursor: pointer;
}

.qb-back-kp-btn:hover {
  background: #dbeafe;
}

.qb-practice-btn {
  border: none;
  border-radius: 10px;
  background: #14532d;
  color: #fff;
  font-weight: 600;
  font-size: 0.9375rem;
  padding: 10px 18px;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}

.qb-practice-btn:hover {
  background: #166534;
}
.qb-filter {
  margin-bottom: 20px;
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}
.qb-filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-end;
}
.qb-filter-field {
  flex: 1;
  min-width: 150px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.qb-filter__label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #475569;
}
.qb-search,
.qb-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  color: #0f172a;
  font: inherit;
  cursor: pointer;
}
.qb-search:focus,
.qb-select:focus {
  outline: 2px solid #86efac;
  outline-offset: 1px;
}
.qb-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 16px;
}
.qb-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 18px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition: box-shadow 0.2s, border-color 0.2s;
}
.qb-card:hover {
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
  border-color: #cbd5e1;
}
/* 卡片配图样式 */
.qb-card__image {
  margin-bottom: 12px;
  text-align: center;
}
.qb-card__image img {
  max-width: 100%;
  max-height: 200px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}
.qb-card__top {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 8px 12px;
  margin-bottom: 12px;
  position: relative;
  padding-right: 120px;
}
.qb-card__stem {
  margin-bottom: 8px;
}
.qb-card__title {
  margin: 0 0 10px;
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.55;
}
.qb-card__difficulty {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
}
.difficulty-easy {
  background: #ecfdf5;
  color: #166534;
}
.difficulty-medium {
  background: #fffbeb;
  color: #a16207;
}
.difficulty-hard {
  background: #fef2f2;
  color: #b91c1c;
}

.qb-card__qkind {
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

.qb-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
  min-width: 120px;
  align-items: center;
}

.qb-card__tag {
  font-size: 0.75rem;
  padding: 4px 10px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #334155;
  border: 1px solid #e2e8f0;
}

.qb-card__chapter {
  position: absolute;
  right: 0;
  top: 0;
  font-size: 0.75rem;
  font-weight: 400;
  color: #94a3b8;
  text-align: right;
  white-space: nowrap;
}
.qb-card__options {
  margin: 10px 0 8px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.qb-option {
  font-size: 0.875rem;
  color: #334155;
  line-height: 1.45;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #fafafa;
}
.qb-card__actions-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
  flex-wrap: wrap;
  gap: 12px;
}
.qb-answer-btn {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #2c6e2f;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 8px;
  transition: all 0.2s;
  font-family: inherit;
}
.qb-answer-btn:hover {
  border-color: #86efac;
  background-color: #f0fdf4;
  color: #166534;
}
.qb-teacher-actions {
  display: flex;
  gap: 12px;
}
.qb-edit-btn {
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  background: #14532d;
  color: #fff;
  transition: background 0.15s ease;
}
.qb-edit-btn:hover {
  background: #166534;
}
.qb-delete-btn {
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e2e8f0;
  color: #64748b;
  transition: all 0.15s ease;
}
.qb-delete-btn:hover {
  background: #fef2f2;
  border-color: #fecaca;
  color: #b91c1c;
}
.qb-card__explanation {
  margin-top: 12px;
  padding: 12px 14px;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  font-size: 0.9rem;
}
.qb-answer,
.qb-explanation {
  margin: 6px 0;
  color: #334155;
  line-height: 1.5;
}
.qb-empty {
  margin-top: 8px;
  padding: 40px 20px;
  text-align: center;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  color: #94a3b8;
}
.qb-add-btn {
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
.qb-add-btn:hover {
  background-color: #166534;
}
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-container {
  background: white;
  border-radius: 20px;
  padding: 24px;
  width: 90%;
  max-width: 600px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
}
.modal-container h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #0f172a;
}
.form-group {
  margin-bottom: 16px;
}
.form-group label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 6px;
  color: #334155;
}
.form-group input, .form-group select, .form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.9rem;
}
.disabled-input {
  background-color: #f1f5f9;
  color: #64748b;
  cursor: not-allowed;
}
.form-row {
  display: flex;
  gap: 12px;
}
.form-row .form-group {
  flex: 1;
}
.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}
.cancel-btn, .save-btn {
  padding: 8px 20px;
  border-radius: 24px;
  border: none;
  cursor: pointer;
  font-weight: 500;
}
.cancel-btn {
  background: #f1f5f9;
  color: #475569;
}
.save-btn {
  background: #2c6e2f;
  color: white;
}
.save-btn:hover {
  background: #166534;
}
/* OCR 相关样式 */
.ocr-group {
  background: #f8fafc;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}
.ocr-upload {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ocr-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 24px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  color: #2c6e2f;
  transition: all 0.2s;
  width: fit-content;
}
.ocr-label:hover {
  background: #f0fdf4;
  border-color: #86efac;
}
.ocr-label input {
  display: none;
}
.ocr-loading {
  opacity: 0.7;
  cursor: wait;
}
.ocr-hint {
  margin: 0;
  font-size: 0.7rem;
  color: #64748b;
}
.ocr-result {
  margin-top: 6px;
  padding: 10px;
  border: 1px solid #dbe3ee;
  border-radius: 10px;
  background: #fff;
}
.ocr-result__title {
  margin: 0 0 6px;
  font-size: 0.78rem;
  font-weight: 600;
  color: #334155;
}
.ocr-result__engine {
  margin: 0 0 6px;
  font-size: 0.75rem;
  color: #64748b;
}
.ocr-result__text {
  margin: 0;
  max-height: 140px;
  overflow: auto;
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 0.82rem;
  color: #334155;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px;
}
.ocr-result__actions {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
/* 图片上传相关样式 */
.image-upload {
  margin-top: 4px;
}
.image-preview {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}
.image-preview img {
  max-width: 100%;
  max-height: 160px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}
.clear-image-btn {
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 20px;
  padding: 4px 12px;
  font-size: 0.75rem;
  cursor: pointer;
  color: #dc2626;
}
.clear-image-btn:hover {
  background: #fee2e2;
}
.upload-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
  padding: 12px 20px;
  cursor: pointer;
  font-size: 0.85rem;
  color: #475569;
  transition: all 0.2s;
}
.upload-label:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}
.upload-label input {
  display: none;
}
/* 图标统一样式 */
.icon {
  display: inline-block;
  font-size: 1.1em;
  margin-right: 4px;
  vertical-align: middle;
  font-weight: normal;
  line-height: 1;
}
@media (max-width: 640px) {
  .qb-filter-row {
    flex-direction: column;
    align-items: stretch;
  }
  .qb-filter-field {
    min-width: auto;
  }
  .qb-card__top {
    align-items: flex-start;
  }
  .qb-card__chapter {
    position: static;
    margin-left: 0;
    text-align: left;
    width: auto;
    white-space: normal;
  }
  .form-row {
    flex-direction: column;
    gap: 0;
  }
}
</style>