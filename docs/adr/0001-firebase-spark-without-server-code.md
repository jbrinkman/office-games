# Host on Firebase Spark with no server code

Games need a live read-only view for Viewers at no cost and with easy setup. We chose Firebase Hosting plus Realtime Database on the no-cost Spark plan, with the Host's browser holding the game logic and security rules enforcing who can write and who can read answers. We rejected Cloudflare Workers with Durable Objects (server-enforced authority, but a Worker runtime to maintain) and Azure Web PubSub (free tier capped at 20 connections). This departs from the usual Microsoft default because no Microsoft service stays free at this size.

## Consequences

- Spark caps the whole project at 100 simultaneous connections, so Viewers per Game are limited.
- Cloud Functions need the Blaze plan, so there is no server code. Unrevealed answers are kept in a Host-only path that Viewers cannot read, and the Host copies each answer to the public path when revealing it.
- Game expiry is enforced by security rules, and expired data is removed lazily by clients.
