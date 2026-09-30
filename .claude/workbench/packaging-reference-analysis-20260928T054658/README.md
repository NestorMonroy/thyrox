# Análisis: el empaquetado de la referencia contra thyrox

Fecha: 2026-09-28. Referencia: `_references/claude-code-bin/2.1.283/` (Bun
1.4.3, sección ELF `.bun`). thyrox: árbol en `ab28f039`, Bun 1.3.11. La sonda
de compilación propia es `../standalone-compile-probe-20260928T054036/`.

Cada cifra sale de un archivo de este banco; el archivo se nombra junto a ella.

## 1. Qué lleva el ejecutable de la referencia

`reference-content-by-class.tsv` — 2371 entradas, 45 403 377 B:

| Clase | Entradas | Bytes | Qué es |
|---|---|---|---|
| chunk js | 2133 | 39 848 923 | el código, partido (`splitting`), cada chunk con la cabecera `// @bun @bytecode` y `// Version: 2.1.283` |
| nativo `.node` | 2 | 1 565 232 | `clipboard-napi`, `audio-capture`, cada uno con su `.js` cargador de 685 B |
| js con nombre | 6 | 1 030 032 | vendorizados (`mermaid.min.js`, `chart.umd.min.js`, `hljsBundle`), los dos cargadores y `hooks-worker.js` |
| comprimido zstd | 57 + 76 | 1 684 501 | recursos de skills (`*.txt.zst`) y markdown (`*.md.zst`) |
| md / txt | 65 / 26 | 443 803 | skills y referencias sin comprimir, avisos (`NOTICE`) |
| asset | 3 | 767 753 | dos fuentes `woff2` y `payload.template.html` |
| mjs | 2 | 41 390 | `runner-scaffold`, `build-report-lite` |
| entrada | 1 | 21 743 | `cli`, el arranque |

`reference-named-entries.tsv` lista las 238 entradas que no son chunks.

## 2. Cuatro mecanismos de la referencia, medidos

1. **Arranque perezoso.** `cli` son 21 KB: resuelve `--version` con un objeto
   de constantes incrustado en el build (`VERSION:"2.1.283"`, `PACKAGE_URL`,
   `ISSUES_EXPLAINER`) y trae el resto con `import("/$bunfs/root/chunk-…")`
   (136 importaciones). `entry-head.txt`, `entry-fast-paths.txt`.
2. **Subcomandos sin REPL.** Un chunk de 1129 B decide qué invocaciones no
   montan la interfaz: `update`, `upgrade`, `doctor`,
   `forward-home-settings`, `mcp serve`, `agents --json`, `plugin eval`,
   `remote-control`. `reference-subcommand-dispatch.js.txt`.
3. **Lector de recursos incrustados.** Una función lee una ruta (absoluta si
   viene del bundle), detecta el magic de zstd `28 B5 2F FD`, descomprime
   síncrona o asíncronamente, y si falla lanza
   `embedded asset is missing or corrupt` con la ruta.
   `reference-embedded-asset-reader.js.txt`.
4. **Skills incrustados.** 29 archivos `SKILL*.md[.zst]`, 21 con `name:`
   (artifact-*, design, doc, run, verify, workshop, whiteboard…).
   `reference-bundled-skills.tsv`.

## 3. Qué tiene thyrox hoy

- **`bin/`**: 275 envoltorios generados por `src/session/generate_bin.py`.
  `thyrox-bin-inventory.tsv`, `thyrox-bin-by-family.txt`:
  20 lanzan Bun sobre un `.ts`, 198 lanzan `.venv/bin/python`, 55 son shell,
  2 no declaran destino. De los de Python, 91 son `src/verify` (gates); de
  shell, 27. Ninguno funciona sin el árbol clonado, Bun y `uv sync`.
- **Compilación**: `bun build --compile` del CLI compila (2.73 s, 124 MB) y no
  arranca fuera del árbol: lee `package.json` relativo a `import.meta.dir`.
- **Lecturas de ruta en tiempo de ejecución**: 46 líneas en `src/packages`
  (`thyrox-runtime-path-reads.txt`): 31 en `tools` —cada definición de agente
  lee su prompt `.md` junto al `.ts`—, 4 `paths`, 4 `agent`, 3
  `computer-use-mcp`, 2 `config`, 1 `shell`, 1 `cli`.
- **Nativos**: 7 paquetes `*-napi`; 4 traen `.node` para cinco plataformas
  (`thyrox-napi-binaries.txt`). La compilación propia incrustó 2
  (`image-processor`, `stdin`, los de x64-linux); `ripgrep` y `audio-capture`
  tienen consumidores (`tool-registry`, `voice`) y no entraron.
- **Versión**: el payload propio no declara `// Version:`; `binary info` la
  pide con `--declared-version`.

## 4. Correspondencia y fases

| Mecanismo de la referencia | thyrox hoy | Fase |
|---|---|---|
| contenedor legible por `bin/binary` | leído desde `ab28f039` (apéndice de Bun 1.3) | P0, hecha |
| arranque perezoso + constantes de build + cabecera `// Version:` | `cli.tsx` lee `package.json` de disco | P1 |
| lector de recursos incrustados (zstd) | 46 lecturas de ruta relativas al fuente | P2 |
| nativos incrustados por plataforma | 2 de 4 entran; sin decisión por nativo | P3 |
| skills, referencias, plantillas y assets incrustados | skills y prompts viven en el árbol | P4 |
| build con `--bytecode`, `splitting`, cabecera y NOTICE | `bun build --compile` a mano | P5 |
| subcomandos en el mismo ejecutable | 275 envoltorios de `bin/` | P6 |
| instalación y consumo | `bin/cli` sobre el fuente | P7 |

## Lo que este análisis no puede ver

- *Métrica:* nombres, bytes y clases de la tabla de módulos; cadenas del
  bundle. *Ciega a:* qué recurso lee de verdad cada ruta en ejecución — la
  tabla dice qué está incrustado, no qué se abre. P2 lo mide con una prueba que
  corre el compilado sin árbol.
- Por qué `ripgrep` y `audio-capture` no entraron: la hipótesis es que no son
  alcanzables desde el grafo de `cli.tsx`; queda como la primera medición de P3.
