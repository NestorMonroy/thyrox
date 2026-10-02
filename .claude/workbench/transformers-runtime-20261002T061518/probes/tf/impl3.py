from pathlib import Path
import shutil
L = Path('src/packages/local-models'); M = Path('src/packages/model-scheduling')
for name in ['runtimeMutation.ts', 'transformersRuntimeApi.ts', 'transformersRuntimeAdapter.ts', 'admittedSeq2seq.ts']:
    shutil.copy(f'/scratch/tf/{name}', L / name)
shutil.copy('/scratch/tf/runtimeAdapterRouter.ts', M / 'runtimeAdapterRouter.ts')
def patch(path, pairs):
    p = Path(path); s = p.read_text()
    for old, new in pairs:
        assert s.count(old) == 1, (path, old[:70]); s = s.replace(old, new)
    p.write_text(s)
O = L / 'ollamaRuntimeAdapter.ts'
s = O.read_text()
start = s.index("  /** Corre `change` sólo si la generación del binding es la vigente")
end = s.index("function apiOf(unit: ModelExecutionUnit): OllamaApi {")
s = s[:start].rstrip() + "\n}\n\n" + s[end:]
O.write_text(s)
patch(O, [
 ("import { OllamaApi, OllamaRequestError } from './ollamaApi.ts'",
  "import { OllamaApi, OllamaRequestError } from './ollamaApi.ts'\nimport { artifactIdentityMatches, mutateAtCurrentGeneration, reasonOf } from './runtimeMutation.ts'"),
 ("\nconst DONE: RuntimeMutationOutcome = { status: 'done' }\n", "\n"),
 ("""    return this.mutate(binding, async api => {
      if (!await api.hasBlob(sha256)) await api.pushBlob(sha256, this.options.artifactPath(sha256))
      await api.createModel(grant.artifact.modelId, sha256)
    })""", """    return this.mutate(binding, async api => {
      if (!await api.hasBlob(sha256)) await api.pushBlob(sha256, this.options.artifactPath(sha256))
      await api.createModel(grant.artifact.modelId, sha256)
    })"""),
 ("""      if (observed && identityMatches(expected, observed)) return { status: 'matches', observed }""",
  """      if (observed && artifactIdentityMatches(expected, observed)) return { status: 'matches', observed }"""),
 ("""      if (!identityMatches(expected.artifact, observed)) return { status: 'mismatch', observed }""",
  """      if (!artifactIdentityMatches(expected.artifact, observed)) return { status: 'mismatch', observed }"""),
])
s = O.read_text()
# mutate como delegación fina al módulo compartido: el adapter conserva su firma con la API de Ollama.
s = s.replace("""  async unloadResidency(binding: ResidencyBinding): Promise<RuntimeMutationOutcome> {
    return this.mutate(binding, () => setKeepAlive(binding.unit, binding.unit.artifact.modelId, KEEP_ALIVE_UNLOAD))
  }
}""", """  async unloadResidency(binding: ResidencyBinding): Promise<RuntimeMutationOutcome> {
    return this.mutate(binding, () => setKeepAlive(binding.unit, binding.unit.artifact.modelId, KEEP_ALIVE_UNLOAD))
  }

  private mutate(binding: ResidencyBinding, change: (api: OllamaApi) => Promise<void>): Promise<RuntimeMutationOutcome> {
    return mutateAtCurrentGeneration(this.options.currentGeneration, binding, () => change(apiOf(binding.unit)))
  }
}""", 1)
# quitar las copias locales que ahora viven en runtimeMutation.ts
import re
s = re.sub(r"\n/\*\*\n \* El runtime sirve exactamente la identidad concedida.*?\n}\n", "\n", s, count=1, flags=re.S)
s = re.sub(r"\nfunction reasonOf\(error: unknown\): string \{\n.*?\n}\n", "\n", s, count=1, flags=re.S)
O.write_text(s)
C = L / 'hostCoordinatorComposition.ts'
patch(C, [
 ("""export const OLLAMA_RUNTIME_IMAGE = 'docker.io/ollama/ollama:0.35.0'""",
  """export const OLLAMA_RUNTIME_IMAGE = 'docker.io/ollama/ollama:0.35.0'
/** La imagen del runtime de Transformers (`transformers-runtime/Containerfile`), construida por la primitiva. */
export const TRANSFORMERS_RUNTIME_IMAGE = 'localhost/thyrox-transformers-runtime:dev'
const TRANSFORMERS_CONTAINER_PORT = 8_080
/** Dónde ve la unidad el snapshot concedido, montado de sólo lectura. */
const TRANSFORMERS_MODEL_DIRECTORY = '/model'"""),
 ("""    profiles: { ollama: { image: OLLAMA_RUNTIME_IMAGE, containerPort: OLLAMA_CONTAINER_PORT, environment: { OLLAMA_HOST: `0.0.0.0:${OLLAMA_CONTAINER_PORT}` } } },""",
  """    profiles: {
      ollama: { image: OLLAMA_RUNTIME_IMAGE, containerPort: OLLAMA_CONTAINER_PORT, environment: { OLLAMA_HOST: `0.0.0.0:${OLLAMA_CONTAINER_PORT}` } },
      transformers: {
        image: TRANSFORMERS_RUNTIME_IMAGE,
        containerPort: TRANSFORMERS_CONTAINER_PORT,
        environment: { THYROX_TRANSFORMERS_MODEL_DIR: TRANSFORMERS_MODEL_DIRECTORY, THYROX_TRANSFORMERS_PORT: String(TRANSFORMERS_CONTAINER_PORT) },
        artifactMount: { hostDirectory: artifact => snapshotDirectory(artifactCache, artifact.artifactId), containerDirectory: TRANSFORMERS_MODEL_DIRECTORY },
      },
    },"""),
 ("""    runtime: new OllamaRuntimeAdapter({ artifactPath: sha256 => join(artifactCache, `sha256-${sha256}.gguf`), currentGeneration }),""",
  """    runtime: new RuntimeAdapterRouter({
      ollama: new OllamaRuntimeAdapter({ artifactPath: sha256 => join(artifactCache, `sha256-${sha256}.gguf`), currentGeneration }),
      transformers: new TransformersRuntimeAdapter({ currentGeneration }),
    }),"""),
])
s = C.read_text()
first = s.index('\nimport ')
s = s[:first+1] + "import { RuntimeAdapterRouter } from '@thyrox/model-scheduling/runtimeAdapterRouter.ts'\n" + s[first+1:]
s = s.replace("import { OllamaRuntimeAdapter } from './ollamaRuntimeAdapter.js'",
              "import { OllamaRuntimeAdapter } from './ollamaRuntimeAdapter.js'\nimport { TransformersRuntimeAdapter } from './transformersRuntimeAdapter.ts'", 1)
s = s.rstrip('\n') + """

/** El directorio verificado de un snapshot de safetensors en la caché de artefactos, por su digest de manifiesto. */
export function snapshotDirectory(artifactCache: string, artifactId: string): string {
  return join(artifactCache, `snapshot-${artifactId}`)
}
"""
C.write_text(s); print('ok')
