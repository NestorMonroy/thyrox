/**
 * El roster de un equipo, traducido a lo que la interfaz necesita mostrar.
 *
 * Procedencia: `ccnmt: packages/swarm/src/teamDiscovery.ts` (80 líneas, 3
 * símbolos exportados). Ese árbol declara `"license": "UNLICENSED"`, así que
 * el cuerpo se **reimplementa** y no se copia.
 *
 * IMPORTA DEL BARRIL, no de `core/teamHelpers` directamente. Se conserva así
 * porque es lo que la fuente hace, y porque convierte al barril en superficie
 * medida: si el barril deja de reexportar algo, este módulo se rompe y su
 * suite lo dice.
 *
 * DIVERGENCIA DECLARADA: ninguna.
 */
import { isPaneBackend, readTeamFile, type PaneBackendType } from './index.js'

/** El resumen de un equipo, para una vista de lista. */
export type TeamSummary = {
  name: string
  memberCount: number
  runningCount: number
  idleCount: number
}

/** El estado de un compañero, tal como la interfaz lo pinta. */
export type TeammateStatus = {
  name: string
  agentId: string
  agentType?: string
  model?: string
  prompt?: string
  status: 'running' | 'idle' | 'unknown'
  color?: string
  /** Marca de tiempo ISO de la notificación de ociosidad. */
  idleSince?: string
  tmuxPaneId: string
  cwd: string
  worktreePath?: string
  /** Si su panel está oculto de la vista de swarm. */
  isHidden?: boolean
  backendType?: PaneBackendType
  mode?: string
}

/**
 * El estado de cada compañero de un equipo.
 *
 * Un equipo que no existe da una lista vacía y no un fallo: la interfaz
 * pregunta por equipos que pueden haberse cerrado mientras la miraban.
 */
export function getTeammateStatuses(teamName: string): TeammateStatus[] {
  const teamFile = readTeamFile(teamName)
  if (!teamFile) return []

  const hiddenPaneIds = new Set(teamFile.hiddenPaneIds ?? [])
  const statuses: TeammateStatus[] = []

  for (const member of teamFile.members) {
    // El líder es quien mira esta lista: incluirse entre sus propios
    // compañeros descuadra todo conteo que la interfaz haga con ella.
    if (member.name === 'team-lead') continue

    // La bandera la escribe el propio compañero al quedarse ocioso, así que
    // uno recién dado de alta todavía no la tiene. Leer su ausencia como
    // «ocioso» mostraría inactivo a quien acaba de arrancar.
    const isActive = member.isActive !== false
    const status: 'running' | 'idle' = isActive ? 'running' : 'idle'

    statuses.push({
      name: member.name,
      agentId: member.agentId,
      agentType: member.agentType,
      model: member.model,
      prompt: member.prompt,
      status,
      color: member.color,
      tmuxPaneId: member.tmuxPaneId,
      cwd: member.cwd,
      worktreePath: member.worktreePath,
      isHidden: hiddenPaneIds.has(member.tmuxPaneId),
      // El campo describe QUÉ PANEL usa. Un compañero en proceso no tiene
      // panel propio, así que dejar ahí su tipo invitaría a la interfaz a
      // ofrecer acciones de panel que no existen.
      backendType:
        member.backendType && isPaneBackend(member.backendType)
          ? member.backendType
          : undefined,
      mode: member.mode,
    })
  }

  return statuses
}
