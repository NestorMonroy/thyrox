# ollama-linked-blob

## El encargo

<!-- verbatim, sin parafrasear -->

> vamos a Sin gastar disco: enlazar el blob de Qwen en un directorio de modelos propio de cada unidad, sin copiarlo. Requiere un cambio en thyrox en TDD.

## La premisa, si se corrigio al primer comando

Medido antes: el adapter de Ollama sube el GGUF a cada unidad con `/api/blobs`
si no lo tiene (`ollamaRuntimeAdapter.ts`: `hasBlob` → `pushBlob`), lo que copia
4 683 073 952 bytes dentro del contenedor; quedaban 3.8 GB libres. Las cachés de
bun y uv liberarían 0.15 GB (el resto son enlaces duros con `node_modules` y
`.venv`). La caché de artefactos sólo se poblaba desde el registry (P6,
bloqueado). El volumen del Ollama gestionado y la caché están en el mismo
sistema de archivos (dispositivo 65024): un enlace duro cuesta cero bytes.

## Las piezas

| archivo | que hace |
|---|---|
| `probes/src/ollamaModelsDirectory.ts` | `ollamaModelsMount`: directorio de modelos propio del artefacto, `rw`, con `blobs/sha256-<hex>` enlazado desde la caché; rehúsa si el artefacto no está en caché |
| `probes/impl.py` | `adoptLocalArtifact` (núcleo común con la descarga: temporal, sha256, `rename`); `ArtifactMount.mode` y `stage`, llamado antes de crear la unidad; `local-models-catalog adopt <nombre>`; la composición monta el directorio en el perfil de Ollama |
| `probes/*.test.ts` | las pruebas nuevas |
| `probes/fix_narrowing*.py`, `probes/harden.py` | dos correcciones que el verde destapó (abajo) |
| `probes/red.sh`, `probes/green.sh`, `probes/typecheck.sh`, `probes/annul.py` | rojo, verde, tipos y anulaciones |

## Los resultados

| Paso | Resultado | Evidencia |
|---|---|---|
| rojo | caché y directorio no cargan (símbolos ausentes); 2 nuevas fallan en comandos y 2 en la primitiva | `outputs/red-*.txt` |
| verde | caché 11/11, directorio 4/4, primitiva 19/19; comandos 20 pasan y 5 fallan, los de H-THYROX-317 | `outputs/green-*.txt` |
| paquetes | local-models 229/234 (los mismos 5); model-scheduling 120/121: `redisCoordination` exige `redis-server`, opt-in | `outputs/green-local-models.txt`, `outputs/green-model-scheduling.txt` |
| tipos | `local-models` 0 errores en `tsconfig.build.json`, tras regenerar las declaraciones de `model-scheduling` | `outputs/tsc-*.txt` |

El verde destapó dos defectos propios, corregidos:
1. `tsc` no estrecha `AdoptionOutcome` por igualdad, porque cada variante agrupa
   dos estados; el comando estrecha por forma (`'path' in outcome`).
2. «sin el artefacto en la caché, stage rehúsa» pasaba también sin la guarda (el
   ENOENT de `link` nombra la ruta); exige ahora el mensaje propio.

| Anulación | Cae |
|---|---|
| adoptar copiando en vez de enlazar | la de inodo de la caché y la del comando `adopt` |
| no verificar el contenido | el rechazo de la adopción y el de la descarga (núcleo común) |
| staging copiando | las dos de inodo del directorio |
| staging sin exigir la caché | sólo «sin el artefacto en la caché, stage rehúsa» |
| modo fijo `ro` | sólo «un montaje rw llega como rw» |
| sin staging antes del create | las dos de la primitiva |

*Metrica:* pruebas en rojo, verde y bajo cada anulación; errores de `tsc`.
*Ciega a:* Ollama real leyendo un blob enlazado en un montaje: lo mide la cualificación real.
