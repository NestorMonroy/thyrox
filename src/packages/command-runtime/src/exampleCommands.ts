/**
 * Porte fiel de `ccnmt: packages/command-runtime/src/exampleCommands.ts`
 * (paquete `command-runtime`, licencia UNLICENSED — reimplementación, no
 * copia). Porte COMPLETO de la lógica; las siete dependencias cruzadas de
 * paquete (`app-host`, `config` ×2, `shell`, `storage`, `local-observability`,
 * `provider`) pasan por `internal/pendingCrossPackageDeps.ts` — este
 * paquete no tiene todavía `node_modules/@thyrox/*` (ver el docstring de
 * ese archivo), así que un `import` estático de cualquiera de ellas
 * haría fallar la carga del módulo entero.
 *
 * `provider/user.js:getGitEmail` es el único de los siete que puede
 * resolver YA hoy si el porte de `@thyrox/provider` en esta misma tarea
 * llega a `user.ts` antes de que se llame esta función — los demás
 * (`app-host`, `shell`, `local-observability`) sí existen con esos
 * símbolos reales; `config` (`getCurrentProjectConfig`/`env`) y `storage`
 * (`getIsGit`/`gitExe`) son paquetes fuera del alcance de esta tarea con
 * porte parcial declarado, así que esos dos envoltorios fallan al
 * llamarse hasta que esos paquetes los porten (ver el docstring de
 * `pendingCrossPackageDeps.ts`).
 *
 * Segunda divergencia declarada: la fuente importa `memoize`/`sample` de
 * `lodash-es`, paquete npm que `command-runtime` no tiene instalado
 * (mismo problema de resolución que los `@thyrox/*` de arriba, sin
 * `bun install` disponible en esta tarea). Se sustituyen por
 * `./internal/lodashCompat.ts`, una reimplementación mínima de esos dos
 * utilitarios (no un porte — ver su propio docstring).
 */
import { memoize, sample } from './internal/lodashCompat.js'
import {
  requireAppHostCwd,
  requireConfigEnv,
  requireConfigProjectConfig,
  requireLocalObservabilityLogging,
  requireProviderUser,
  requireShellExecFileNoThrow,
  requireStorageGit,
} from './internal/pendingCrossPackageDeps.js'

// Patrones que marcan un archivo como no-core (auto-generado, dependencia
// o config). Filtran las sugerencias de nombre de archivo de ejemplo de
// forma determinista, sin invocar un modelo.
const NON_CORE_PATTERNS = [
  // manifiestos de lock / dependencias
  /(?:^|\/)(?:package-lock\.json|yarn\.lock|bun\.lock|bun\.lockb|pnpm-lock\.yaml|Pipfile\.lock|poetry\.lock|Cargo\.lock|Gemfile\.lock|go\.sum|composer\.lock|uv\.lock)$/,
  // artefactos generados / de build
  /\.generated\./,
  /(?:^|\/)(?:dist|build|out|target|node_modules|\.next|__pycache__)\//,
  /\.(?:min\.js|min\.css|map|pyc|pyo)$/,
  // extensiones de datos / docs / config (no son material de "escribir un test para")
  /\.(?:json|ya?ml|toml|xml|ini|cfg|conf|env|lock|txt|md|mdx|rst|csv|log|svg)$/i,
  // configuración / metadata
  /(?:^|\/)\.?(?:eslintrc|prettierrc|babelrc|editorconfig|gitignore|gitattributes|dockerignore|npmrc)/,
  /(?:^|\/)(?:tsconfig|jsconfig|biome|vitest\.config|jest\.config|webpack\.config|vite\.config|rollup\.config)\.[a-z]+$/,
  /(?:^|\/)\.(?:github|vscode|idea|claude)\//,
  // docs / changelogs (no son material de "cómo funciona X")
  /(?:^|\/)(?:CHANGELOG|LICENSE|CONTRIBUTING|CODEOWNERS|README)(?:\.[a-z]+)?$/i,
]

function isCoreFile(path: string): boolean {
  return !NON_CORE_PATTERNS.some(p => p.test(path))
}

/**
 * Cuenta ocurrencias de los items de un array y devuelve los N más
 * frecuentes, ordenados descendente, formateados como texto.
 */
export function countAndSortItems(items: string[], topN: number = 20): string {
  const counts = new Map<string, number>()
  for (const item of items) {
    counts.set(item, (counts.get(item) || 0) + 1)
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([item, count]) => `${count.toString().padStart(6)} ${item}`)
    .join('\n')
}

/**
 * Elige hasta `want` nombres base de una lista de rutas ordenada por
 * frecuencia, saltando archivos no-core y repartiendo entre directorios
 * distintos. Devuelve un array vacío si hay menos de `want` archivos core.
 */
export function pickDiverseCoreFiles(
  sortedPaths: string[],
  want: number,
): string[] {
  const picked: string[] = []
  const seenBasenames = new Set<string>()
  const dirTally = new Map<string, number>()

  // Voraz: cada pasada permite +1 archivo por directorio. Evita que el
  // top-5 colapse en una sola carpeta activa, dejando igual que una
  // carpeta dominante aporte varios archivos si el repo es angosto.
  for (let cap = 1; picked.length < want && cap <= want; cap++) {
    for (const p of sortedPaths) {
      if (picked.length >= want) break
      if (!isCoreFile(p)) continue
      const lastSep = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
      const base = lastSep >= 0 ? p.slice(lastSep + 1) : p
      if (!base || seenBasenames.has(base)) continue
      const dir = lastSep >= 0 ? p.slice(0, lastSep) : '.'
      if ((dirTally.get(dir) ?? 0) >= cap) continue
      picked.push(base)
      seenBasenames.add(base)
      dirTally.set(dir, (dirTally.get(dir) ?? 0) + 1)
    }
  }

  return picked.length >= want ? picked : []
}

async function getFrequentlyModifiedFiles(): Promise<string[]> {
  if (process.env.NODE_ENV === 'test') return []
  const { env } = requireConfigEnv()
  if (env.platform === 'win32') return []
  const { getIsGit, gitExe } = requireStorageGit()
  if (!(await getIsGit())) return []

  try {
    // Junta los archivos modificados con más frecuencia, priorizando los
    // commits propios del usuario.
    const { getGitEmail } = requireProviderUser()
    const userEmail = await getGitEmail()

    const logArgs = [
      'log',
      '-n',
      '1000',
      '--pretty=format:',
      '--name-only',
      '--diff-filter=M',
    ]

    const counts = new Map<string, number>()
    const tallyInto = (stdout: string) => {
      for (const line of stdout.split('\n')) {
        const f = line.trim()
        if (f) counts.set(f, (counts.get(f) ?? 0) + 1)
      }
    }

    const { execFileNoThrowWithCwd } = requireShellExecFileNoThrow()
    const { getCwd } = requireAppHostCwd()

    if (userEmail) {
      const { stdout } = await execFileNoThrowWithCwd(
        'git',
        [...logArgs, `--author=${userEmail}`],
        { cwd: getCwd() },
      )
      tallyInto(stdout)
    }

    // Si el historial propio es escaso, cae a todos los autores.
    if (counts.size < 10) {
      const { stdout } = await execFileNoThrowWithCwd(gitExe(), logArgs, {
        cwd: getCwd(),
      })
      tallyInto(stdout)
    }

    const sorted = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([p]) => p)

    return pickDiverseCoreFiles(sorted, 5)
  } catch (err) {
    requireLocalObservabilityLogging().logError(err as Error)
    return []
  }
}

const ONE_WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000

export const getExampleCommandFromCache = memoize(() => {
  const { getCurrentProjectConfig } = requireConfigProjectConfig()
  const projectConfig = getCurrentProjectConfig()
  const frequentFile = projectConfig.exampleFiles?.length
    ? sample(projectConfig.exampleFiles)
    : '<filepath>'

  const commands = [
    'fix lint errors',
    'fix typecheck errors',
    `how does ${frequentFile} work?`,
    `refactor ${frequentFile}`,
    'how do I log an error?',
    `edit ${frequentFile} to...`,
    `write a test for ${frequentFile}`,
    'create a util logging.py that...',
  ]

  return `Try "${sample(commands)}"`
})

export const refreshExampleCommands = memoize(async (): Promise<void> => {
  const { getCurrentProjectConfig, saveCurrentProjectConfig } = requireConfigProjectConfig()
  const projectConfig = getCurrentProjectConfig()
  const now = Date.now()
  const lastGenerated = projectConfig.exampleFilesGeneratedAt ?? 0

  // Regenera los ejemplos si tienen más de una semana
  if (now - lastGenerated > ONE_WEEK_IN_MS) {
    projectConfig.exampleFiles = []
  }

  // Si no hay archivos de ejemplo cacheados, dispara la búsqueda en segundo plano
  if (!projectConfig.exampleFiles?.length) {
    void getFrequentlyModifiedFiles().then(files => {
      if (files.length) {
        saveCurrentProjectConfig(current => ({
          ...current,
          exampleFiles: files,
          exampleFilesGeneratedAt: Date.now(),
        }))
      }
    })
  }
})
