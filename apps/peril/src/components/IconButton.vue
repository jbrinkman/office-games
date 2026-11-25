<script setup lang="ts">
export type IconName =
  | "copy"
  | "hash"
  | "open"
  | "undo"
  | "trash"
  | "check"
  | "next"
  | "skip"
  | "play"

defineProps<{
  icon: IconName
  /** Shown as a tooltip on hover or focus, and used as the accessible name. */
  label: string
  href?: string
  disabled?: boolean
  /** Which edge the tooltip lines up with, so tooltips at the row's far end are not cut off. */
  tipAlign?: "center" | "right"
  /** Highlight the button, for example while showing a "Copied" confirmation. */
  active?: boolean
}>()
</script>

<template>
  <component
    :is="href ? 'a' : 'button'"
    class="icon-btn"
    :class="[`tip-${tipAlign ?? 'center'}`, { active }]"
    :data-tip="label"
    :aria-label="label"
    :href="href"
    :target="href ? '_blank' : undefined"
    :rel="href ? 'noopener' : undefined"
    :type="href ? undefined : 'button'"
    :disabled="href ? undefined : disabled"
  >
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <template v-if="icon === 'copy'">
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M5 15V6a2 2 0 0 1 2-2h8" />
      </template>
      <template v-else-if="icon === 'hash'">
        <path d="M5 9h15M4 15h15M10 4 8 20M16 4l-2 16" />
      </template>
      <template v-else-if="icon === 'open'">
        <path d="M14 4h6v6M20 4l-9 9" />
        <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
      </template>
      <template v-else-if="icon === 'undo'">
        <path d="M9 5 4 10l5 5" />
        <path d="M4 10h10a6 6 0 0 1 0 12h-3" />
      </template>
      <template v-else-if="icon === 'trash'">
        <path d="M4 7h16M10 7V4h4v3M6 7l1 13h10l1-13" />
      </template>
      <template v-else-if="icon === 'next'">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </template>
      <template v-else-if="icon === 'skip'">
        <path d="m5 5 7 7-7 7M13 5l7 7-7 7" />
      </template>
      <template v-else-if="icon === 'play'">
        <path d="M7 4v16l13-8z" />
      </template>
      <path v-else d="m5 12 5 5 9-10" />
    </svg>
  </component>
</template>

<style scoped>
.icon-btn {
  position: relative;
  display: inline-grid;
  place-items: center;
  width: 2.4rem;
  height: 2.4rem;
  padding: 0;
  color: var(--white);
  background: transparent;
  border: 2px solid var(--blue-bright);
  border-radius: 6px;
  cursor: pointer;
  text-decoration: none;
}
.icon-btn:hover:not(:disabled),
.icon-btn:focus-visible {
  background: var(--blue-dark);
}
.icon-btn.active,
.icon-btn.active:hover:not(:disabled),
.icon-btn.active:focus-visible {
  background: var(--gold);
  border-color: var(--gold);
  color: var(--ink);
}
.icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Tooltip. It appears below the button so it is never clipped by the top of the page. */
.icon-btn::after {
  content: attr(data-tip);
  position: absolute;
  top: calc(100% + 8px);
  z-index: 20;
  padding: 0.3rem 0.6rem;
  background: #000;
  color: var(--white);
  border: 1px solid var(--blue-bright);
  border-radius: 4px;
  font: 600 0.8rem var(--font-head);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.12s ease-in;
}
.icon-btn.tip-center::after {
  left: 50%;
  transform: translateX(-50%);
}
.icon-btn.tip-right::after {
  right: 0;
}
.icon-btn:hover::after,
.icon-btn:focus-visible::after {
  opacity: 1;
}
</style>
