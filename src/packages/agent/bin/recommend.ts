#!/usr/bin/env bun
/**
 * La puerta al recomendador: qué modelo y qué esfuerzo para una clase de tarea.
 *
 * El problema que cierra. `cost/policy.ts` cruza los dos ejes —los 19 registros
 * del catálogo contra los cinco niveles de esfuerzo— y publica sus exclusiones
 * con razón. Estaba probado y era **inalcanzable desde donde se despacha**: el
 * CLI de Python expone `costo`, `ficha`, `por-modelo` y `sesion`, ninguno
 * recomienda. Es la capacidad muerta que `flow-selection-agile.md` describe, y
 * su coste está medido: se despachó un agente en `claude-opus-5` donde
 * `claude-fable-5-1` dominaba en los dos ejes —0.79× por turno y rango 5 contra
 * 4— porque el operador no tenía cómo preguntar.
 *
 * Por qué el contexto es un parámetro y no una constante: el orden cambia con
 * él. El término que domina es la caché leída, y su peso lo fija el tier de
 * cada modelo; con contextos chicos la ventaja se estrecha.
 *
 * Salidas: 0 con recomendación · 2 si ningún modelo cumple el perfil, con los
 * excluidos y su razón — nunca una recomendación por defecto, que sería elegir
 * sin medir.
 */
import { recommend, TASK_KINDS, type TaskKind } from '../cost/policy.ts'

/** El piso siempre-cargado de una sesión multi-repo, medido (H-DOCS-99). */
const SUBAGENT_FLOOR_TOKENS = 126_029

function usage(): string {
  return [
    'uso: bun run bin/recommend.ts <clase> [--context N] [--json]',
    '',
    `  clase     ${TASK_KINDS.join(' | ')}`,
    `  --context tokens releídos por turno (por defecto ${SUBAGENT_FLOOR_TOKENS},`,
    '            el piso siempre-cargado; súbelo con lo que el agente vaya a leer)',
    '  --json    la recomendación completa, para consumo por otro guion',
  ].join('\n')
}

function main(argv: string[]): number {
  const kind = argv.find((a) => !a.startsWith('-')) as TaskKind | undefined
  if (!kind || argv.includes('-h') || argv.includes('--help')) {
    console.log(usage())
    return kind ? 0 : 2
  }
  if (!TASK_KINDS.includes(kind)) {
    console.error(`recommend: «${kind}» no es una clase. NO se emite una `
      + `recomendación por defecto: elegir sin medir es el defecto que este `
      + `guion existe para cerrar.\n\n${usage()}`)
    return 2
  }
  const at = argv.indexOf('--context')
  const contextTokens = at >= 0 ? Number(argv[at + 1]) : SUBAGENT_FLOOR_TOKENS
  if (!Number.isFinite(contextTokens) || contextTokens <= 0) {
    console.error('recommend: --context exige un entero positivo de tokens.')
    return 2
  }

  let result
  try {
    result = recommend(kind, { contextTokens })
  } catch (error) {
    console.error(`recommend: ${(error as Error).message}`)
    return 2
  }

  if (argv.includes('--json')) {
    console.log(JSON.stringify(result, null, 2))
    return 0
  }

  const equiv = (n: number) => `${Math.round(n / 1000)}k`
  console.log(`  clase ${kind} · esfuerzo ${result.effort}`
    + `${result.effortIndex === null ? '' : ` (índice ${result.effortIndex})`}`
    + ` · contexto ${contextTokens.toLocaleString('es')} tokens`)
  console.log(`  vara: equivalentes de ${result.unitModel}\n`)
  for (const [i, c] of result.ranked.entries()) {
    console.log(`  ${i === 0 ? '→' : ' '} ${c.model.padEnd(22)}`
      + ` ${equiv(c.equivPerTurn).padStart(7)}/turno`)
  }
  console.log(`\n  ${result.ranked.length} candidato(s) · ${result.excluded.length}`
    + ` excluido(s) con razón (alcance medido: el catálogo completo)`)
  for (const e of result.excluded) {
    console.log(`      ${String(e.model).padEnd(22)} ${e.why}`)
  }
  return 0
}

process.exit(main(process.argv.slice(2)))
