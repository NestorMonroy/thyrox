/**
 * El mapa flow -> hogar documental, como dato tipado (T-003).
 *
 * Origen: `analisis-hogar-documental-por-flow.rst` de la iniciativa
 * `mapear-hogar-documental-por-flow`. Ese analisis fija el catalogo por
 * FUNCION (no por nombre de archivo), medido contra la taxonomia de
 * `IACT-docs@8673e59: temp-backup/source-2026-04-28`; esta constante lo
 * promueve a codigo para que las definiciones de coordinador lo consuman en
 * vez de repetir la tabla en prosa muerta dentro de cada `*.prompt.md`.
 *
 * Espeja la FORMA de `src/paths/docs.ts`: el hogar no es «la cadena»
 * suelta, es la cadena mas la pregunta de si existe en el arbol
 * (`homesMissingFromTree`). Un hogar `source/…` que no exista es el defecto
 * que :ref:`h-docs-1021` registro — el prompt de RUP citaba una raiz de
 * implementacion que no existe en kaupamex; sus seis artefactos viven bajo
 * `source/gestion/pm/seguimiento/` y `source/arquitectura-tecnica/` por su
 * funcion.
 *
 * Los hogares son DIRECTORIOS bajo `source/` (el contenedor donde aterriza el
 * artefacto), nunca rutas literales `docs/source/…` ni globs: el skill declara
 * su flow y su funcion, y la ruta la construye la constante — igual que en
 * `docs.ts`.
 *
 * Los invariantes transversales (hallazgo, leccion, changelog, analisis,
 * decision) NO viven aqui: cada regla ya fija su hogar por-iniciativa
 * (`hallazgos-documentacion-obligatoria.md`, `memoria-episodica-fallos.md`,
 * `changelog-policy.md`, `registro-reportes-agentes.md`) y PREVALECEN sobre
 * este mapa. Esta constante gobierna solo el hogar de DISENO propio de cada
 * flow.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { docsRoot, resetDocsRootCache } from '../../paths/docs.ts'
import type { AgentDefinition } from './types.ts'

/** Los 14 valores canonicos de `:flow:` con hogar de diseno (DEC-R-01). */
export type Flow =
  | 'rup' | 'babok' | 'rm' | 'bpa' | 'sp' | 'cp' | 'dmaic' | 'lean'
  | 'pdca' | 'pps' | 'pm' | 'scrum' | 'kanban' | 'tdd'

/**
 * El mapa. Cada flow -> uno o mas DIRECTORIOS bajo `source/`, repo-relativos.
 *
 * `babok` es el valor canonico de `:flow:` (`metadata-standards.md`); el
 * coordinator se llama `ba-coordinator` — el mapa se indexa por el flow, no
 * por el nombre del agente.
 */
export const FLOW_HOMES: Readonly<Record<Flow, readonly string[]>> = {
  // RUP — el mas rico: UC + vistas 4+1 de Kruchten + ADR + TDD.
  rup: [
    'source/requisitos/casos-uso',
    'source/arquitectura-tecnica',
    'source/backend/adr',
    'source/frontend/adr',
    'source/quality',
  ],
  // BABOK — elicitacion, 6 knowledge areas, RTM.
  babok: [
    'source/requisitos/casos-uso',
    'source/requisitos/requisitos-funcionales',
    'source/requisitos/business-requirements',
    'source/requisitos/reglas-negocio',
  ],
  // Requirements Management — elicitacion, spec, validacion, cambios.
  rm: [
    'source/requisitos/requisitos-funcionales',
    'source/requisitos/requisitos-no-funcionales',
    'source/requisitos/historias-usuario',
  ],
  // Business Process Analysis — As-Is BPMN, To-Be (ESIA).
  bpa: [
    'source/base-cognitiva/bpm',
    'source/arquitectura-tecnica',
    'source/negocio',
  ],
  // Strategic Planning — PESTEL/SWOT, Balanced Scorecard, OKRs.
  sp: [
    'source/negocio',
    'source/gestion/pm',
  ],
  // Consulting Process — Issue Tree, MECE, Recommendation Deck.
  cp: [
    'source/gestion/pm',
  ],
  // DMAIC — Define/Measure/Analyze/Improve/Control.
  dmaic: [
    'source/gestion/pm',
    'source/quality',
    'source/risks-technical-debt',
  ],
  // Lean — value stream map, eliminacion de desperdicio.
  lean: [
    'source/negocio',
    'source/gestion/pm',
  ],
  // PDCA — Plan/Do/Check/Act.
  pdca: [
    'source/gestion/pm',
  ],
  // Practical Problem Solving — A3, 5 Whys.
  pps: [
    'source/gestion/pm',
  ],
  // PMBOK — charter, roadmap, sprint, matriz de prioridad.
  // El hogar NO es la raiz de implementacion inexistente (:ref:`h-docs-1021`):
  // esos seis artefactos viven bajo `source/gestion/pm/seguimiento/`.
  pm: [
    'source/gestion/pm',
    'source/gestion/pm/seguimiento',
  ],
  // Scrum — sprint backlog, board, retro.
  scrum: [
    'source/gestion/pm',
  ],
  // Kanban — flujo continuo, board.
  kanban: [
    'source/gestion/pm',
  ],
  // TDD — tests, cobertura.
  tdd: [
    'source/quality',
  ],
}

/** Todos los hogares declarados, sin repetir. */
export function allDeclaredHomes(): string[] {
  const vistos = new Set<string>()
  for (const homes of Object.values(FLOW_HOMES)) {
    for (const h of homes) vistos.add(h)
  }
  return [...vistos]
}

/**
 * La raiz del arbol NO se decide aqui.
 *
 * Este modulo traia una copia verbatim de `docsRoot` —variable propia mas
 * ascenso a `source/gestion/pm/`— que respondia la misma pregunta que
 * `src/paths/docs.ts`, que a su vez delega en el alcance. Dos copias de una
 * decision divergen sin avisar: un consumidor que declare la grafia canonica
 * `THYROX_REACH_DOCS` movia una y dejaba la otra midiendo el arbol de siempre,
 * y `homesMissingFromTree` publicaba cero hogares ausentes sobre un arbol que
 * el llamador no habia pedido.
 *
 * `resetDocsRootCache` se re-exporta porque es parte del contrato que los
 * consumidores de este modulo ya usaban; su implementacion es la del alcance.
 */
export { resetDocsRootCache }

/**
 * Los hogares declarados que NO existen como directorio en el arbol.
 *
 * Es el control que discrimina (`metrica-decide-la-conclusion.md` sub-patron
 * D): puede fallar. Si un flow declarara una raiz inexistente —el defecto de
 * :ref:`h-docs-1021`— esta funcion lo devuelve, y el test va rojo.
 */
export function homesMissingFromTree(root: string = docsRoot()): string[] {
  return allDeclaredHomes().filter((h) => !existsSync(join(root, h)))
}

/**
 * Los hogares que una definicion DECLARA, derivados de su `flow`.
 *
 * Es la mitad CONSUMIDORA del contrato de `docs.ts` llevada al agente: un
 * skill/coordinador declara su `flow` y el hogar lo construye `FLOW_HOMES`, no
 * lo teclea. Una definicion sin `flow` no declara hogar de diseno — devuelve
 * `[]`, y eso no es un defecto: los diez coordinadores en prosa aun no lo
 * declaran (ese porte es T-007 / board #51), asi que T-006 no valida su hogar
 * citado en prosa. Ese hueco esta declarado, no oculto.
 */
export function declaredHomes(def: Pick<AgentDefinition, 'flow'>): readonly string[] {
  return def.flow ? FLOW_HOMES[def.flow] : []
}

/**
 * Las definiciones cuyo hogar declarado NO existe en el arbol — el gate
 * DMAIC-control de T-006 (:ref:`h-docs-1021`).
 *
 * Valida a los CONSUMIDORES (las definiciones de agente), no el `.md` emitido:
 * el defecto de :ref:`h-docs-1021` era una raiz `source/…` inexistente citada
 * por una definicion de coordinador, y el `.md` es una proyeccion de ella. Si
 * se validara la emision se mediria el sintoma; validar la definicion mide la
 * causa.
 *
 * Reusa la resolucion de `docsRoot` (via el parametro por defecto) y
 * `existsSync`, la misma vara que `homesMissingFromTree`; no duplica ninguna.
 * Es un control que puede fallar (`metrica-decide-la-conclusion.md` sub-patron
 * D): si una definicion declarara un `flow` cuyo hogar el arbol no tiene, la
 * devuelve con el nombre de la definicion y las rutas ausentes, y el test va
 * rojo.
 */
export function definitionsWithMissingHomes(
  defs: readonly Pick<AgentDefinition, 'name' | 'flow'>[],
  root: string = docsRoot(),
): { name: string; missing: string[] }[] {
  const problemas: { name: string; missing: string[] }[] = []
  for (const def of defs) {
    const missing = declaredHomes(def).filter((h) => !existsSync(join(root, h)))
    if (missing.length > 0) problemas.push({ name: def.name, missing })
  }
  return problemas
}

/**
 * Renderiza el bloque «Hogar de diseno» que un coordinador APENDE a su prompt.
 *
 * Es la vía por la que la definicion CONSUME el primitivo: en vez de repetir
 * el mapa flow -> hogar como tabla en prosa dentro del `*.prompt.md` (la
 * segunda fuente de verdad que `calibration-verified-numbers.md` prohibe), el
 * coordinador declara su `flow` y el emisor pega este bloque, derivado de
 * `FLOW_HOMES`. Si el mapa cambia, el bloque cambia con el siguiente `emit`;
 * no hay copia manual que sincronizar.
 *
 * El marcador HTML lo hace greppable y avisa al lector que no lo edite a mano
 * — un `emit --check` reescribe el bloque desde la constante.
 */
export function renderFlowHomes(flow: Flow): string {
  const lineas = FLOW_HOMES[flow].map((h) => `- \`${h}\``).join('\n')
  return [
    '',
    `<!-- generado desde FLOW_HOMES.${flow} — no editar a mano -->`,
    '',
    '## Hogar de diseno',
    '',
    `Este flow (\`${flow}\`) deposita su diseno en estos directorios de`,
    '`source/`, derivados de `FLOW_HOMES` (no editar a mano):',
    '',
    lineas,
    '',
    'Los invariantes transversales (hallazgo, leccion, changelog, analisis,',
    'decision) NO se listan aqui: cada regla fija su hogar por-iniciativa y',
    'PREVALECE sobre este mapa, que gobierna solo el hogar de diseno del flow.',
    '',
  ].join('\n')
}
