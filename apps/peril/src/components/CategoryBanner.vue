<script setup lang="ts">
defineProps<{ name: string; hint: string | null; position: number; total: number }>()
</script>

<template>
  <div class="banner">
    <span class="count">Category {{ position }} of {{ total }}</span>
    <span class="name">{{ name }}</span>
    <p v-if="hint" class="hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.banner {
  container-type: inline-size;
  display: grid;
  justify-items: center;
  gap: 0.8cqw;
  padding: 2cqw 4cqw 2.4cqw;
  text-align: center;
  background: radial-gradient(ellipse at center, var(--blue-bright), var(--blue) 55%, var(--blue-dark));
  border: 0.6cqw solid #000;
  border-radius: 0.8cqw;
  box-shadow: 0 1cqw 3cqw rgba(0, 0, 0, 0.7);
}
.count {
  font: 500 2.2cqw var(--font-head);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #cdd6ff;
}
.name {
  font: 400 7cqw / 1.05 var(--font-value);
  color: var(--gold);
  text-transform: uppercase;
  text-shadow: 0.35cqw 0.35cqw 0 #000;
  text-wrap: balance;
}
.hint {
  margin: 0;
  max-width: 85%;
  font: 700 3.3cqw / 1.35 var(--font-clue);
  text-shadow: 0.2cqw 0.2cqw 0 #000;
  text-wrap: balance;
  animation: hint-in 0.5s 0.35s ease-out both;
}
@keyframes hint-in {
  from {
    opacity: 0;
    transform: translateY(1cqw);
  }
}
</style>
