<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const mode = ref('login') // 'login' ou 'register'
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const isLogin = computed(() => mode.value === 'login')

function switchMode() {
  mode.value = isLogin.value ? 'register' : 'login'
  error.value = ''
}

async function submit() {
  error.value = ''

  if (!isLogin.value && password.value.length < 8) {
    error.value = 'Le mot de passe doit contenir au moins 8 caractères.'
    return
  }

  loading.value = true
  try {
    if (isLogin.value) {
      await auth.login(email.value, password.value)
    } else {
      await auth.register(email.value, password.value)
    }
    // Redirection vers la page demandée au départ, sinon vers les favoris
    router.push(route.query.redirect || '/favorites')
  } catch (e) {
    error.value = e.response?.data?.error?.message ?? 'Une erreur est survenue.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="login">
    <h1>{{ isLogin ? 'Connexion' : 'Créer un compte' }}</h1>

    <form @submit.prevent="submit">
      <label>
        Email
        <input v-model="email" type="email" required autocomplete="email" />
      </label>

      <label>
        Mot de passe
        <input
          v-model="password"
          type="password"
          required
          :autocomplete="isLogin ? 'current-password' : 'new-password'"
        />
      </label>

      <p v-if="error" class="error">{{ error }}</p>

      <button type="submit" :disabled="loading">
        {{ loading ? 'Veuillez patienter…' : isLogin ? 'Se connecter' : "S'inscrire" }}
      </button>
    </form>

    <p>
      {{ isLogin ? 'Pas encore de compte ?' : 'Déjà inscrit ?' }}
      <button type="button" class="link" @click="switchMode">
        {{ isLogin ? 'Créer un compte' : 'Se connecter' }}
      </button>
    </p>
  </main>
</template>

<style scoped>
.login { max-width: 360px; margin: 2rem auto; padding: 1rem; }
form { display: flex; flex-direction: column; gap: 1rem; }
label { display: flex; flex-direction: column; gap: 0.25rem; }
input { padding: 0.5rem; }
button { padding: 0.5rem; cursor: pointer; }
.link { background: none; border: none; text-decoration: underline; padding: 0; }
.error { color: crimson; }
</style>