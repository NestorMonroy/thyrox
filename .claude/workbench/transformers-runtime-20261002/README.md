# Runtime de Transformers detrás de la primitiva de Podman (TASK-THYROX-0761)

Fuentes: `t5.md` (T5 en Transformers: `AutoTokenizer` + `AutoModelForSeq2SeqLM`,
`generate`, prefijo de tarea en la entrada) y «PodmanExecutionPrimitive es la vía
obligatoria de ejecución» (ADR-007: decisión → ExecutionGrant → primitiva →
RuntimeAdapter → runtime). Medido antes: no había runtime de Transformers
(`ModelRuntime = 'ollama' | 'llama.cpp'`, formatos `gguf | ollama-registry`).

```
ExecutionGrant (runtime 'transformers', formato 'safetensors')
  → PodmanModelUnitMaterializer: perfil 'transformers', snapshot concedido montado ro en /model
  → ModelExecutionUnit: transformers_runtime_server.py en loopback
  → TransformersRuntimeAdapter (sólo el endpoint de la unidad)  ·  admittedSeq2seq (con ticket)
  → AutoModelForSeq2SeqLM
```

- Tipos: runtime `transformers`, formato `safetensors`, cuantización `f32`.
- Identidad de un snapshot: sha256 de su manifiesto (`ruta⇥sha256⇥bytes` por
  archivo, ordenado). TypeScript (`local-models/snapshotManifest.ts`) y Python
  (el servidor) fijan el mismo vector `cc1e6e27…0979d9`.
- El artefacto se MONTA de sólo lectura, no se sube por la API: sin copia extra.
- El servidor rehúsa (409) cargar un snapshot cuyo digest no es el concedido y
  generar sin residencia; la cuantización observada sale del `config.json`.
- `RuntimeAdapterRouter`: cada operación al adapter del runtime de la unidad; un
  runtime sin adapter falla, nunca cae a otro. Capacidades: las que todos cumplen.
- Placement por formato: `gguf`→Ollama, `safetensors`→Transformers.
- DRY: generación vigente e identidad pasan a `runtimeMutation.ts`, que ahora
  usa también el adapter de Ollama (sus pruebas lo vigilan).
- La prueba del adapter usa el servidor REAL con un backend de eco
  (`testing/fake_transformers_runtime.py`): el contrato TS↔Python, no un doble.

Mitad roja: `outputs/red1.txt` (f32 desconocido, placement), `red2.txt` (módulos
ausentes), `red3.txt` (adapter y router ausentes).

| Anulación (sed, sintaxis comprobada) | Cae |
|---|---|
| montaje del artefacto | «expone el artefacto concedido de sólo lectura» |
| runtime por formato | «un snapshot de safetensors va a Transformers» |
| runtime conocido en la reconstrucción | «se reconstruye desde sus etiquetas» |
| digest en el servidor | «una carga con otra identidad… no carga nada» |
| residencia para generar | los dos casos que generan sin residencia |
| generación vigente | «una generación vieja no toca el runtime» |
| snapshot montado = concedido | «preparar verifica que el snapshot montado es el concedido» |
| router sin respaldo | «un runtime sin adapter falla y no cae a ningún otro» |

Pendiente: la imagen (`transformers-runtime/Containerfile`) no se construyó por
falta de disco («no space left» al confirmar la capa de pip), y con ella la
prueba real con t5-small dentro de una unidad.
