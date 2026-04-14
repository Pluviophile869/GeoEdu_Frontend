export type ExamOption = {
  label: 'A' | 'B' | 'C' | 'D'
  text: string
}

export type RelatedExamQuestion = {
  id: string
  stem: string
  options: ExamOption[]
  answer: 'A' | 'B' | 'C' | 'D'
  explanation: string
}

export type HistoryChatTurn = {
  id: string
  question: string
  answerMarkdown: string
  images: string[]
  relatedQuestions: RelatedExamQuestion[]
  textbookOriginal: string
}

export type HistoryItem = {
  id: string
  /** 会话标题：默认取第一问 */
  question: string
  /** 兼容旧结构：通常取最后一问的答案 */
  answerMarkdown: string
  images: string[]
  relatedQuestions: RelatedExamQuestion[]
  textbookOriginal: string
  createdAt: number
  /** 会话最后更新时间（用于排序/展示） */
  updatedAt?: number
  /** 新结构：一条记录可包含多轮问答 */
  turns?: HistoryChatTurn[]
}

