import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/search', name: 'search', component: SearchView },
    {
      path: '/favorites',
      name: 'favorites',
      component: FavoritesView,
      meta: { requiresAuth: true }, // <-- nouveau
    },
  ],
})

// Nouveau : exécuté avant chaque changement de page
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
})

export default router

export default router
