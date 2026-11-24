import {
  connectAuthEmulator,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from "firebase/auth"
import { readonly, ref } from "vue"
import { app, useEmulators } from "./firebase.ts"

const auth = getAuth(app)
if (useEmulators) connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true })

const user = ref<User | null>(null)
const ready = ref(false)

onAuthStateChanged(auth, (next) => {
  user.value = next
  ready.value = true
})

export function useAuth() {
  return {
    user: readonly(user),
    ready: readonly(ready),
    signIn: () => signInWithPopup(auth, new GoogleAuthProvider()),
    signOut: () => firebaseSignOut(auth),
  }
}
