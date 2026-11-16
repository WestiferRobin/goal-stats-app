# Matches domain

The original 21 match inputs remain, with ten blank explicit strength assumptions (0–100). Shared pure validators in `src/lib/football.ts` enforce integer IDs, minute 0–120, counts 0–1000, red cards 0–11, possession tolerance 0.01, optional ranks and modifiers. Historical browsing never supplies hypothetical statistics. Team, strength, title and historical-match changes cannot be PATCHed; generate a preview and explicitly save a new scenario instead.

Add types and pure transformations here as they become necessary. Keep DOM,
React rendering, HTTP requests, environment variables, and database access out of
this layer. Shared football wire contracts belong in `src/lib/football` and are reused across features; do not import another feature’s domain internals.
Add focused transformation/validation tests beside their implementation.

See the [feature scope](../README.md) and [feature map](../../README.md).
