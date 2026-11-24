<script setup lang="ts">
import HostConsole from "../components/HostConsole.vue"
import HostGate from "../components/HostGate.vue"
import { normalizeCode } from "../services/games.ts"

const props = defineProps<{ code: string }>()
</script>

<template>
  <HostGate title="Host console" v-slot="{ user }">
    <HostConsole :code="normalizeCode(props.code)" :host-uid="user.uid" />
  </HostGate>
</template>
