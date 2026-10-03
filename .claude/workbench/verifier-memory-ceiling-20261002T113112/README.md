# verifier-memory-ceiling

## El encargo

<!-- verbatim, sin parafrasear -->

> * (b) Escribir V1 yo dentro del banco, y que todo lo posterior vaya por locales.

## La premisa, si se corrigio al primer comando

Se suponía que el verificador cargaba el blob entero con `arrayBuffer`. No:
`downloadVerifiedLayer` ya leía en flujo. La causa es del entorno: el `fetch`
de Bun no aplica contrapresión y guarda en memoria lo que llegó y aún no se
leyó. Lo mismo con `Bun.write(path, response)` —la forma que usa la
importación de Hugging Face— y con `node:http`.

## Las piezas

| archivo | que hace |
|---|---|
| `probes/serve_blob.ts` | registro falso con un blob sintético sembrado (Bun.serve rehúsa subir más de 128 MB) |
| `probes/measure.sh` | pico de RSS de `verifyArtifact.ts` por tamaño de blob, con GNU Time |
| `probes/consume_variants.ts` | seis formas de consumir el cuerpo, para aislar quién acumula |
| `probes/range_server.ts` | servidor de un archivo que responde `Range` con 206 |
| `probes/measure_variants.sh` | pico de RSS por variante |
| `outputs/rss.tsv` | MiB, salida, RSS máximo en KiB, segundos; antes y después del arreglo |
| `outputs/variants.tsv` | lo mismo por variante |
| `outputs/red.log`, `outputs/annulment.log` | la mitad roja y las tres anulaciones |

## Los resultados

| blob | antes | después |
|---|---|---|
| 256 MiB | 567 MiB | 136 MiB |
| 1 GiB | 1 723 MiB | 138 MiB |

Por variante, con 1 GiB: sólo hashear el cuerpo, 1.9 GiB; `Bun.write`, 2.1 GiB;
forzando GC cada 16 MiB, 946 MiB; por tramos de 16 MiB, 121 MiB sin depender
del tamaño. El arreglo es un paquete hoja, `@thyrox/bounded-download`, que
`artifact-registry` usa para cada capa; la importación de Hugging Face sigue
pendiente de migrar (H-THYROX-406).

*Metrica:* RSS máximo de GNU Time del proceso del verificador.
*Ciega a:* la caché de páginas y el cgroup del contenedor real (se mide en el
anfitrión, sin el techo de 1024 MiB), y la latencia de un registry remoto.
