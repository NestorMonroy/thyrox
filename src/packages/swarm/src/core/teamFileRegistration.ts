/**
 * El alta de un compañero en el archivo de equipo, y la reconstrucción del
 * archivo cuando desapareció.
 *
 * Procedencia: `ccnmt: packages/swarm/src/core/teamFileRegistration.ts`
 * (109 líneas, 3 símbolos exportados). Ese árbol declara `"license":
 * "UNLICENSED"`, así que el cuerpo se **reimplementa** y no se copia.
 *
 * EL SÍNTOMA CONTRA EL QUE PROTEGE. La creación del equipo escribe su archivo
 * y deja el contexto en memoria; para cuando una llamada posterior lanza un
 * compañero, el archivo puede haberse ido —limpieza de disco, una carrera
 * entre llamadas de herramienta, una escritura a medias—. La conducta anterior
 * era lanzar «el equipo no existe, créalo primero», y eso arrastraba al modelo
 * a un bucle: crear el equipo → «ya diriges ese equipo» → crear el equipo.
 *
 * LA RECUPERACIÓN ES ESTRECHA A PROPÓSITO: sólo dispara cuando el contexto en
 * memoria nombra EL MISMO equipo que se pidió. Pasar el nombre equivocado es
 * un defecto de quien llama y sigue lanzando — reconstruir ahí escondería el
 * defecto tras un archivo nuevo.
 *
 * QUÉ SE PIERDE AL RECONSTRUIR: lo que sólo vive en el archivo —descripción,
 * fecha de creación, y por miembro el modelo, el prompt, el color, el modo
 * plan y el tipo de respaldo—. Sobrevive lo que decide el ENRUTADO:
 * identificador, nombre, directorio y panel. Es la diferencia entre un equipo
 * que sigue funcionando y uno que no.
 *
 * DIVERGENCIA DECLARADA: ninguna.
 */
import { getSessionId, logForDebugging } from '../adapters/appRuntime.js'
import {
  readTeamFileAsync,
  type TeamFile,
  updateTeamFileAsync,
} from './teamHelpers.js'

/**
 * La parte del estado de la aplicación que este módulo lee.
 *
 * Se declara aquí y no se toma del anfitrión porque la forma del contexto de
 * equipo es de swarm: el anfitrión sólo lo transporta.
 */
export type TeamContextSnapshot = {
  teamContext?: {
    teamName?: string
    leadAgentId?: string
    teammates: Record<
      string,
      {
        name: string
        agentType?: string
        spawnedAt: number
        tmuxPaneId: string
        cwd: string
      }
    >
  }
}

/**
 * Devuelve el archivo del equipo, reconstruyéndolo desde la instantánea en
 * memoria si falta.
 */
export async function ensureTeamFileFromSnapshot(
  teamName: string,
  snapshot: TeamContextSnapshot,
): Promise<TeamFile> {
  const existing = await readTeamFileAsync(teamName)
  if (existing) return existing

  // La reconstrucción va DENTRO de la actualización con cerrojo: entre
  // comprobar que falta y escribirlo cabe otro escritor, y `current ??` deja
  // ganar al que llegó primero.
  //
  // SEGUNDA DEFENSA, HOY INALCANZABLE DESDE EL TEST. El atajo de arriba se
  // adelanta siempre que el archivo esté, así que `current ??` sólo actúa en
  // la carrera. Medido con anulación: retirar el atajo hace caer un caso;
  // retirar este `??` no hace caer ninguno. Un control así no separa «la
  // defensa está» de «el test no pregunta», y por eso se declara en vez de
  // contarse. Sucesor: TASK-THYROX-0002.
  const ensured = await updateTeamFileAsync(
    teamName,
    current => current ?? rebuildTeamFileFromSnapshot(teamName, snapshot),
  )
  if (!ensured) {
    throw new Error(
      `Team "${teamName}" does not exist. Call TeamCreate first to create the team.`,
    )
  }
  return ensured
}

/**
 * Da de alta a un compañero, reconstruyendo el archivo si hiciera falta.
 *
 * Se purga primero cualquier fila con el mismo identificador: un reintento de
 * arranque vuelve a registrar, y dos filas del mismo agente dejarían al
 * enrutado eligiendo una al azar.
 */
export async function registerTeammateInTeamFile(
  teamName: string,
  snapshot: TeamContextSnapshot,
  member: TeamFile['members'][number],
): Promise<void> {
  await updateTeamFileAsync(teamName, teamFile => {
    const current = teamFile ?? rebuildTeamFileFromSnapshot(teamName, snapshot)
    const members = current.members.filter(m => m.agentId !== member.agentId)
    return { ...current, members: [...members, member] }
  })
}

function rebuildTeamFileFromSnapshot(
  teamName: string,
  snapshot: TeamContextSnapshot,
): TeamFile {
  const ctx = snapshot.teamContext
  if (!ctx || ctx.teamName !== teamName || !ctx.leadAgentId) {
    throw new Error(
      `Team "${teamName}" does not exist. Call TeamCreate first to create the team.`,
    )
  }

  logForDebugging(
    `[spawn] team file missing for "${teamName}", reconstructing from teamContext (${Object.keys(ctx.teammates).length} in-memory members)`,
  )

  const members: TeamFile['members'] = Object.entries(ctx.teammates).map(
    ([agentId, t]) => ({
      agentId,
      name: t.name,
      agentType: t.agentType,
      joinedAt: t.spawnedAt,
      tmuxPaneId: t.tmuxPaneId,
      cwd: t.cwd,
      subscriptions: [],
    }),
  )

  return {
    name: teamName,
    createdAt: Date.now(),
    leadAgentId: ctx.leadAgentId,
    leadSessionId: getSessionId(),
    members,
  }
}
