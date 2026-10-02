# `local-models-import` desde shards oficiales (opción A)

Directiva del ejecutor 2026-10-01: traducir con `qwen2.5:7b-instruct` sólo a
través de thyrox, desde los artefactos oficiales de Qwen, sin Claude ni Ollama
directo. Qwen publica su Q4_K_M en dos shards
(`Qwen/Qwen2.5-7B-Instruct-GGUF@bb5d59e06d9551d752d08b292a50eb208b07ab1f`):

| Shard | Bytes | sha256 |
|---|---|---|
| `qwen2.5-7b-instruct-q4_k_m-00001-of-00002.gguf` | 3 993 201 344 | `dfce12e3…590580db` |
| `qwen2.5-7b-instruct-q4_k_m-00002-of-00002.gguf` | 689 872 288 | `539cf93f…f3d72a` |

## Diseño

- `--file a,b --sha256 x,y`: cada shard fijado antes de descargar.
- La partición tiene que ser completa y en orden (`-0000i-of-0000N`).
- El laboratorio fusiona con `llama-gguf-split --merge` (añadido a la imagen).
  El fusionado es el artefacto: catálogo, caché y runtime lo identifican por un
  único sha256, que se mide.
- Un fusionado que aún declara `split.count > 1` falla.
- La procedencia lleva `shards` (archivo, sha256, bytes) y `assembly`
  (herramienta y digest de la imagen).

## TDD

- Mitad roja: `outputs/red.txt` (7 fallos) y `outputs/red-arguments.txt`.
- Verde: 15/15 en `externalArtifact.test.ts` + `importArguments.test.ts`.

Anulaciones (`outputs/annul-*.txt`), cada una tumba exactamente su caso:

| Guarda retirada | Cae |
|---|---|
| pin del sha256 por archivo | los dos casos de pin (uno y varios) |
| partición completa | «not the complete split» (la primera versión del caso no discriminaba: pedía un shard no publicado; se corrigió) |
| `split.count` del fusionado | «a merge that still declares a split» |
| reutilizar el fusionado | «a rerun neither downloads, merges nor validates» |
| longitudes iguales en la CLI | «a different number of files and digests» |

Suite del paquete: 190 pass / 5 fail con el cambio; 181 / 6 sin él. Los fallos
de `local-models-qualify` son preexistentes y pasan aislados (4/4).

## T000 en el flujo real: hard_block medido (2026-10-02)

Contrato aplicado: `Ejecución de N tareas mediante Thyrox.md`, especializado
por el ejecutor (Qwen único candidato, sin fallback, T000 en el DAG).

1. **Credencial de publicación ausente.** `local-models-ensure` sólo
   materializa desde una publicación OCI verificada (índice de ubicaciones,
   `catalog locate --publication`). Publicar exige
   `THYROX_REGISTRY_PUBLISHER_{USERNAME,TOKEN,REGISTRY}`; no hay `.env` y
   ninguna está en el entorno. Dependencia externa obligatoria ausente.
2. **Disco.** Libre: 5 715 873 792 bytes (`outputs/df.txt`). Necesario,
   a 4.68 GB por copia del GGUF: imagen del laboratorio 1.28 GB (pico de
   construcción ~7.7 GB) + fusionado + caché de `ensure` + blob del Ollama
   gestionado + blob de la unidad del coordinador ≈ 20 GB estables, más los
   shards mientras se fusionan. Liberable sin perder trabajo: ~5.2 GB (el
   `ollama pull` directo del volumen y cachés). No alcanza.
3. **Desviación propia, declarada.** El código de T000 (TDD, typecheck,
   anulaciones) corrió en el anfitrión, no en una ExecutionUnit como pide
   §2 del contrato. Lo que siga va por `bin/task_continuation`.

Lo que sí está listo: `import` multi-shard (`d06fe3abb`), el owner id del
coordinador (`420171b2e`), y la ruta `thyrox -p` → `provider/bin/localProxy.ts`
→ `admittedChat` hacia el coordinador existe en el código.
