<template>
  <v-btn @click="login" color="primary">
    <v-icon>mdi-microsoft-windows</v-icon> Sign in with {{ props.name }}
  </v-btn>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { authenticationManager } from '../../services/authentication/AuthenticationManager.js'

const props = defineProps({
  name: String,
})

const route = useRoute()

function login(): void {
  const redirect = route.query.redirect ?? '/'
  authenticationManager.userManager.signinRedirect({ state: redirect })
}
</script>
