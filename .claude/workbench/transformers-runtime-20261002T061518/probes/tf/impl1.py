from pathlib import Path
def patch(path, pairs):
    p = Path(path); s = p.read_text()
    for old, new in pairs:
        assert s.count(old) == 1, (path, old[:70]); s = s.replace(old, new)
    p.write_text(s)
patch('src/packages/model-artifacts/executionGrant.ts', [
 ("export type ModelRuntime = 'ollama' | 'llama.cpp'", "export type ModelRuntime = 'ollama' | 'llama.cpp' | 'transformers'")])
patch('src/packages/model-artifacts/catalogEntry.ts', [
 ("/** Dónde vive el artefacto: un GGUF propio o un modelo del registro de Ollama. */\nexport type ArtifactFormat = 'gguf' | 'ollama-registry'",
  "/**\n * Dónde vive el artefacto: un GGUF propio, un modelo del registro de Ollama o\n * un snapshot de safetensors que carga Transformers (TASK-THYROX-0761); el\n * `artifactId` de un snapshot es el sha256 de su manifiesto.\n */\nexport type ArtifactFormat = 'gguf' | 'ollama-registry' | 'safetensors'")])
patch('src/packages/model-artifacts/quantizationLevel.ts', [
 ("const CONVERT_LEVELS = ['f16', 'bf16'] as const", "const CONVERT_LEVELS = ['f32', 'f16', 'bf16'] as const")])
M = 'src/packages/model-scheduling/podmanModelUnitMaterializer.ts'
patch(M, [
 ("""  /** Entorno del runtime; sólo valores públicos (la primitiva neutral rehúsa nombres de credencial). */
  readonly environment: Readonly<Record<string, string>>
}
""", """  /** Entorno del runtime; sólo valores públicos (la primitiva neutral rehúsa nombres de credencial). */
  readonly environment: Readonly<Record<string, string>>
  /**
   * Cómo ve la unidad el artefacto concedido, si el runtime lo lee del disco
   * en vez de recibirlo por su API (TASK-THYROX-0761): el directorio del
   * anfitrión que lo contiene, verificado, se monta de sólo lectura.
   */
  readonly artifactMount?: ArtifactMount
}

/** El artefacto del grant expuesto a la unidad: de dónde se lee y dónde lo ve el runtime. */
export interface ArtifactMount {
  hostDirectory(artifact: ResolvedModelArtifact): string
  readonly containerDirectory: string
}
"""),
 ("const KNOWN_RUNTIMES: readonly ModelRuntime[] = ['ollama', 'llama.cpp']", "const KNOWN_RUNTIMES: readonly ModelRuntime[] = ['ollama', 'llama.cpp', 'transformers']"),
 ("const ARTIFACT_FORMATS: readonly string[] = ['gguf', 'ollama-registry'] satisfies readonly ArtifactFormat[]",
  "const ARTIFACT_FORMATS: readonly string[] = ['gguf', 'ollama-registry', 'safetensors'] satisfies readonly ArtifactFormat[]"),
 ("""    image: spec.profile.image,
    mounts: [],""", """    image: spec.profile.image,
    mounts: artifactMounts(spec),"""),
 ("""function pidsOf(pid: unknown): readonly number[] {""", """/** El artefacto concedido de sólo lectura, si el perfil lo declara; ningún otro montaje. */
function artifactMounts(spec: ModelUnitContainerSpec): WorkerResourceMount[] {
  const mount = spec.profile.artifactMount
  if (mount === undefined) return []
  return [{ source: mount.hostDirectory(spec.grant.artifact), destination: mount.containerDirectory, mode: 'ro' }]
}

function pidsOf(pid: unknown): readonly number[] {"""),
])
s = Path(M).read_text()
imports = []
if 'ResolvedModelArtifact' not in s.split('export interface RuntimeContainerProfile')[0]:
    imports.append("import type { ResolvedModelArtifact } from '@thyrox/model-artifacts/resolvedModelArtifact.ts'")
if 'WorkerResourceMount' not in s.split('export interface RuntimeContainerProfile')[0]:
    imports.append("import type { WorkerResourceMount } from '@thyrox/podman-execution/workerResourceProfile.ts'")
if imports:
    first = s.index('\nimport ')
    s = s[:first+1] + '\n'.join(imports) + '\n' + s[first+1:]
Path(M).write_text(s)
patch('src/packages/local-models/hostCoordinatorComposition.ts', [
 ("""/** En CPU una residencia no reserva VRAM; el runtime es Ollama. */
export function cpuPlacementOf(resolved: ResolvedModel): PlacementDecision {
  void resolved
  return { runtime: 'ollama', placement: { kind: 'cpu' }, residencyVramMib: 0, requestVramMib: 0 }
}""", """/** El runtime que sirve cada formato de artefacto: el runtime sale del artefacto, no del llamador. */
const RUNTIME_BY_FORMAT: Readonly<Record<ArtifactFormat, ModelRuntime>> = {
  gguf: 'ollama',
  'ollama-registry': 'ollama',
  safetensors: 'transformers',
}

/** En CPU una residencia no reserva VRAM; el runtime es el del formato del artefacto. */
export function cpuPlacementOf(resolved: ResolvedModel): PlacementDecision {
  return { runtime: RUNTIME_BY_FORMAT[resolved.artifact.format], placement: { kind: 'cpu' }, residencyVramMib: 0, requestVramMib: 0 }
}"""),
])
c = Path('src/packages/local-models/hostCoordinatorComposition.ts'); s = c.read_text()
first = s.index('\nimport ')
s = s[:first+1] + "import type { ArtifactFormat } from '@thyrox/model-artifacts/catalogEntry.ts'\nimport type { ModelRuntime } from '@thyrox/model-artifacts/executionGrant.ts'\n" + s[first+1:]
c.write_text(s); print('ok')
