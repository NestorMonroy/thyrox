# Fuente de verdad — ítem M1: `@thyrox/model-artifacts`, el núcleo agnóstico del modelo

Tarea: TASK-THYROX-0694. Análisis completo y mediciones: `source.md` de este
banco. Gobierna: ADR-THYROX-007 (Podman: infraestructura vs workers) y
ADR-THYROX-010 (empaquetado).

## P0 — qué existe y se reutiliza

| Pieza | Estado | Medido con |
|---|---|---|
| nombres, niveles, manifiesto y metadata de un modelo local | **MISSING** — no hay nada que extender: `gguf` aparece en **0** archivos de `src/`; `quantiz` en 15, y **ninguno** trata pesos de modelos (3 son `binary_quantize` de pgvector en `semantic-search`, 7 son cuantización de posiciones de scroll y render en `ink`/`repl`, 5 son binarios nativos de `image-processor-napi`) | `git grep -il gguf -- src`, `git grep -il quantiz -- src` |
| la forma de un paquete TS | **EXISTS_AND_REUSE**: `src/packages/podman-execution/`, el paquete más reciente, con los cinco archivos del molde de abajo | `ls src/packages/podman-execution` |

Métrica: archivos de `src/` que contienen el literal. Ciega a: un lector de
GGUF escrito sin nombrar el formato (se descarta: el formato empieza con la
magia `GGUF`, y un lector la nombra).

### El molde del paquete — qué crear y cómo queda registrado

| Archivo | Qué lleva (copiado de `podman-execution`, cambiando sólo el nombre) |
|---|---|
| `package.json` | `"name": "@thyrox/model-artifacts"`, `"private": true`, `"type": "module"`, `description` en español, `exports` `./*.ts` con las condiciones `@thyrox/source`, `types` (`./dist/*.d.ts`) y `default`, y `scripts.test = "bun test"` |
| `bunfig.toml` | `[test] preload = ["../../../tests/preload/tmpdir.ts", "../../../tests/preload/store.ts"]` — sin él, `bun test` desde el paquete no pasa por los grifos de la raíz y escribiría en el store versionado |
| `tsconfig.build.json` | el de `podman-execution` con `paths` `"@thyrox/model-artifacts/*.ts": ["./*.ts"]` y `files` `../../types/build-globals.d.ts` |
| `tsconfig.test.json` | extiende el build con `noEmit` e incluye `__tests__/**` |
| `__tests__/*.test.ts` | una suite por módulo |

Registro, sin editar nada a mano: el `package.json` raíz declara
`"workspaces": ["src/packages/*"]`, así que el directorio nuevo ya es
workspace; `bun install` lo añade a `bun.lock` (así entró `podman-execution`:
`bun.lock` le da su entrada en `src/packages/podman-execution`). Un consumidor
lo declara en su propio `package.json`, como `daemon/package.json:73` declara
`"@thyrox/podman-execution": "0.1.0"`. Se comprueba con
`bash bin/check_package_typecheck --strict model-artifacts` y `bun test` desde
el paquete.

## Lo que construye este ítem — lógica pura, sin Podman ni red

Paquete nuevo `src/packages/model-artifacts/` (`@thyrox/model-artifacts`), con
estos módulos y sus pruebas `bun test`:

1. **`modelName.ts`** — el contrato de nombre, directiva del ejecutor: el nombre
   identifica el modelo con nombre y versión correctos y el prefijo `thyrox-`,
   para que N modelos no interfieran.
   `thyroxModelName({ repository, quantization, source, revision })` →
   `thyrox-<org>--<repo>:<quant>-<source>-<revision12>`, en minúsculas.
   - `repository` = `org/repo` (HF) o `<namespace>/<modelo>-<etiqueta>` (registro de Ollama).
   - `source` ∈ `hf` | `ollama`; `revision` = commit de HF (40 hex) o digest
     del manifiesto (`sha256:`+64 hex): se toman los 12 primeros hex.
   - El inverso `parseThyroxModelName(name)` devuelve las partes o `undefined`
     si el nombre no es de thyrox. Ida y vuelta = identidad.
   - Rehúsa (error con nombre) un repositorio sin `/`, una revisión que no es
     hex, un nivel desconocido, y un nombre resultante que exceda lo que Ollama
     admite. Mide el límite y el alfabeto contra el binario antes de fijarlos:
     `podman exec thyrox-ollama ollama cp qwen2.5:0.5b <nombre>` con un nombre
     largo y con caracteres límite, y borra lo que crees con `ollama rm`; cita
     el resultado en el comentario de la constante.
   - Ejemplos que la prueba fija verbatim:
     `Qwen/Qwen2.5-0.5B-Instruct`, `q4_K_M`, `hf`, `7ae557604adf67be50417f59c2c2f167def9a775`
     → `thyrox-qwen--qwen2.5-0.5b-instruct:q4_k_m-hf-7ae557604adf`;
     `library/qwen2.5-0.5b` (registro: `<namespace>/<modelo>-<etiqueta>`, la
     etiqueta del registro es la variante y no se pierde), `Q4_K_M`, `ollama`,
     `a8b0c5157701…` (digest del manifiesto)
     → `thyrox-library--qwen2.5-0.5b:q4_k_m-ollama-a8b0c5157701`.
2. **`quantizationLevel.ts`** — el catálogo de niveles, con el backend que
   puede producir cada uno (medido, `source.md`): K-quants y `Q8_0`/`Q4_0`… →
   `llama-quantize`; `int4`/`int8`/`nvfp4`/`mxfp4`/`mxfp8` → `ollama-create`
   (sólo desde safetensors); `f16`/`bf16` → `convert`. Normaliza mayúsculas
   (`Q4_K_M` ≡ `q4_k_m`) y rehúsa lo desconocido. Una sola fuente de verdad: el
   nombre y el despachador la leen, no la copian.
3. **`artifactManifest.ts`** — el manifiesto de procedencia de un artefacto:
   repositorio, revisión, sha256 de cada archivo de la fuente, convertidor e
   imagen (con digest), nivel, sha256 y bytes del GGUF, validación (perplexity,
   tokens/s, carga), `createdAt`. Serializa a JSON canónico (claves ordenadas)
   y valida al leer; un campo que falta es un error con nombre, no un default.
4. **`ggufMetadata.ts`** — lee la cabecera GGUF v3 (magia `GGUF`, versión,
   conteo de tensores y de pares clave-valor, y los KV tipados) SIN cargar
   tensores: lectura por flujo acotada. Devuelve el mapa KV.
5. **`memoryEstimate.ts`** — `estimateServingMemory({ ggufBytes, metadata, contextLength, kvCacheType })`:
   peso = bytes del archivo; KV cache = `2 × block_count × contextLength ×
   head_count_kv × (embedding_length / head_count) × bytes(kvCacheType)`, con
   las claves `<arch>.block_count`, `<arch>.attention.head_count_kv`,
   `<arch>.attention.head_count`, `<arch>.embedding_length`, y `general.architecture`
   para `<arch>`; más un margen de buffers declarado como constante con nombre
   y su razón. Una clave ausente → error con el nombre de la clave (no un cero).

## Datos reales para las pruebas

Los GGUF medidos viven en el volumen `thyrox-quantization-lab-artifacts`
(`podman volume inspect … --format '{{.Mountpoint}}'`): `model-F16.gguf`
(994 156 640 bytes), `model-Q8_0.gguf` (531 068 000), `model-Q4_K_M.gguf`
(397 807 712), de `Qwen/Qwen2.5-0.5B-Instruct@7ae557604adf…` (24 capas, 2
cabezas KV, 14 cabezas, `hidden_size` 896). La suite no depende de ese volumen:
construye GGUF mínimos sintéticos en `mktemp`; además, UNA prueba opcional lee el
`model-Q4_K_M.gguf` real si existe (se salta con motivo declarado si no) y
comprueba `qwen2`, 24 y 2.

Archivos que te pertenecen: `src/packages/model-artifacts/**` (nuevo). Si hace
falta registrar el workspace, `package.json` raíz y `bun.lock` sólo con
`bun install`, nunca a mano. No toques otros paquetes.

TDD, controles de anulación por rama nueva con números, `bun test` y
`bash bin/check_package_typecheck --strict model-artifacts` en verde.
