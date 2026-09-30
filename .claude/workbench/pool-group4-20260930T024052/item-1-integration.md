# Ítem 1 — TASK-THYROX-0438, integrado a mano

Veredicto del pool: `con-stash`, esta vez legítimo: el ítem intentó
`git stash push -u … startupProfiler.ts cli.tsx` para medir una línea base.
El guardián lo rehusó y el trabajo siguió en el working tree, así que
`1.patch` está completo.

Verificado en el árbol principal (`.claude/jobs/g4-item1-verify-20260930T030002/`):

- `checkStartupModuleBudget.ts --strict`: providers 90/90, mitm 1018/1018,
  bootstrap 2903/2903, exit 0. El ítem había reportado bootstrap 2928
  "preexistente"; medido antes del parche en el árbol principal
  (`.claude/jobs/g4-item1-budget-before-20260930T025951/`) da 2903: los 2928
  eran de su worktree, que enlazaba `node_modules` a mano.
- `startupProfilerReport.test.ts`: 4/4.
- `check_package_typecheck --strict app-host cli`: 0 errores propios.

Control de anulación declarado por el ítem (`1.json`): sin
`process.once('exit', …)` caen exactamente 2 de 19 pruebas, las que dependen
del gancho automático.
