<script setup lang="ts">
import { useAuth } from "../services/auth.ts"

defineProps<{ title: string }>()
const { user, ready, canHost, hostDomain, signIn, signOut } = useAuth()
</script>

<template>
  <main v-if="!ready" class="page">Checking sign-in...</main>
  <main v-else-if="!user" class="page stack">
    <h1 class="wordmark">{{ title }}</h1>
    <p>Sign in with your {{ hostDomain }} Google account to host a game.</p>
    <div><button class="btn" type="button" @click="signIn()">Sign in with Google</button></div>
  </main>
  <main v-else-if="!canHost" class="page stack">
    <h1 class="wordmark">{{ title }}</h1>
    <p class="error" role="alert">
      Hosting is limited to verified {{ hostDomain }} accounts. You are signed in as
      {{ user.email }}.
    </p>
    <div class="row">
      <button class="btn" type="button" @click="signOut()">Sign out</button>
      <RouterLink class="btn secondary" to="/">Home</RouterLink>
    </div>
  </main>
  <slot v-else :user="user" />
</template>
