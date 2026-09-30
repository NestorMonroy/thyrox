# p8-packaging

## [108] TASK-THYROX-0360 — Empaquetado P1 — arranque perezoso, constantes de build y cabecera // Version:

Status on board: pending

Referencia (banco packaging-reference-analysis-20260928T054658, §2.1): la entrada `cli` de 21 KB resuelve --version con un objeto de constantes incrustado en el build (VERSION, PACKAGE_URL, ISSUES_EXPLAINER) y trae el resto con import() perezoso; cada chunk abre con `// @bun @bytecode` y `// Version:`. thyrox: cli.tsx lee package.json relativo a import.meta.dir y muere con ENOENT fuera del árbol. Portar: (a) el objeto de constantes como define de build, (b) la vía rápida de --version/-v/-V sin cargar main, (c) la cabecera `// Version:` para que `binary info` la derive sin --declared-version. Criterio: `env -i PATH=/usr/bin:/bin <compilado> --version` desde / sale 0; `binary info` sin --declared-version lee la versión.

## [109] TASK-THYROX-0361 — Empaquetado P2 — lector de recursos incrustados (zstd) y migración de las 46 lecturas de ruta

Status on board: pending

Referencia (§2.3): un lector que acepta ruta absoluta del bundle, detecta el magic zstd 28 B5 2F FD, descomprime síncrono (Bun.zstdDecompressSync) o asíncrono, y lanza `embedded asset is missing or corrupt` con la ruta. Portarlo en TDD con su anulación. Migrar las 46 lecturas de thyrox-runtime-path-reads.txt: 31 prompts .md de @thyrox/tools (importados con `with { type: 'file' }`), 4 paths, 4 agent, 3 computer-use-mcp, 2 config, 1 shell, 1 cli; cada una se juzga (recurso incrustado, ruta del usuario legítima o constante de build). Criterio: prueba que corre el compilado sin árbol y ejercita un agente definido en tools.

## [110] TASK-THYROX-0362 — Empaquetado P5 — bin/thyrox-build-standalone: build reproducible con los flags de la referencia

Status on board: pending

La referencia abre con `// @bun @bytecode` y está partida en 2133 chunks (splitting). Construir el build como TypeScript sobre Bun.build({compile}) junto a src/typescript/buildJavascript.ts: --bytecode, splitting, target bun-linux-x64, cabecera con `// Version: <x.y.z>` (para que binary info la derive sin --declared-version), NOTICE de licencias, salida versionada fuera del árbol fuente. Decidir con el ejecutor si se sube el toolchain a Bun 1.4 (forma de sección, igual que la referencia) o se queda en 1.3 (apéndice): P0 lee las dos. Criterio: dos builds del mismo commit dan el mismo MANIFEST.tsv (sha256 por entrada), y el gate se cablea al pre-push o a CI con prueba de humo (--version, -p sin credencial).

## [111] TASK-THYROX-0363 — Empaquetado P6 — subcomandos en el ejecutable y destino de los 275 envoltorios de bin/

Status on board: pending

Referencia (§2.2): un chunk de 1129 B decide qué invocaciones no montan la interfaz (update, upgrade, doctor, forward-home-settings, mcp serve, agents --json, plugin eval, remote-control). thyrox (thyrox-bin-inventory.tsv): 275 envoltorios — 20 Bun, 198 Python (91 son gates de src/verify), 55 shell (27 de src/verify), 2 sin destino. Fase A: los 20 de Bun pasan a subcomandos con el mismo despacho sin interfaz; bin/<nombre> delega en el ejecutable si existe. Fase B: por familia (verify, session, corpus, hooks, agents, task…), decisión del ejecutor entre portar a TS o quedarse como herramienta de desarrollo fuera del paquete; no se porta nada sin esa decisión. Criterio: generate_bin.py --check verde y una prueba por subcomando.

## [112] TASK-THYROX-0364 — Empaquetado P7 — distribución y consumo: instalar, frescura y headless-pool sobre el compilado

Status on board: pending

Instalación a ~/.local/bin/thyrox (sin tocar _references), `thyrox --version` contra el commit del árbol (análogo a `binary freshness`), y que headless-pool/bin/cli usen el ejecutable compilado cuando existe. Medir arranque y memoria pico de `thyrox -p` compilado contra `bun cli.tsx` con GNU Time en un pool (pool-calibrate contra el mock). Criterio: el pool corre sus ítems con el compilado y la línea `historial:` registra la diferencia medida.

## [113] TASK-THYROX-0365 — Empaquetado P3 — nativos .node incrustados por plataforma, decisión por nativo

Status on board: pending

Decisión del ejecutor 2026-09-28: se incrustan TODOS los nativos que thyrox tiene implementados, igual que la referencia incrusta los suyos (clipboard-napi, audio-capture), para las plataformas que cada paquete vendoriza. Lo que thyrox tiene y la referencia no (ripgrep, image-processor, stdin, modifiers, color-diff, url-handler) se analiza y se implementa correctamente: nada se borra. Primero medir por qué ripgrep y audio-capture no entraron en la compilación de prueba (hipótesis: no alcanzables desde el grafo de cli.tsx; consumidores tool-registry y voice) y corregirlo. En TDD: una prueba por nativo que lo carga desde el ejecutable compilado sin árbol, y el corpus extraído con binary extract lo lista.

## [114] TASK-THYROX-0366 — Empaquetado P4 — skills, referencias, plantillas y assets incrustados como la referencia

Status on board: pending

Referencia (§1, §2.4): 29 SKILL*.md[.zst] (21 con name), referencias (files-api.md, streaming.md…), plantillas *.txt.zst, assets (2 woff2, payload.template.html), vendorizados (mermaid, chart.umd, hljs) y hooks-worker.js; comprime con zstd 76 md y 57 recursos. thyrox: skills, agentes y reglas se emiten desde src/skills, src/commands, src/rules y viven en el árbol. Decidir qué entra al ejecutable (lo que el runtime carga: skills incluidos, definiciones de agente) y con qué criterio se comprime (la referencia comprime lo que ahorra; medir el umbral en su tabla). Criterio: el ejecutable carga sus skills sin THYROX_ROOT y el corpus extraído los lista.
