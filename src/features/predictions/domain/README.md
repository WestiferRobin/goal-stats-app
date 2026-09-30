# Predictions domain

Own prediction presentation state and formatting. Convert probability fractions to percentages exactly once; confidence is already a percentage. Keep calculation and persistence separate until recalculation semantics are agreed.

Add types and pure transformations here as they become necessary. Keep DOM,
React rendering, HTTP requests, environment variables, and database access out of
this layer. Shared football wire contracts belong in `src/lib/football` once
multiple features use them; do not import another feature’s domain internals.
Add focused transformation/validation tests beside their implementation.

See the [feature scope](../README.md) and [feature map](../../README.md).
