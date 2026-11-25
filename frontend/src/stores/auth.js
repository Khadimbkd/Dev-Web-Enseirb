import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as authApi from '../api/auth'

export const useAuthStore = defineStore('auth', () => {
    const token = ref(localStorage.getItem('accessToken'))
    const email = ref(localStorage.getItem('email'))

    const isLoggedIn = computed(() => !!token.value)

    async function login(emailValue, password) {
        const data = await authApi.login(emailValue, password)
        token.value = data.accessToken
        email.value = emailValue
        localStorage.setItem('accessToken', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)
        localStorage.setItem('email', emailValue)
    }

    async function register(emailValue, password) {
        await authApi.register(emailValue, password)
        await login(emailValue, password)
    }

    function logout() {
        token.value = null
        email.value = null
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('email')
    }

    return { token, email, isLoggedIn, login, register, logout }
})