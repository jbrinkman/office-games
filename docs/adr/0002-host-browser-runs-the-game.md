# The Host's browser runs the game and publishes one JSON state

With no server code (see ADR 0001), the Host's browser applies every game action through the shared engine and writes the resulting public state to Realtime Database as a single JSON string. Viewers subscribe to that one value. We rejected a field-per-property tree because Realtime Database turns arrays into numbered objects and drops empty ones, and a single string keeps every update atomic and lets Viewers validate it with the same Zod schema the Host uses.

## Consequences

- Every update sends the whole public state (a few kilobytes) to each Viewer, which is fine for the 10 GB monthly download allowance at office scale.
- Anything a Viewer must not see early (unrevealed Responses, Final Peril entries, upcoming Clue text) is never put in the public state. The Host keeps it in the private path and the engine copies it into public state only when revealed.
