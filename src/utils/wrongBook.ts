export type Difficulty = 'easy' | 'medium' | 'hard'
export type QuestionKind = 'single' | 'multiple' | 'fill' | 'short'

export interface WrongBookQuestion {
  id: number
  kind: QuestionKind
  question: string
  options?: string[]
  correctAnswer?: string
  correctAnswers?: string[]
  errorRate: number
  wrongCount: number
  difficulty: Difficulty
  chapter: string
  knowledgePoints: string[]
  mastered: boolean
}

export interface WrongBookDraft {
  kind: QuestionKind
  question: string
  options?: string[]
  correctAnswer?: string
  correctAnswers?: string[]
  chapter: string
}

const WRONG_BOOK_KEY = 'geoedu_wrong_book_v1'
export const DEFAULT_WRONG_BOOK_QUESTIONS: WrongBookQuestion[] = [
  {
    id: 1,
    kind: 'single',
    question: '世界上最高的山峰是哪座？',
    options: ['珠穆朗玛峰', '乔戈里峰', '乞力马扎罗山', '阿空加瓜峰'],
    correctAnswer: '珠穆朗玛峰',
    errorRate: 72,
    wrongCount: 5,
    difficulty: 'easy',
    chapter: '第一章 地球与地图',
    knowledgePoints: ['自然地理', '地形'],
    mastered: false,
  },
  {
    id: 2,
    kind: 'fill',
    question: '长江发源于______山脉。',
    correctAnswer: '唐古拉',
    errorRate: 45,
    wrongCount: 3,
    difficulty: 'medium',
    chapter: '第二章 中国地理',
    knowledgePoints: ['水文', '中国河流'],
    mastered: false,
  },
  {
    id: 3,
    kind: 'multiple',
    question: '下列哪些属于欧洲联盟成员国？（多选）',
    options: ['法国', '瑞士', '德国', '挪威'],
    correctAnswers: ['法国', '德国'],
    errorRate: 38,
    wrongCount: 2,
    difficulty: 'medium',
    chapter: '第三章 世界地理',
    knowledgePoints: ['世界政区', '大洲'],
    mastered: false,
  },
  {
    id: 4,
    kind: 'short',
    question: '季风环流形成的主要原因是什么？',
    correctAnswer: '海陆热力性质差异导致冬夏季海陆气压中心交替，从而形成随季节变换风向的季风环流。',
    errorRate: 88,
    wrongCount: 7,
    difficulty: 'hard',
    chapter: '第一章 地球与地图',
    knowledgePoints: ['大气环流', '气候'],
    mastered: false,
  },
  {
    id: 5,
    kind: 'single',
    question: '我国人口地理分界线「胡焕庸线」大致经过哪里？',
    options: ['黑河—腾冲一线', '秦岭—淮河一线', '大兴安岭—太行山一线', '长江一线'],
    correctAnswer: '黑河—腾冲一线',
    errorRate: 22,
    wrongCount: 1,
    difficulty: 'easy',
    chapter: '第二章 中国地理',
    knowledgePoints: ['人文地理', '人口'],
    mastered: false,
  },
]

function cloneQuestions(list: WrongBookQuestion[]) {
  return list.map((q) => ({ ...q, options: q.options ? [...q.options] : undefined, correctAnswers: q.correctAnswers ? [...q.correctAnswers] : undefined, knowledgePoints: [...q.knowledgePoints] }))
}

function isWrongBookQuestion(val: unknown): val is WrongBookQuestion {
  if (!val || typeof val !== 'object') return false
  const q = val as Partial<WrongBookQuestion>
  return typeof q.id === 'number' && typeof q.kind === 'string' && typeof q.question === 'string'
}

export function loadWrongBookQuestions(fallback: WrongBookQuestion[] = []): WrongBookQuestion[] {
  try {
    const raw = localStorage.getItem(WRONG_BOOK_KEY)
    if (!raw) return cloneQuestions(fallback)
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return cloneQuestions(fallback)
    const list = parsed.filter(isWrongBookQuestion)
    if (!list.length) return cloneQuestions(fallback)
    if (!fallback.length) return list

    // Repair previously truncated stores by merging missing defaults back in.
    const merged = [...list]
    fallback.forEach((base) => {
      const exists = merged.some(
        (q) => q.question === base.question && q.chapter === base.chapter && q.kind === base.kind,
      )
      if (!exists) merged.push({ ...base })
    })
    return merged
  } catch {
    return cloneQuestions(fallback)
  }
}

export function saveWrongBookQuestions(list: WrongBookQuestion[]) {
  localStorage.setItem(WRONG_BOOK_KEY, JSON.stringify(list))
}

export function addQuestionToWrongBook(draft: WrongBookDraft): { added: boolean } {
  const current = loadWrongBookQuestions(DEFAULT_WRONG_BOOK_QUESTIONS)
  const hit = current.find((q) => q.question === draft.question && q.chapter === draft.chapter && q.kind === draft.kind)
  if (hit) {
    hit.wrongCount += 1
    hit.errorRate = Math.min(100, hit.errorRate + 5)
    saveWrongBookQuestions(current)
    return { added: false }
  }

  const maxId = current.reduce((max, item) => Math.max(max, item.id), 0)
  current.unshift({
    id: maxId + 1,
    kind: draft.kind,
    question: draft.question,
    options: draft.options,
    correctAnswer: draft.correctAnswer,
    correctAnswers: draft.correctAnswers,
    errorRate: 100,
    wrongCount: 1,
    difficulty: 'medium',
    chapter: draft.chapter,
    knowledgePoints: ['练习错题'],
    mastered: false,
  })
  saveWrongBookQuestions(current)
  return { added: true }
}
