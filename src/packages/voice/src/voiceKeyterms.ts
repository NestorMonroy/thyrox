/**
 * Keyterms de voz para mejorar la precision de STT en el endpoint
 * voice_stream.
 *
 * Provee hints de vocabulario especifico del dominio ("keywords" de
 * Deepgram) para que el motor STT reconozca correctamente terminologia
 * de codigo, nombres de proyecto, y nombres de rama que de otro modo se
 * escucharian mal.
 *
 * Puerto de `ccnmt: packages/voice/src/voiceKeyterms.ts` (106 líneas
 * fuente, 100% portado).
 *
 * Divergencia declarada: `getBranch` vive en
 * `ccnmt: packages/storage/src/git.ts:180-182`, que delega en
 * `getCachedBranch()` de `config/gitFilesystem.ts`. El
 * `storage/src/git.ts` de ESTE árbol es un porte PARCIAL DECLARADO (ver
 * su propio docstring) que no incluye `getBranch` — pero
 * `getCachedBranch` SÍ está portado en `@thyrox/config/gitFilesystem.js`
 * (verificado: `export function getCachedBranch(): Promise<string>`).
 * Se cita directamente desde ahí en vez de bloquearse.
 */

import { basename } from 'path'
import { getProjectRoot } from '@thyrox/app-host/bootstrap/state.js'
import { getCachedBranch as getBranch } from '@thyrox/config/gitFilesystem.js'

// ─── Keyterms globales ──────────────────────────────────────────────

const GLOBAL_KEYTERMS: readonly string[] = [
  // Terminos que Deepgram consistentemente destroza sin hints de keyword.
  // Nota: "Claude" y "Anthropic" ya son keyterms base del lado servidor.
  // Evitar terminos que nadie dice en voz alta tal como se escriben
  // (stdout → "standard out").
  'MCP',
  'symlink',
  'grep',
  'regex',
  'localhost',
  'codebase',
  'TypeScript',
  'JSON',
  'OAuth',
  'webhook',
  'gRPC',
  'dotfiles',
  'subagent',
  'worktree',
]

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Divide un identificador (camelCase, PascalCase, kebab-case,
 * snake_case, o segmentos de ruta) en palabras individuales. Los
 * fragmentos de 2 caracteres o menos se descartan para evitar ruido.
 */
function splitIdentifier(name: string): string[] {
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[-_./\s]+/)
    .map(w => w.trim())
    .filter(w => w.length > 2 && w.length <= 20)
}

function fileNameWords(filePath: string): string[] {
  const stem = basename(filePath).replace(/\.[^.]+$/, '')
  return splitIdentifier(stem)
}

// ─── API pública ────────────────────────────────────────────────────

const MAX_KEYTERMS = 50

/**
 * Construye una lista de keyterms para el endpoint STT de voice_stream.
 *
 * Combina terminos de codigo globales hardcodeados con el contexto de
 * la sesion (nombre de proyecto, rama git, archivos recientes) sin
 * ninguna llamada a modelo.
 */
export async function getVoiceKeyterms(
  recentFiles?: ReadonlySet<string>,
): Promise<string[]> {
  const terms = new Set<string>(GLOBAL_KEYTERMS)

  // El basename del root del proyecto como un solo termino — los
  // usuarios dicen "claude CLI internal" como una frase, no palabras
  // aisladas. Mantener el basename completo permite que el boosting de
  // keyterm del STT calce la frase sin importar el separador.
  try {
    const projectRoot = getProjectRoot()
    if (projectRoot) {
      const name = basename(projectRoot)
      if (name.length > 2 && name.length <= 50) {
        terms.add(name)
      }
    }
  } catch {
    // getProjectRoot() puede lanzar si no se ha inicializado aun — ignora
  }

  // Palabras de la rama git (p.ej. "feat/voice-keyterms" → "feat", "voice", "keyterms")
  try {
    const branch = await getBranch()
    if (branch) {
      for (const word of splitIdentifier(branch)) {
        terms.add(word)
      }
    }
  } catch {
    // getBranch() puede fallar si no se esta en un repo git — ignora
  }

  // Nombres de archivos recientes — solo escanea lo suficiente para
  // llenar los slots restantes
  if (recentFiles) {
    for (const filePath of recentFiles) {
      if (terms.size >= MAX_KEYTERMS) break
      for (const word of fileNameWords(filePath)) {
        terms.add(word)
      }
    }
  }

  return [...terms].slice(0, MAX_KEYTERMS)
}
