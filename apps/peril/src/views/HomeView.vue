<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useRouter } from "vue-router"
import { useAuth } from "../services/auth.ts"
import { isValidCode, listAndSweepHostGames, normalizeCode } from "../services/games.ts"

const router = useRouter()
const { user, ready, signIn, signOut } = useAuth()

const codeInput = ref("")
const joinError = ref("")
const myGames = ref<{ code: string; expiresAt: number }[]>([])
const signInError = ref("")

watch(
  () => user.value?.uid,
  async (uid) => {
    myGames.value = uid ? await listAndSweepHostGames(uid).catch(() => []) : []
  },
  { immediate: true },
)

const joinCode = computed(() => normalizeCode(codeInput.value))

function join() {
  if (!isValidCode(joinCode.value)) {
    joinError.value = "Game codes are 6 letters and numbers, like K7M2QX."
    return
  }
  router.push(`/g/${joinCode.value}`)
}

async function handleSignIn() {
  signInError.value = ""
  try {
    await signIn()
  } catch (error) {
    console.error("Sign-in failed", error)
    signInError.value = "Sign-in did not complete. Please try again."
  }
}

function timeLeft(expiresAt: number): string {
  const minutes = Math.max(0, Math.round((expiresAt - Date.now()) / 60000))
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m left` : `${minutes}m left`
}
</script>

<template>
  <main class="page stack">
    <h1 class="wordmark hero">Peril!</h1>
    <p class="muted">
      A quiz show game for your team, in the style of the classic TV show. An unofficial fan project.
    </p>

    <section class="panel stack">
      <h2>Join a game</h2>
      <form class="row" @submit.prevent="join">
        <label class="sr-only" for="code">Game code</label>
        <input id="code" v-model="codeInput" placeholder="Game code" maxlength="12" autocomplete="off" />
        <button class="btn" type="submit">Watch</button>
      </form>
      <p v-if="joinError" class="error" role="alert">{{ joinError }}</p>
    </section>

    <section class="panel stack">
      <h2>Host a game</h2>
      <p v-if="!ready" class="muted">Checking sign-in...</p>
      <template v-else-if="!user">
        <p class="muted">Hosts sign in with Google. Viewers do not need to sign in.</p>
        <div>
          <button class="btn" type="button" @click="handleSignIn">Sign in with Google</button>
        </div>
        <p v-if="signInError" class="error" role="alert">{{ signInError }}</p>
      </template>
      <template v-else>
        <p class="muted">Signed in as {{ user.displayName ?? user.email }}.</p>
        <div class="row">
          <RouterLink class="btn" to="/host/new">New game</RouterLink>
          <button class="btn secondary" type="button" @click="signOut()">Sign out</button>
        </div>
        <div v-if="myGames.length">
          <h3>Resume a game</h3>
          <ul class="games">
            <li v-for="game in myGames" :key="game.code">
              <RouterLink :to="`/host/${game.code}`">{{ game.code }}</RouterLink>
              <span class="muted">{{ timeLeft(game.expiresAt) }}</span>
            </li>
          </ul>
        </div>
      </template>
    </section>
  </main>
</template>

<style scoped>
.hero {
  font-size: clamp(3rem, 12vw, 7rem);
  margin: 0;
}
.games {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 0.4rem;
}
.games li {
  display: flex;
  gap: 1rem;
  font: 600 1.2rem var(--font-head);
  letter-spacing: 0.1em;
}
</style>
