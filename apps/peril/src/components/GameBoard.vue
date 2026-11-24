<script setup lang="ts">
import type { BoardCategory } from "@office-games/shared"

defineProps<{ categories: BoardCategory[]; clickable?: boolean }>()
const emit = defineEmits<{ select: [categoryIndex: number, clueIndex: number] }>()

/** A scattered, repeatable delay so cells "fill in" across the board at the start of a round. */
function fillDelay(col: number, row: number): string {
  return `${400 + ((col * 7 + row * 13) % 30) * 40}ms`
}
</script>

<template>
  <div class="board-frame">
    <div class="side-light left" aria-hidden="true" />
    <div class="board" :style="{ '--cols': categories.length }">
      <div
        v-for="(category, c) in categories"
        :key="`h${c}`"
        class="category"
        :style="{ gridColumn: c + 1, gridRow: 1, animationDelay: `${c * 80}ms` }"
      >
        <span>{{ category.name }}</span>
      </div>
      <template v-for="(category, c) in categories" :key="`c${c}`">
        <button
          v-for="(cell, r) in category.cells"
          :key="`${c}-${r}`"
          type="button"
          class="cell"
          :class="{ used: cell.used }"
          :style="{ gridColumn: c + 1, gridRow: r + 2, animationDelay: fillDelay(c, r) }"
          :disabled="!clickable || cell.used"
          :aria-label="cell.used ? `${category.name}, played` : `${category.name} for ${cell.value}`"
          @click="emit('select', c, r)"
        >
          <span v-if="!cell.used">${{ cell.value }}</span>
        </button>
      </template>
    </div>
    <div class="side-light right" aria-hidden="true" />
  </div>
</template>

<style scoped>
.board-frame {
  container-type: inline-size;
  position: relative;
  background: #000;
  padding: 1.4cqw 5cqw;
  border-radius: 1cqw;
  box-shadow: 0 0 0 0.5cqw #111, 0 1cqw 3cqw rgba(0, 0, 0, 0.6);
}

.side-light {
  position: absolute;
  top: 1.4cqw;
  bottom: 1.4cqw;
  width: 3.2cqw;
  background: linear-gradient(90deg, #7fd2ff, #2aa0ff 40%, #8be0ff);
  box-shadow: 0 0 2cqw #2aa0ff;
  border-radius: 0.6cqw;
}
.side-light.left {
  left: 0.9cqw;
}
.side-light.right {
  right: 0.9cqw;
}

.board {
  display: grid;
  grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
  grid-template-rows: 1.15fr repeat(5, 1fr);
  gap: 0.35cqw;
  aspect-ratio: 16 / 10.5;
  --col-width: calc(90cqw / var(--cols));
}

.category,
.cell {
  animation: fill-in 0.4s ease-out both;
}

.category {
  background: linear-gradient(180deg, #0d2cb4, #071a85);
  display: grid;
  place-items: center;
  padding: 0 0.5cqw;
  text-align: center;
  font: 700 calc(var(--col-width) * 0.115) / 1.05 var(--font-head);
  letter-spacing: 0.01em;
  text-transform: uppercase;
  text-shadow: 0.1cqw 0.1cqw 0 #000;
  text-wrap: balance;
  overflow: hidden;
}

.cell {
  appearance: none;
  border: 0;
  padding: 0;
  background: linear-gradient(180deg, #1634c6, #0c2aa8);
  color: var(--gold);
  font: 400 calc(var(--col-width) * 0.3) / 1 var(--font-value);
  text-shadow: 0.2cqw 0.2cqw 0 #000;
  display: grid;
  place-items: center;
  cursor: default;
}
.cell:not(:disabled) {
  cursor: pointer;
}
.cell:not(:disabled):hover,
.cell:not(:disabled):focus-visible {
  filter: brightness(1.35);
}
.cell.used {
  background: #071a85;
}

@keyframes fill-in {
  from {
    opacity: 0;
    transform: scale(0.7);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
