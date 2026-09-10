/**
 * Los nombres con que se identifica el útil de agente, y los tipos que
 * cierran en una sola vuelta.
 *
 * Procedencia: `ccnmt: packages/tool-registry/src/tools/AgentTool/
 * constants.ts` (4 símbolos exportados). Ese árbol declara
 * `"license": "UNLICENSED"`, así que el cuerpo se **reimplementa** y no se
 * copia.
 *
 * Vive aparte del útil, y no por costumbre: quien sólo necesita el nombre
 * —una regla de permiso, un hook, el útil de TodoWrite— no arrastra el
 * agente entero. Es el mismo motivo que declara `FileEditTool/constants.ts`
 * en su primera línea.
 *
 * DIVERGENCIA DECLARADA: ninguna.
 */

/** El nombre con que el útil viaja en el protocolo. */
export const AGENT_TOOL_NAME = 'Agent'

/**
 * El nombre anterior, que NO se retira.
 *
 * Lo siguen citando reglas de permiso escritas antes del renombre, hooks
 * cableados por nombre, y sesiones reanudadas cuyo transcript lo lleva
 * grabado. Retirarlo rompería las tres a la vez, y el fallo aparecería como
 * un útil que deja de tener permiso sin que nadie tocara los permisos.
 */
export const LEGACY_AGENT_TOOL_NAME = 'Task'

/** El tipo de agente que emite el veredicto de verificación. */
export const VERIFICATION_AGENT_TYPE = 'verification'

/**
 * Los agentes de serie que corren una vez y devuelven un informe.
 *
 * Quien los lanza nunca les manda un segundo mensaje para continuarlos, así
 * que el remolque de identificador, canal de vuelta y consumo es texto que
 * nadie usa — se omite para ellos.
 *
 * Es un conjunto y no un arreglo porque el consumidor pregunta por
 * pertenencia en cada vuelta.
 */
export const ONE_SHOT_BUILTIN_AGENT_TYPES: ReadonlySet<string> = new Set([
  'Explore',
  'Plan',
])
