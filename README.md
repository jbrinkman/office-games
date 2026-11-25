# Office Games

A monorepo of classic gameshow-style games for your team to play together. A Host runs the game, and everyone else follows along on a live, read-only board with the scores.

The first game is **Peril!**, a quiz game in the style of the classic TV quiz show with the blue board, gold dollar values and three rounds.

> This is an unofficial fan project. It is not affiliated with, endorsed by, or sponsored by the owners of any TV show. It uses no show logos, fonts, or content.

## How a game works

1. The Host signs in with Google (the account must be on the Host list), loads a Gamefile (or picks the bundled sample), and adds 2 to 6 Contestants.
2. The app gives the Host a game URL such as `https://your-site.web.app/g/K7M2QX`. Anyone with the link can watch the board and scores live. No sign-in is needed.
3. At the start of each round the Host reveals the categories one at a time, reading each category's hint aloud if it has one. The Host then runs the game from a private console: picking Clues, revealing Responses, judging them correct or wrong, setting Double Down wagers, and running Final Peril.

The Host console is at `/host/CODE` and the Viewer board is at `/g/CODE`. Share the Viewer board on a call, or send the link.

Terms are defined in [GLOSSARY.md](./GLOSSARY.md).

## Repository layout

| Path              | What it is                                                                  |
| ----------------- | --------------------------------------------------------------------------- |
| `apps/peril`      | The Peril! Vue 3 + Vite + TypeScript app                                    |
| `packages/shared` | The Gamefile schema (Zod), game state, and the pure game engine, with tests |
| `firebase/`       | Realtime Database security rules and their emulator tests                   |
| `docs/adr`        | Architecture decision records                                               |

Future games get their own folder under `apps/` and reuse `packages/shared`.

## Quick start

You need Node 22.12 or newer, pnpm, and Java 17 or newer (for the Firebase emulator).

```sh
pnpm install
pnpm emulators   # terminal 1: Firebase Auth + Realtime Database emulators
pnpm dev         # terminal 2: the app at http://localhost:5173
pnpm seed:emulator you@example.com   # terminal 3: add yourself to the local Host list
```

Development runs entirely against the local emulators, so you do not need a Firebase project. Choose "Sign in with Google", then "Add new account" in the emulator popup, and enter the same email you seeded (the emulator accepts any address). The local list resets whenever the emulator restarts. Open the Viewer link in a second browser profile to see both sides.

Other commands:

```sh
pnpm lint         # Biome
pnpm format       # Biome, fix and format
pnpm typecheck    # tsc and vue-tsc
pnpm test         # game engine and Gamefile tests (Vitest)
pnpm test:rules   # security rules tests against the emulator
pnpm build        # production build to apps/peril/dist
```

## Gamefiles

A Gamefile is a JSON file validated against [`packages/shared/gamefile.schema.json`](./packages/shared/gamefile.schema.json). Add `"$schema": "./gamefile.schema.json"` (or the path to that file) to get completion in VS Code. See [`apps/peril/public/games/sample.json`](./apps/peril/public/games/sample.json) for a complete example.

- 1 or 2 rounds, each with 1 to 6 categories of exactly 5 Clues.
- Each Clue has a `value`, a `clue`, and a `response`. Add `"doubleDown": true` to make it a Double Down (at most 2 per round).
- Each category can have an optional `hint` (up to 300 characters): a short description the Host reads aloud when the category is revealed. Leave it out for categories that speak for themselves.
- An optional `final` block provides the Final Peril category, clue and response.

To add a bundled game, drop the file in `apps/peril/public/games/` and list it in `index.json`. Bundled games must be original. Do not copy clues from the TV show, J-Archive, or any other source you do not have the rights to, and never put client or personal data in a Gamefile.

## Deploying (Firebase Spark plan, no cost)

The app is static files plus Firebase Realtime Database, so there is no server to run. The Spark plan needs no payment method. Setup is done once. After that, publishing a change is a single command.

### One-time setup

1. Create a Firebase project in the [console](https://console.firebase.google.com).
2. Build > Authentication > Sign-in method: enable **Google**.
3. Build > Realtime Database: create a database (locked mode is fine, the rules are deployed with the app).
4. Project settings > Your apps: add a **Web app** and copy its config.
5. Copy `apps/peril/.env.example` to `apps/peril/.env.production.local` and fill in the values. They identify your project and are not secrets. The file is gitignored, so it stays on your machine.
6. Sign in to the Firebase CLI and select your project. This creates a local `.firebaserc` that is not committed:

```sh
pnpm exec firebase login
pnpm exec firebase use --add
```

7. Add your first Host. Nobody can create a game until their email is on the Host list, so see [Managing Hosts](#managing-hosts) and add yourself.

If your hosting domain is not already listed, add it under Authentication > Settings > Authorized domains. Firebase normally includes the default `*.web.app` domain.

### Deploying changes

Run this each time you want to publish code, rules, or bundled Gamefile changes:

```sh
pnpm deploy
```

It builds the app, then uploads the static files to Firebase Hosting and releases `firebase/database.rules.json` to the database. Nothing is deployed automatically. Pushing to GitHub only runs the CI checks, so the live site stays on the old version until you run `pnpm deploy`.

Run `pnpm lint && pnpm typecheck && pnpm test && pnpm test:rules` first if you want the same checks CI runs.

### Limits to know about

- Spark allows **100 simultaneous connections** for the whole project (one per open browser tab), plus 10 GB of database downloads per month.
- Games expire after the lifetime the Host picks (1 to 24 hours, default 6) since the last Host action. Security rules refuse access to an expired game. There is no server to clean up, so the data is deleted the next time that Host opens the app or ends the game.

### Managing Hosts

Only accounts on the Host list can create games. Viewers never need to sign in. The list lives in the database at `/allowedHosts`, so changing it needs no code change or deploy. It is not stored in this repository, which keeps people's email addresses out of a public repo.

Each entry is the Host's Google email in lowercase with dots replaced by commas, set to `true`. For example, `jane.smith@gmail.com` becomes `jane,smith@gmail,com`. Realtime Database keys cannot contain dots.

To add a Host in the console: Build > Realtime Database > Data, hover over the root, choose **+** to add a child `allowedHosts` if it does not exist, then add a child named like `jane,smith@gmail,com` with the value `true`. To remove a Host, delete the entry or set it to `false`.

From the command line, with the Firebase CLI signed in to the project:

```sh
pnpm exec firebase database:set /allowedHosts/jane,smith@gmail,com --data true --force
pnpm exec firebase database:remove /allowedHosts/jane,smith@gmail,com --force
```

Whoever can edit your Firebase project (Project settings > Users and permissions) can edit the list. The app cannot change it. A removed Host cannot create new games or extend existing ones, and games they already started simply run out at their current expiry.

Hosts need a Google account that signs in directly. Some company Google accounts hand off to another identity provider and fail, so personal Gmail addresses are the safe choice.

### Security model

There is no server code, so [`firebase/database.rules.json`](./firebase/database.rules.json) is the security boundary:

- Anyone can read a game's public state if they know its unguessable 6 character code. Nobody can list games.
- Only a signed-in Host whose verified Google email is on the Host list can create a game, and only that Host can write to it. Clients can read only their own entry in the list and can never change it.
- Unrevealed Responses and Final Peril entries live in a Host-only path. Viewers cannot read them.

See [docs/adr](./docs/adr) for why the app is built this way.

## License

MIT. See [LICENSE](./LICENSE).
