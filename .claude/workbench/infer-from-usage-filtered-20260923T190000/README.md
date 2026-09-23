# Filter TypeScript infer-from-usage proposals

The census classified 264 language-service fixes as runtime-neutral, but the
first complete batch disproved that classification as sufficient: it raised
the complete typecheck from 4,050 to 4,192 and two edits produced invalid
syntax. The batch was rejected rather than committed.

The proposer now rejects edits containing an explicit `any` and edits that do
not parse. Files responsible for new diagnostic identities were also removed
from this batch. The retained thirteen files close seven diagnostics, introduce
none, and leave the complete baseline at 4,043.

*Metric:* complete diagnostic multiset, not language-service row count.
*Blind to:* semantic regressions not represented by TypeScript or focused tests;
those require package behavior tests before broad reuse.
