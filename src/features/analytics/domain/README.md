# Analytics domain

Own chart-series transformations, unit conversions, and analytics display state. Treat snapshots as shared team-pair history, not an identified fixture. Keep football formulas and backtesting calculations in Flask.

Add types and pure transformations here as they become necessary. Keep DOM,
React rendering, HTTP requests, environment variables, and database access out of
this layer. Shared football wire contracts belong in `src/lib/football` once
multiple features use them; do not import another feature’s domain internals.
Add focused transformation/validation tests beside their implementation.

See the [feature scope](../README.md) and [feature map](../../README.md).
