# Analytics domain

Existing charts read model values from SavedPrediction.output, match state and strength assumptions from input_snapshot, and timestamps from generated_at. Each newest-first page is reversed for chronological charts. These are saved hypothetical scenario revisions, not historical match telemetry; generation order need not follow match-minute order. Nullable catalog ratings and ranks stay unavailable; no presets or accuracy claims are fabricated.

Add types and pure transformations here as they become necessary. Keep DOM,
React rendering, HTTP requests, environment variables, and database access out of
this layer. Shared football wire contracts belong in `src/lib/football` and are reused across features; do not import another feature’s domain internals.
Add focused transformation/validation tests beside their implementation.

See the [feature scope](../README.md) and [feature map](../../README.md).
