# Borradores del cache reubicados

## Qué se preguntaba

Por qué `.claude/cache/` no se parecía a `.claude/jobs/`. La respuesta es
que no debe: `src/cache/paths.py` define `cache/` como el hogar del ÍNDICE
reconstruible (`.work-index.json` de `work_cache`, y las copias
`<nombre>/annul/<ejecución>/` de `annul_parallel.sh`), hermano de `jobs/`
(salida de un proceso) y de `workbench/` (evidencia de un episodio).

## Qué se encontró

Los 97 archivos versionados bajo `.claude/cache/` eran ajenos a ese
contrato: logs de antes y después de tsc, sondas (`probe/`), veredictos de
lotes, respaldos y una herramienta (`cmp.py`). Sueltos, sin fecha y sin
procedencia, porque `cache/` se usó como borrador y nada medía su forma.

*Métrica:* `bin/check_cache_layout` — rutas versionadas bajo `.claude/cache/`
que no son índice. *Ciega a:* lo no versionado y al contenido del índice.

## Qué se hizo

- Se movieron con `git mv` (la historia de cada archivo sigue) a
  `contenido/`, con la misma estructura relativa.
- `cmp.py` duplicaba `_new_diagnostics` del paso; su sustituto es
  `bash bin/tsc_cycle compare ANTES DESPUES`.
- El gate `src/verify/check_cache_layout.py` rechaza lo que no es índice.

## Procedencia — los commits que los añadieron

| commit | fecha | asunto |
|---|---|---|
| `bb452236` | 2026-09-25 | Record steps 113 to 115 of the tsc zero loop |
| `9d212ec1` | 2026-09-25 | Record H-THYROX-176 and the contract-fix measurements |
| `9b08c714` | 2026-09-24 | Type the install-github-app command state |
| `430e1037` | 2026-09-23 | Census the TypeScript code fixes by class |
| `9cd85083` | 2026-09-23 | Keep the probes behind the tsc-zero plan |
| `e996a870` | 2026-09-23 | Keep the v2 annulment outputs of the annulment tool |
| `48af324a` | 2026-09-23 | Keep the evidence behind the unused-import and stub batches |
| `996de83f` | 2026-09-23 | Keep the corrected batch verdict |
| `5c73db9f` | 2026-09-23 | Index H-THYROX-156 and keep the remaining-suite run |
| `f49db1a4` | 2026-09-23 | Publish the first verified batch of TS2305 facades |
| `3409c18c` | 2026-09-23 | Verify a batch of TS2305 fixes with one tsc pass |
| `fe078fb1` | 2026-09-22 | Derive the roster under the declared clones root |
| `4f731ab5` | 2026-09-22 | Derive the roster from the declared clone prefix |
| `2f464045` | 2026-09-22 | Resolve the store's roster only when naming a repo |
| `40adef36` | 2026-09-22 | Bound the task pool by available memory |
| `f6385f6e` | 2026-09-18 | Discriminar el IDIOMA del comentario, no la palabra |
| `67e208bc` | 2026-09-18 | Versionar los jobs y el cache de este pase |
