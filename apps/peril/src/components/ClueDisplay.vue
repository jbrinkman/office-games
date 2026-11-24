<script setup lang="ts">
import type { CurrentClue } from "@office-games/shared"

defineProps<{ current: CurrentClue; categoryName: string }>()
</script>

<template>
  <div class="clue-card">
    <header>
      <span class="cat">{{ categoryName }}</span>
      <span class="value">${{ current.value }}</span>
    </header>
    <div class="body">
      <div v-if="current.clue === null" class="double-down">
        <span class="splash">Double Down!</span>
        <span v-if="current.wager === null" class="hint">Waiting for a wager</span>
      </div>
      <p v-else class="clue">{{ current.clue }}</p>
      <p v-if="current.doubleDown && current.wager !== null" class="wager">
        Wager: ${{ current.wager }}
      </p>
      <p v-if="current.responseRevealed" class="response">{{ current.response }}</p>
    </div>
  </div>
</template>

<style scoped>
.clue-card {
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 16rem;
  background: radial-gradient(ellipse at center, var(--blue-bright), var(--blue) 55%, var(--blue-dark));
  border: 0.6cqw solid #000;
  border-radius: 0.8cqw;
  padding: 2cqw 4cqw 3cqw;
}

header {
  display: flex;
  justify-content: space-between;
  font: 700 3cqw var(--font-head);
  text-transform: uppercase;
  color: var(--gold);
  text-shadow: 0.2cqw 0.2cqw 0 #000;
}
.value {
  font-family: var(--font-value);
  font-weight: 400;
}

.body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  gap: 2.5cqw;
}

.clue {
  margin: 0;
  font: 700 5cqw / 1.35 var(--font-clue);
  text-transform: uppercase;
  text-shadow: 0.35cqw 0.35cqw 0 #000;
  text-wrap: balance;
  max-width: 90%;
}

.double-down {
  display: grid;
  gap: 1.5cqw;
}
.splash {
  font: 400 11cqw var(--font-value);
  color: var(--gold);
  text-transform: uppercase;
  text-shadow: 0.5cqw 0.5cqw 0 #000;
  animation: pulse 1s ease-in-out infinite alternate;
}
.hint {
  font: 500 2.5cqw var(--font-head);
  text-transform: uppercase;
  color: #cdd6ff;
}

.wager {
  margin: 0;
  font: 400 4cqw var(--font-value);
  color: var(--gold-light);
  text-shadow: 0.25cqw 0.25cqw 0 #000;
}

.response {
  margin: 0;
  font: 700 4.2cqw / 1.3 var(--font-clue);
  text-transform: uppercase;
  color: var(--gold-light);
  text-shadow: 0.3cqw 0.3cqw 0 #000;
  text-wrap: balance;
  animation: reveal 0.4s ease-out;
}

@keyframes pulse {
  from {
    transform: scale(0.96);
  }
  to {
    transform: scale(1.04);
  }
}
@keyframes reveal {
  from {
    opacity: 0;
    transform: translateY(1cqw);
  }
}
</style>
