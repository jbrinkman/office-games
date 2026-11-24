import type { GameState } from "@office-games/shared"
import { onScopeDispose, ref, shallowRef } from "vue"
import { subscribeToState } from "../services/games.ts"

export function useViewerGame(code: string) {
  const status = ref<"connecting" | "live" | "missing" | "error">("connecting")
  const state = shallowRef<GameState | null>(null)
  const message = ref("")

  const stop = subscribeToState(code, (event) => {
    if (event.kind === "state") {
      state.value = event.state
      status.value = "live"
    } else if (event.kind === "missing") {
      state.value = null
      status.value = "missing"
    } else {
      status.value = "error"
      message.value = event.message
    }
  })
  onScopeDispose(stop)

  return { status, state, message }
}
