# Teams domain

Own catalog filtering, selection, comparison models, and display transformations. Team names are the current API identifiers. Do not duplicate backend rating or prediction formulas.

Add types and pure transformations here as they become necessary. Keep DOM,
React rendering, HTTP requests, environment variables, and database access out of
this layer. Shared football wire contracts belong in `src/lib/football` once
multiple features use them; do not import another feature’s domain internals.
Add focused transformation/validation tests beside their implementation.

See the [feature scope](../README.md) and [feature map](../../README.md).
