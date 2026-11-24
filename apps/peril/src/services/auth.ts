import { HOST_EMAIL_DOMAIN, isAllowedHostEmail } from "@office-games/shared"
import {
  connectAuthEmulator,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from "firebase/auth"
import { computed, readonly, ref } from "vue"
import { app, useEmulators } from "./firebase.ts"

const auth = getAuth(app)
if (useEmulators) connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true })

const user = ref<User | null>(null)
const ready = ref(false)

onAuthStateChanged(auth, (next) => {
  user.value = next
  ready.value = true
})

const canHost = computed(() =>
  isAllowedHostEmail(user.value?.email, user.value?.emailVerified === true),
)

export function useAuth() {
  return {
    user: readonly(user),
    ready: readonly(ready),
    /** True only for verified accounts in the allowed domain. The database rules enforce this too. */
    canHost,
    hostDomain: HOST_EMAIL_DOMAIN,
    signIn: () => {
      const provider = new GoogleAuthProvider()
      // A hint for Google's account chooser only. It is not a security control.
      provider.setCustomParameters({ hd: HOST_EMAIL_DOMAIN })
      return signInWithPopup(auth, provider)
    },
    signOut: () => firebaseSignOut(auth),
  }
}
