// Adds Hosts to the local emulator's allowlist: pnpm seed:emulator you@example.com other@example.com
import { emailToAllowlistKey } from "../packages/shared/src/allowlist.ts"

const emails = process.argv.slice(2)
if (emails.length === 0) {
  console.error("Usage: pnpm seed:emulator <email> [<email> ...]")
  process.exit(1)
}

const base = "http://127.0.0.1:9000"
const ns = "demo-office-games-default-rtdb"

for (const email of emails) {
  const key = emailToAllowlistKey(email)
  const response = await fetch(`${base}/allowedHosts/${encodeURIComponent(key)}.json?ns=${ns}`, {
    method: "PUT",
    headers: { Authorization: "Bearer owner" },
    body: "true",
  }).catch(() => null)
  if (!response?.ok) {
    console.error(`Could not add ${email}. Is the emulator running (pnpm emulators)?`)
    process.exit(1)
  }
  console.log(`Added ${email}`)
}
