import type { RelatedExamQuestion } from '../types'

export type MockAnswerResult = {
  answerMarkdown: string
  defaultImages: string[]
  relatedQuestions: RelatedExamQuestion[]
  textbookOriginal: string
}

function hashToSeed(input: string) {
  let hash = 0
  for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  return String(hash)
}

export function generateMockAnswer(question: string): MockAnswerResult {
  const seed = hashToSeed(question.trim() || 'geoedu')
  const safeQ = question.trim()

  const defaultImages = [
    `https://picsum.photos/seed/${seed}-1/900/540`,
    `https://picsum.photos/seed/${seed}-2/900/540`,
    `https://picsum.photos/seed/${seed}-3/900/540`,
  ]

  const topic = safeQ.length ? safeQ : '该主题'

  const answerMarkdown = `## 回答（示例）

针对你的问题：**${topic}**

### 要点拆解
- 先明确概念/条件：把问题里的关键名词提出来。
- 再分析过程：按“现象 -> 原理 -> 结论”的思路组织回答。
- 最后做总结：用一句话概括解决步骤或结论。

### 示例结论
本答案为前端框架演示数据，会在你接入真实后端/AI 后替换为实际结果。

### 可继续追问
如果你希望更贴近考试，可以补充：题型（选择/填空/简答）、年级、以及是否需要推导步骤。
`

  const relatedQuestions: RelatedExamQuestion[] = [
    {
      id: `${seed}-q1`,
      stem: '对西欧海洋性气候的形成具有巨大影响的洋流是（  ）',
      options: [
        { label: 'A', text: '北大西洋暖流' },
        { label: 'B', text: '北太平洋暖流' },
        { label: 'C', text: '日本暖流' },
        { label: 'D', text: '东澳大利亚暖流' },
      ],
      answer: 'A',
      explanation:
        '西欧位于北大西洋东岸，北大西洋暖流把较低纬度海区的热量带向欧洲西部，配合盛行西风，增强增温增湿作用，从而形成典型的海洋性气候特征。',
    },
    {
      id: `${seed}-q2`,
      stem: `关于“${topic}”的地理判读，下列说法最合理的是（  ）`,
      options: [
        { label: 'A', text: '只需记忆结论，不必关注形成机制' },
        { label: 'B', text: '应结合自然要素与人文要素综合分析' },
        { label: 'C', text: '地理问题通常与空间位置无关' },
        { label: 'D', text: '题目中的图表信息可以忽略' },
      ],
      answer: 'B',
      explanation:
        '地理学强调综合性和区域性，解题时应把位置、地形、气候、水文、人口和产业等信息一起分析，才能得到可靠结论。',
    },
  ]

  const textbookOriginal = `（教材原文示例）

${topic} 在学习中通常需要抓住“定义、分类与应用”三部分。掌握相关概念后，再通过典型例题理解其适用范围与推理方式，最后用总结句巩固知识结构。

提示：实际项目中可在这里展示你们教材对应章节的原文。`

  return { answerMarkdown, defaultImages, relatedQuestions, textbookOriginal }
}

