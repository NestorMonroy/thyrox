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
