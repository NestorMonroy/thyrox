# TASK-THYROX-0628 — publish the H-THYROX findings that lived only as store rows

## Instrument

- `plan.tsv`: 73 H-THYROX IDs, one per line, published with
  `bin/finding publish plan.tsv --run-dir run --name backfill0628`
  (render pool plus a dependent index job). H-THYROX-137 was rendered by hand
  before the batch.
- `not-gaps.txt`: rows the gate reports that are not gaps. Four are pre-rename
  IDs (H-API-390 → H-DOCS-1274, H-API-557 → H-DOCS-1273, H-SERVER-16 →
  H-API-1113, H-API-556 renamed), documented in
  `bitacora-los-cuatro-renombres-de-id.rst`. L-032 is a published lesson.

## Result

- 68 findings published in kaupamex-docs (`docs@39118f0ba`), each with its
  entry in its initiative index; the baseline of `check_finding_id_unique`
  drops those 68 IDs. The gate reports 0 orphans and 0 collisions.
- `run/index.log`: the first `finding index` stopped with ENOENT at
  H-THYROX-176, leaving the rest of the batch unindexed. Cause: six rows
  (H-THYROX-176..181) named `correr-lazo-tsc-cero`, an initiative that does not
  exist; `finding rst` had created its folder with no `index.rst`. The rows
  were moved to `resolve-all-thyrox-errors`. `run/index-2.log` indexes the
  rest of the batch.
- Six rendered files carried docutils warnings: multi-line descriptions
  outside their bullet (4) and a bare `*` opening an emphasis (2). Fixed in
  the renderer (`thyrox@23e667c8`, tests 12 and 13) and in the files.
- Two descriptions used a vetoed word; replaced in the file and in the row.
- Finding H-THYROX-282: `writeFinding` now refuses a missing initiative
  (test 14).

## Pending, and why

- H-THYROX-176..181 have no file in `resolve-all-thyrox-errors` yet, and
  their IDs stay in the baseline. The stray directory
  `kaupamex-docs/source/gestion/pm/thyrox/iniciativas/correr-lazo-tsc-cero/`
  (untracked, six files) has to be removed first. Its removal was not
  performed in this session. Until it is gone, the docs pre-push reports that
  initiative as missing `index.rst` and refuses the push.
- H-THYROX-1, 2 and 3 are still in the baseline; they were not part of this
  plan.
