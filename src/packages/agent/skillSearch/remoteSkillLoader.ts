/**
 * Porte COMPLETO de `ccnmt: packages/agent/skillSearch/remoteSkillLoader.ts`.
 *
 * La fuente misma es un stub auto-generado: `loadRemoteSkill` siempre
 * resuelve con un resultado vacío (`cacheHit: false`, sin contenido), sin
 * lógica real de carga remota detrás. El porte lo refleja tal cual.
 */
export function loadRemoteSkill(
  _slug: string,
  _url: string,
): Promise<{
  cacheHit: boolean
  latencyMs: number
  skillPath: string
  content: string
  fileCount?: number
  totalBytes?: number
  fetchMethod?: string
}> {
  return Promise.resolve({
    cacheHit: false,
    latencyMs: 0,
    skillPath: '',
    content: '',
  })
}
