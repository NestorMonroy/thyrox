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
