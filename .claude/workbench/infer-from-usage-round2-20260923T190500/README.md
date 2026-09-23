# Second infer-from-usage pass

The first accepted annotations exposed four further candidates in the same
files. A new complete pass rejected twenty-six interacting files and retained
four independent annotations. The proposer guard itself initially used a
non-public `SourceFile.parseDiagnostics` member; replacing it with the public
`transpileModule(..., reportDiagnostics)` contract removed that tool error.

The final verifier closes four targets, introduces none, and moves the complete
baseline from 4,043 to 4,039.

*Metric:* complete diagnostic multiset and proposer tests.
*Blind to:* runtime behavior beyond type annotation erasure.
