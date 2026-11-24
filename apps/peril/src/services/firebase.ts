import { type FirebaseOptions, initializeApp } from "firebase/app"
import { connectDatabaseEmulator, getDatabase, onValue, ref } from "firebase/database"

export const useEmulators = import.meta.env.VITE_USE_EMULATORS === "true"

const config: FirebaseOptions = useEmulators
  ? {
      apiKey: "demo-api-key",
      projectId: "demo-office-games",
      authDomain: "localhost",
      databaseURL: "http://127.0.0.1:9000?ns=demo-office-games-default-rtdb",
    }
  : {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    }

export const app = initializeApp(config)
export const db = getDatabase(app)

if (useEmulators) connectDatabaseEmulator(db, "127.0.0.1", 9000)

let serverOffset = 0
onValue(ref(db, ".info/serverTimeOffset"), (snapshot) => {
  serverOffset = Number(snapshot.val()) || 0
})

/** Milliseconds since the epoch according to the Firebase server, which security rules use. */
export function serverNow(): number {
  return Date.now() + serverOffset
}
