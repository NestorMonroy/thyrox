# Línea base de tsc con el reflejo de alcances corregido

Medida el 2026-09-25 en `thyrox-medicion`, re-preparado tras 177d9517.

- `@types` reflejados: 20 (antes 13; el principal tiene 20).
- Total: **191**, igual que el árbol principal (antes el worktree daba 202).
- TS7016: 1 (antes 3: `semver`, `qrcode` y `stack-utils` ya resuelven).
- Rutas (`classify.json`): determinista 12 · compartida 39 · local 140.
- `tsc_cycle next --exhausted deterministic` -> **modules**.
