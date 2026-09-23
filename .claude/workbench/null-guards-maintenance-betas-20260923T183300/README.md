# Guard regex captures and snapshot environment input

Two independent proposals close strict-null diagnostics without assertions.
The frontmatter parser validates both regex capture levels before consuming
them. Beta assembly reads `ANTHROPIC_BETAS` once, so the guard and use share
one value rather than assuming two environment reads return the same result.

The provider source-contract test was red before the snapshot and both focused
suites are green afterward. The complete verifier accepts both proposals:
three target diagnostics disappear and none appears.

*Metric:* stable diagnostic multiset and 20 focused Bun cases.
*Blind to:* unrelated strict-null contracts elsewhere in the tree.
