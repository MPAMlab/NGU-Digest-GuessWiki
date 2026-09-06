import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'GodMode',
    component: () => import('@/views/GodModeView.vue')
  },
  {
    path: '/god',
    redirect: '/'
  },
  {
    path: '/post-prod',
    redirect: '/'
  },
  {
    path: '/classic',
    name: 'Home',
    component: () => import('@/views/HomeView.vue')
  },
  {
    path: '/game',
    name: 'Game',
    component: () => import('@/views/GameView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router