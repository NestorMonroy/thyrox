/**
 * Porte fiel de `ccnmt: packages/permission/src/dangerousPatterns.ts`
 * (81 líneas, 2 exports, licencia UNLICENSED — reimplementación, no
 * copia). Porte COMPLETO: las dos listas de datos (`CROSS_PLATFORM_CODE_EXEC`,
 * `DANGEROUS_BASH_PATTERNS`) están presentes, verbatim.
 *
 * Listas de prefijos de regla `allow` peligrosos para herramientas de
 * shell. Una regla `allow` como `Bash(python:*)` deja al modelo ejecutar
 * código arbitrario vía ese intérprete, evadiendo el clasificador de modo
 * automático. Estas listas alimentan los predicados
 * `isDangerous{Bash,PowerShell}Permission` en `permissionSetup.ts` (no
 * portado en este árbol), que despojan esas reglas al entrar a modo
 * automático — hoy sin consumidor propio en este paquete, pero es dato
 * puro, de valor de seguridad, y zero-dependencia: se porta para cuando
 * el consumidor exista.
 *
 * Divergencia medida: la fuente importa `readEnv` de
 * `@claude-code-how-works/config/env` y nunca lo usa —
 * `grep -n "readEnv(" dangerousPatterns.ts` da 0 resultados sobre el
 * import de la línea 17 (el bloque `ant` usa `process.env.USER_TYPE`
 * directo, no `readEnv`). Import muerto en la propia fuente; se omite
 * aquí sin pérdida de comportamiento — mismo patrón que el `readEnv`
 * muerto de `PermissionMode.ts` (ver su docstring).
 */

/**
 * Puntos de entrada de ejecución de código multiplataforma, presentes
 * tanto en Unix como en Windows. Compartida para que las dos listas no
 * diverjan al añadir un intérprete.
 */
export const CROSS_PLATFORM_CODE_EXEC = [
  // Intérpretes
  'python',
  'python3',
  'python2',
  'node',
  'deno',
  'tsx',
  'ruby',
  'perl',
  'php',
  'lua',
  // Corredores de paquetes
  'npx',
  'bunx',
  'npm run',
  'yarn run',
  'pnpm run',
  'bun run',
  // Shells alcanzables desde ambos (Git Bash / WSL en Windows, nativo en Unix)
  'bash',
  'sh',
  // Envoltorio de comando remoto arbitrario (OpenSSH nativo en Win10+)
  'ssh',
] as const

export const DANGEROUS_BASH_PATTERNS: readonly string[] = [
  ...CROSS_PLATFORM_CODE_EXEC,
  'zsh',
  'fish',
  'eval',
  'exec',
  'env',
  'xargs',
  'sudo',
  // Uso interno de Anthropic: herramientas exclusivas de "ant" más
  // herramientas generales que los datos del sandbox de ant muestran como
  // comúnmente sobre-permitidas por prefijo. Se quedan exclusivas de
  // "ant" — los usuarios externos no tienen `coo`, y el resto es una
  // decisión de riesgo empírico fundada en datos del sandbox de ant, no
  // un juicio universal de "esta herramienta es insegura".
  ...(process.env.USER_TYPE === 'ant'
    ? [
        'fa run',
        // Lanzador de código en el cluster — código arbitrario en el cluster
        'coo',
        // Red/exfiltración: gh gist create --public, gh api HTTP arbitrario,
        // curl/wget POST. gh api necesita su propia entrada — el matcher es
        // de forma exacta, no de prefijo, así que el patrón 'gh' solo no
        // atrapa la regla 'gh api:*' (misma razón por la que 'npm run' está
        // separado de 'npm').
        'gh',
        'gh api',
        'curl',
        'wget',
        // git config core.sshCommand / instalar hooks = código arbitrario
        'git',
        // Escrituras de recursos en la nube (buckets s3 públicos, mutaciones k8s)
        'kubectl',
        'aws',
        'gcloud',
        'gsutil',
      ]
    : []),
]
