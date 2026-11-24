<script setup lang="ts">
import { type GameState, winners } from "@office-games/shared"
import { computed } from "vue"

const props = defineProps<{ state: GameState }>()
const winnerIds = computed(() => winners(props.state))
const winnerNames = computed(() =>
  props.state.contestants.filter((c) => winnerIds.value.includes(c.id)).map((c) => c.name),
)
</script>

<template>
  <section class="finished">
    <h2 class="wordmark">{{ winnerNames.length > 1 ? "It's a tie!" : "Our champion!" }}</h2>
    <p class="names">{{ winnerNames.join(" and ") }}</p>
    <p class="thanks">Thanks for playing Peril!</p>
  </section>
</template>

<style scoped>
.finished {
  text-align: center;
  padding: 3rem 1rem;
  background: radial-gradient(ellipse at center, var(--blue-bright), var(--blue) 55%, var(--blue-dark));
  border: 6px solid #000;
  border-radius: 10px;
}
h2 {
  font-size: clamp(2rem, 6vw, 4.5rem);
}
.names {
  font: 400 clamp(2.5rem, 8vw, 6rem) var(--font-value);
  color: var(--white);
  text-shadow: 0.06em 0.06em 0 #000;
  text-transform: uppercase;
  margin: 0.5rem 0;
}
.thanks {
  font: 500 1.4rem var(--font-head);
  text-transform: uppercase;
  color: #cdd6ff;
}
</style>
