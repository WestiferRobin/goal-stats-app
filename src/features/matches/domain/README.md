# Matches domain

Own the editable scenario state, input validation, and mapping to the backend request. Validate distinct teams and possession totals. Do not invent a Match ID or treat a snapshot UUID as a real fixture identity.

Add types and pure transformations here as they become necessary. Keep DOM,
React rendering, HTTP requests, environment variables, and database access out of
this layer. Shared football wire contracts belong in `src/lib/football` once
multiple features use them; do not import another feature’s domain internals.
Add focused transformation/validation tests beside their implementation.

See the [feature scope](../README.md) and [feature map](../../README.md).
