# `local-models-import` desde shards oficiales (opción A)

## El encargo

<!-- verbatim, sin parafrasear -->

> Respóndele dejando claro que A no es solo una opción, sino el camino que debe implementar, y que Claude queda fuera del flujo de traducción. También conviene prohibir los fallbacks silenciosos.
> Toma la opción A.
> Quiero que la traducción deje de usar Claude. A partir de este punto, Claude no debe participar ni como modelo principal, ni como fallback, ni mediante subagents para realizar la traducción.
> El objetivo es que la traducción se ejecute con `qwen2.5:7b-instruct` a través del mecanismo oficial de Thyrox.
> Por tanto:
>
> 1. Extiende `local-models-import` en Thyrox, con TDD, para soportar artefactos oficiales compuestos por varios archivos, como los dos shards publicados por Qwen.
> 2. Mantén como fuente los artefactos oficiales de Qwen. No uses un GGUF de un tercero solo para evitar implementar el soporte multi-file.
> 3. Haz que esos shards entren al artifact store verificado de Thyrox y conserva su identidad/procedencia.
> 4. Ejecuta después el flujo normal de Thyrox:
> `import/materialize → ensure → qualify → residency/scheduling → execution`.
> 5. Una vez que `qwen2.5:7b-instruct` esté correctamente cualificado, continúa la traducción utilizando ese modelo mediante Thyrox.
> 6. No invoques Ollama directamente para saltarte Thyrox, aunque el modelo ya exista dentro del volumen de Ollama.
> 7. No vuelvas a Claude si Qwen falla. Si el modelo no puede ejecutarse mediante Thyrox, detente únicamente en ese punto y reporta el bloqueo concreto. No sustituyas el modelo ni cambies de provider por tu cuenta.
> 8. No uses subagents de Claude para dividir o ejecutar las traducciones. Si hay N unidades de traducción independientes y Thyrox ya tiene un mecanismo de ejecución/pool apropiado, utiliza ese mecanismo con Qwen como modelo ejecutor.

## La premisa, si se corrigio al primer comando

El banco ya tenía el nombre del run; le faltaban el manifiesto, la declaración y probes/.

## Las piezas

| archivo | que hace |
|---|---|
| `outputs/` | 9 salidas: rojos, verdes y anulaciones |

## Los resultados

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

*Metrica:* aserciones rojas antes del cambio y las que caen al retirar cada guarda.
*Ciega a:* la importación real de los 4.7 GB de Qwen: el disco no alcanzó y no se ejecutó.
