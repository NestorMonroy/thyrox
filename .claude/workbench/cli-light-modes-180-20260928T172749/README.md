# #180 — modos ligeros en cli.tsx

`providers` y `mitm` son comandos autocontenidos y pasaban por `main.tsx`.
`src/entry/lightModes.ts` los resuelve antes de ese import.

- `red.txt` — por `main.tsx`, `cli.tsx providers no-such-verb` cargaba 4192 módulos.
- `green.txt` — `lightModes.test.ts` + `cliEntry.test.ts`, 11/11.
- `run-providers_list_--json.txt` — 91 módulos, 0.08 s, 63 MB.
- `run-mitm_status.txt` — 1812 módulos, 0.60 s: el camino ya no pasa por
  `main.tsx`, pero `mitm-commands.ts` arrastra lo suyo (insumo de #185).
- `derived.txt` — las 11 suites de cli que nombran `cli.tsx`: 102/102.
- `typecheck.txt` — vacío.

*Métrica:* `Object.keys(require.cache).length` al salir, vía `--preload`.
*Ciega a:* módulos nativos cargados fuera del caché de módulos de Bun.
