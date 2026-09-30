# Guard census rows in the test contract

## Question

Are the four strict-null diagnostics in `tscFixCensus.test.ts` evidence of an
optional production contract, or unchecked lookup results in the test?

## Observation

Each failing access followed an array index or `find`. The test expected the
row to exist but expressed that expectation only through unsafe access or a
non-null assertion. The production census contract still permits no matching
row.

## Implementation

A test-local `requireRow` guard converts absence into an actionable failed test
and narrows the returned value. It replaces every non-null assertion in this
suite rather than suppressing individual diagnostics.

## Result

The focused eleven-case Bun suite passes. A complete typecheck moved from
4,057 diagnostics in 814 files to 4,053 in 813 files: TS18048 fell by two and
TS2532 fell by two, with no new diagnostic identity.

*Metric:* complete `tsc --noEmit` diagnostic multiset and focused Bun suite.
*Blind to:* remaining production contracts; this block changes test safety only.
