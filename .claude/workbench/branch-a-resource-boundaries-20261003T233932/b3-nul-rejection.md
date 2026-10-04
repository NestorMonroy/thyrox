# Variable 3 — rechazo de NUL

Search Existing: el `Edit` y el `Write` del trabajador son los de `@thyrox/tools` (`src/packages/tools/src/registry.ts`;
la corrida r2 de la variable 2 lo mostró). Ninguno miraba el contenido. **EXTEND**: `nulIntoTextFile` rehúsa un NUL
que entraría en un archivo nuevo o sin NUL, y explica el escape; un archivo ya binario lo sigue aceptando
(`65f129c89`). Anulaciones: cada mitad cae exactamente su test.

## Diseño del experimento

El defecto se observó con qwen3-4b (auditoría, `experiments/repo-code-change-qwen3-4b-r1`), no con qwen2.5-7b:
medir la variable en qwen2.5-7b no informa. Se corre `repo-code-change@1` con qwen3-4b a 8K, con todas las
correcciones previas (Branch A, stream-json, `Edit` con líneas cercanas, veredicto de detención) y la variable.

Prerrequisito: el GGUF de qwen3-4b en la caché de artefactos (`local-models-ensure`, salida en `.claude/build-logs/qwen3-4b-ensure.log`): el perfil de Ollama monta
el blob desde ahí. Hoy su única copia es el volumen de la infraestructura (`thyrox-ollama-models`, blob
`7485fe6f…`, 2.50 GB). Tras `ensure` habrá dos copias, cada una con dueño declarado —la caché para las unidades,
el volumen para el Ollama de infraestructura—; esa segunda representación es del camino heredado y su retiro
es una decisión aparte, no de este experimento.

*Ciega a:* que el modelo no vuelva a producir el NUL en esta corrida —un resultado sin NUL no prueba la variable—.
Si no aparece, la variable queda «no ejercida», no «sin efecto».
