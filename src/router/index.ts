import { createRouter, createWebHistory } from 'vue-router'
import QnAPage from '../pages/QnAPage.vue'
import HistoryPage from '../pages/HistoryPage.vue'
import HistoryDetailPage from '../pages/HistoryDetailPage.vue'
import WrongQuestionsPage from '../pages/WrongQuestionsPage.vue'
import WrongPracticePage from '../pages/WrongPracticePage.vue'
import KnowledgePointsPage from '../pages/KnowledgePointsPage.vue'
import LoginPage from '../pages/LoginPage.vue'
import QuestionPage from '../pages/QuestionPage.vue'
import QuestionPracticePage from '../pages/QuestionPracticePage.vue'
import { getUserInfoFromStorage, normalizeUserRole } from '../utils/auth'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/login' },
    { path: '/login', component: LoginPage },
    { path: '/qa', component: QnAPage },
    { path: '/history', component: HistoryPage },
    { path: '/history/:id', component: HistoryDetailPage },
    { path: '/wrong', component: WrongQuestionsPage },
    { path: '/wrong/practice', component: WrongPracticePage },
    { path: '/knowledge', component: KnowledgePointsPage },
    { path: '/question-bank', component: QuestionPage },
    { path: '/question-bank/practice', component: QuestionPracticePage },
  ],
})

router.beforeEach((to) => {
  const token = localStorage.getItem('token')
  const userInfo = getUserInfoFromStorage()
  const isLoggedIn = !!token || !!userInfo

  if (!isLoggedIn && to.path !== '/login') return '/login'

  if (to.path.startsWith('/wrong')) {
    const role = normalizeUserRole(userInfo?.role)
    if (role !== 'student') return '/qa'
  }

  return true
})

