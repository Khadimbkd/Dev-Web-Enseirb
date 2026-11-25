<script setup>
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

const auth = useAuthStore()
const router = useRouter()

function logout() {
  auth.logout()
  router.push('/')
}
</script>

<template>
  <header>
    <nav>
      <RouterLink to="/">Accueil</RouterLink>
      <RouterLink to="/search">Recherche</RouterLink>
      <RouterLink to="/favorites">Favoris</RouterLink>

      <template v-if="auth.isLoggedIn">
        <span>{{ auth.email }}</span>
        <button @click="logout">Déconnexion</button>
      </template>
      <RouterLink v-else to="/login">Connexion</RouterLink>
    </nav>
  </header>

  <RouterView />
</template>

<style scoped>
nav { display: flex; gap: 1rem; align-items: center; padding: 1rem; }
</style>