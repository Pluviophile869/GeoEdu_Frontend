export type UserRole = 'teacher' | 'student' | ''

interface UserInfoLike {
  role?: string
  username?: string
}

const TEACHER_ROLE_SET = new Set(['teacher', '教师', '老师'])
const STUDENT_ROLE_SET = new Set(['student', '学生'])

function normalizeRoleText(role?: string): string {
  return (role || '').trim().toLowerCase().replace(/[_\s-]+/g, '')
}

export function normalizeUserRole(role?: string): UserRole {
  const value = normalizeRoleText(role)
  if (!value) return ''
  if (TEACHER_ROLE_SET.has(value) || value.includes('teacher') || value.includes('教师') || value.includes('老师')) {
    return 'teacher'
  }
  if (STUDENT_ROLE_SET.has(value) || value.includes('student') || value.includes('学生')) {
    return 'student'
  }
  return ''
}

export function getUserInfoFromStorage(): UserInfoLike | null {
  const raw = localStorage.getItem('userInfo')
  if (!raw) return null
  try {
    return JSON.parse(raw) as UserInfoLike
  } catch {
    return null
  }
}
