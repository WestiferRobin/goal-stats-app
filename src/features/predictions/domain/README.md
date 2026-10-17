# Predictions domain

Preview storage is temporary, versioned and runtime-validated. Saved presentation always uses stored output and immutable input_snapshot, with generated_at and model_version. Probability fractions are multiplied by 100 once; momentum and confidence already use percentages. Current mutable scenario state never replaces an earlier prediction snapshot. Only Flask calculates predictions.

Add types and pure transformations here as they become necessary. Keep DOM,
React rendering, HTTP requests, environment variables, and database access out of
this layer. Shared football wire contracts belong in `src/lib/football` and are reused across features; do not import another feature’s domain internals.
Add focused transformation/validation tests beside their implementation.

See the [feature scope](../README.md) and [feature map](../../README.md).
