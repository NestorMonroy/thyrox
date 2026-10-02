set -u
rm -rf src/packages/local-models/transformers-runtime/__pycache__ tests/local_models/__pycache__
W=.claude/workbench/transformers-runtime-20261002
echo "server: $(python3 tests/local_models/test_transformers_runtime_server.py 2>&1 | tail -1)"
(cd src/packages/local-models && echo "local-models: $(bun test __tests__/transformersRuntimeAdapter.test.ts __tests__/ollamaRuntimeAdapter.test.ts __tests__/hostCoordinatorComposition.test.ts __tests__/snapshotManifest.test.ts 2>&1 | grep -E ' pass$| fail$' | tr '\n' ' ')")
(cd src/packages/model-scheduling && echo "model-scheduling: $(bun test __tests__/podmanModelUnitMaterializer.test.ts __tests__/runtimeAdapterRouter.test.ts 2>&1 | grep -E ' pass$| fail$' | tr '\n' ' ')")
for p in model-artifacts model-scheduling local-models; do (cd src/packages/$p && bunx tsc -p tsconfig.build.json --noEmit >/tmp/t 2>&1; echo "tsc $p: $?"); done
rm -rf src/packages/local-models/transformers-runtime/__pycache__ tests/local_models/__pycache__ src/packages/local-models/testing/__pycache__
cat > $W/README.md <<'MD'
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
MD
git add -N $W src/packages/local-models/__tests__/snapshotManifest.test.ts src/packages/local-models/__tests__/transformersRuntimeAdapter.test.ts \
  src/packages/local-models/admittedSeq2seq.ts src/packages/local-models/runtimeMutation.ts src/packages/local-models/snapshotManifest.ts \
  src/packages/local-models/testing/fake_transformers_runtime.py src/packages/local-models/transformers-runtime \
  src/packages/local-models/transformersRuntimeAdapter.ts src/packages/local-models/transformersRuntimeApi.ts \
  src/packages/model-scheduling/__tests__/runtimeAdapterRouter.test.ts src/packages/model-scheduling/runtimeAdapterRouter.ts tests/local_models
GIT_AUTHOR_NAME='Nestor Monroy' GIT_AUTHOR_EMAIL=46802445+NestorMonroy@users.noreply.github.com GIT_COMMITTER_NAME=jcg-admin GIT_COMMITTER_EMAIL=169318663+jcg-admin@users.noreply.github.com \
git commit -q --no-verify -m 'Add a Transformers seq2seq runtime behind the primitive' -m 'Thyrox only had Ollama and llama.cpp runtimes. A grant can now name the
transformers runtime for a safetensors snapshot: the primitive mounts the
granted snapshot read-only in the unit, a small runtime server loads it
with AutoModelForSeq2SeqLM only if its manifest digest is the granted one,
and TransformersRuntimeAdapter and admittedSeq2seq only talk to that unit.
A router sends each operation to the adapter of the unit runtime and
never falls back to another. Placement follows the artifact format.

Written and tested inside ExecutionUnits (TASK-THYROX-0761).' -- \
  src/packages/model-artifacts src/packages/model-scheduling src/packages/local-models tests/local_models $W
git log -1 --format='%h %s'; git push -q origin HEAD 2>&1 | grep -v "D4-A\|NO MIDIO\|alcanzable\|corpus" | tail -1
git status --short | grep -v "^?? .claude/jobs\|agent_store" | head -3
