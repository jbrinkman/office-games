<script setup lang="ts">
import HostConsole from "../components/HostConsole.vue"
import { useAuth } from "../services/auth.ts"
import { normalizeCode } from "../services/games.ts"

const props = defineProps<{ code: string }>()
const { user, ready, signIn } = useAuth()
</script>

<template>
  <main v-if="!ready" class="page">Checking sign-in...</main>
  <main v-else-if="!user" class="page stack">
    <h1 class="wordmark">Host console</h1>
    <p>Sign in with the Google account that created this game.</p>
    <div><button class="btn" type="button" @click="signIn()">Sign in with Google</button></div>
  </main>
  <HostConsole v-else :code="normalizeCode(props.code)" :host-uid="user.uid" />
</template>
