import { emailToAllowlistKey } from "@office-games/shared"
import {
  connectAuthEmulator,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from "firebase/auth"
import { ref as dbRef, get } from "firebase/database"
import { computed, readonly, ref } from "vue"
import { app, db, useEmulators } from "./firebase.ts"

const auth = getAuth(app)
if (useEmulators) connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true })

const user = ref<User | null>(null)
const ready = ref(false)
/** Whether the signed-in account is on the Host allowlist kept in the database. */
const access = ref<"none" | "checking" | "allowed" | "denied">("none")

async function checkAccess(next: User | null) {
  if (!next) {
    access.value = "none"
    return
  }
  if (!next.email || !next.emailVerified) {
    access.value = "denied"
    return
  }
  access.value = "checking"
  let result: "allowed" | "denied" = "denied"
  try {
    const entry = await get(dbRef(db, `allowedHosts/${emailToAllowlistKey(next.email)}`))
    result = entry.val() === true ? "allowed" : "denied"
  } catch {
    result = "denied"
  }
  // Ignore the answer if someone else signed in while we were asking.
  if (auth.currentUser?.uid === next.uid) access.value = result
}

onAuthStateChanged(auth, (next) => {
  user.value = next
  ready.value = true
  void checkAccess(next)
})

export function useAuth() {
  return {
    user: readonly(user),
    ready: readonly(ready),
    /** True only for accounts on the allowlist. The database rules enforce this too. */
    canHost: computed(() => access.value === "allowed"),
    checkingAccess: computed(() => access.value === "checking"),
    signIn: () => {
      const provider = new GoogleAuthProvider()
      // Always show Google's account chooser, so a wrong account can be swapped without
      // signing out of Google first.
      provider.setCustomParameters({ prompt: "select_account" })
      return signInWithPopup(auth, provider)
    },
    signOut: () => firebaseSignOut(auth),
  }
}
