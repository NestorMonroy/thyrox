# Salud de bin/ — 2026-09-30

| Medida | Resultado | Evidencia |
|---|---|---|
| ¿`bin/` al día con `src/`? | 295 de 295 (`bin/generate_bin --check`) | — |
| ¿cada envoltorio tiene destino que existe? | 295 de 295: 211 `.py`, 61 `.sh`, 22 `.ts`, 1 `.tsx` | `outputs/bin_targets.tsv` |
| lint de los destinos `.py` y `.sh` (`bin/check_lint_zero`) | shellcheck 0 · ruff 0 · pyright 1 | `outputs/lint.txt` |
| typecheck de los 11 paquetes con destino TS (`bin/check_package_typecheck --strict`) | 0 errores propios | `outputs/typecheck.txt` |
| destinos sin una ayuda visible en su fuente | 117 de 295, 57 de ellos escriben en disco | `outputs/help_census.tsv`, `outputs/help_census_writes.tsv` |

El único hallazgo de pyright (`src/corpus/pdf_to_text.py:87`, `pdfplumber`) es
del entorno: `pdfplumber` es el grupo opcional `corpus` de `pyproject.toml`,
que no está instalado aquí, y el guion lo importa sólo como respaldo de
`pdftotext`. No es un defecto del código.

El censo de ayuda es **estático** y grueso: marca como «sin ayuda» un destino
que la delega a un módulo importado, y como «escribe» cualquier patrón de
escritura aunque `--help` no llegue a ejecutarlo (`rules-emit` rechaza
`--help` sin emitir nada). Es una lista de candidatos, no un veredicto. El
episodio que lo motivó sí es de conducta: `bin/install-hooks --help` corrió
la instalación en vez de mostrar la ayuda.

## Conducta de `--help`, medida (`probes/smoke_help.sh`)

Cada envoltorio se corrió con `--help` en un montaje de sólo lectura
(`unshare --mount`), con 20 s de plazo. Un intento de escritura aparece como
EROFS en la salida. Resultado: `outputs/smoke_help.tsv`, 295 filas.

| Medida | Cuántos |
|---|---|
| terminan en el plazo | 292 de 295 |
| muestran una ayuda | 202 de 295 |
| intentan escribir con `--help` | 6 de 295 |

**No terminan (3).** `provider-anthropic-mock-server` es un servidor: no
terminar es su conducta. `convert_broken_references` (exit 124) y
`podman_capabilities` no tratan `--help` como ayuda; el segundo llegó a correr
un contenedor.

**Intentan escribir con `--help` (6).** `headless-pool` crea su lanzador en
`.thyrox/runtime/launchers/` antes de leer los argumentos; `commands-emit` y
`headless-sdk-generate-core-types` ignoran `--help` y corren su comparación;
`detect_broken_references` y `fix_agent_frontmatter` mueren con un traceback;
`podman_capabilities` ejecuta el contenedor. A esta lista se suma
`install-hooks`, que con `--help` corrió la instalación (medido antes del
barrido, sobre el clon real).

Por tanto, a la pregunta «¿está correcto `bin/`?» la respuesta medida es:
**al día sí (295 de 295); correcto no del todo**. Los destinos existen, pasan
lint y typecheck, pero `--help` no es inerte en 7 envoltorios y 93 no muestran
ayuda. Es el alcance de Empaquetado P6: un paquete publicado no puede tener
una orden que escriba al pedir su ayuda.

*Métrica:* código de salida, plazo y EROFS en la salida de `<bin> --help`.
*Ciega a:* un envoltorio que escriba fuera de los árboles montados en sólo
lectura, y uno que muestre ayuda y además haga algo más sin escribir.
