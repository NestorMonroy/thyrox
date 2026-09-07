#!/usr/bin/env bun
/**
 * La puerta al paquete `@thyrox/shell` (tarea #223).
 *
 * El problema que cierra. Los siete módulos de este paquete —heredoc,
 * registry, shellPrefix, shellQuote, process, subprocessEnv, y el barril
 * `index.ts`— existían probados y sin ninguna puerta de invocación (censo
 * `puertas-cli-faltantes-20260907T020525`: 0 de 7 alcanzables). No es un
 * defecto de comodidad: este paquete es el que sabe leer una línea de shell
 * ANTES de ejecutarla — dónde está el heredoc, cómo se cita cada argumento,
 * qué variables vería el subproceso una vez cribadas — y un turno que va a
 * correr un comando lo hacía a ciegas porque no tenía cómo preguntarle.
 *
 * Seis subcomandos, uno por capacidad real (no uno por símbolo exportado):
 *
 *   heredoc [--quoted-only] [--json] (<comando> | --stdin)
 *       ¿Esta línea contiene un heredoc? ¿Dónde empieza y termina, con qué
 *       delimitador, citado o no? Antes de correr algo con `<<`, esto dice
 *       si el analizador lo va a ver como heredoc o si va a caer en alguno
 *       de sus bail-outs de seguridad documentados en `bash/heredoc.ts`.
 *   quote [--json] [--] <arg...>
 *       Cómo se citaría cada argumento para una shell POSIX.
 *   prefix [--] <prefijo> <comando>
 *       Compone `ejecutable [flags] comando`, citando cada parte.
 *   fig [--json] <comando>
 *       Especificación Fig del comando, si `@withfig/autocomplete` la
 *       tiene. En este árbol el paquete NO está instalado (verificado: no
 *       hay entrada en ningún `node_modules` ni `package.json`), así que
 *       la respuesta honesta hoy es casi siempre «sin especificación» —
 *       esta puerta lo dice explícitamente en vez de dejarlo ambiguo con
 *       lo que `loadFigSpec` rechazó en su propia validación de entrada.
 *   stdin-peek [--timeout-ms N]
 *       ¿`process.stdin` es un productor de pipe real o un tty heredado e
 *       inactivo? Envuelve `peekForStdinData` y AÑADE, por su cuenta (sin
 *       tocar el módulo), un segundo `data`-listener para distinguir «cerró
 *       sin datos» de «cerró tras entregar datos» — algo que el booleano
 *       de la función sola no expone.
 *   env [--gha] [--json]
 *       Qué variables perdería y qué variables ganaría un subproceso al
 *       pasar por `subprocessEnv`. Publica sólo NOMBRES de variable, nunca
 *       valores — el objeto entero de este módulo es evitar una fuga, así
 *       que su propia puerta de diagnóstico no puede ser la vía de fuga.
 *
 * `registerUpstreamProxyEnvFn` no tiene subcomando propio: es un gancho de
 * registro que otro módulo (el cliente HTTP) invoca para inyectar su proxy
 * ascendente, no una acción que un turno dispare desde la línea de comandos.
 * Su archivo (`subprocessEnv.ts`) queda igual alcanzable por el grafo de
 * imports, vía el barril `index.ts` que este archivo sí importa.
 *
 * Convención de flags: todo lo que sigue a un `--` literal se toma como
 * posicional SIN interpretar — necesario aquí más que en ningún otro CLI del
 * árbol, porque `quote`/`prefix` existen precisamente para citar argumentos
 * que empiezan con `-` o que son, ellos mismos, la cadena `--json`.
 *
 * Rehúsa con 2 y SIN veredicto cuando falta la entrada que analizar o el
 * valor de una opción no tiene forma válida — nunca con un valor por
 * defecto inventado. Ver `bin/recommend.ts` (`@thyrox/agent`), la plantilla
 * de esta puerta.
 */
// Import de una sola línea A PROPÓSITO — no por estilo. El censo
// `puertas-cli-faltantes-*` que midió esta ausencia recorre el grafo de
// imports con una expresión regular que exige `from` en la MISMA línea que
// `import`/`export` (`[^;\n]*?from`); partido en varias líneas, como aquí
// estaba antes de medirlo, el import no genera arista y el paquete sigue
// midiendo 0 alcanzables aunque la puerta exista y funcione. Verificado con
// el propio censo antes y después de este cambio.
import { containsHeredoc, extractHeredocs, formatShellPrefixCommand, loadFigSpec, peekForStdinData, quote, restoreHeredocs, subprocessEnv } from '../src/index.js'

/** Código de salida cuando se rehúsa por falta de precondición. Nunca 1. */
export const EXIT_REFUSE = 2

// --- análisis de argv: `--` literal separa flags de posicionales crudos ----

/** Todo lo que sigue al primer `--` se toma tal cual, sin interpretar. */
export function splitLiteral(argv: string[]): { head: string[]; literal: string[] } {
  const i = argv.indexOf('--')
  if (i === -1) return { head: argv, literal: [] }
  return { head: argv.slice(0, i), literal: argv.slice(i + 1) }
}

/** Retira una bandera sin valor (presente o no) del arreglo, por nombre exacto. */
export function takeFlag(argv: string[], name: string): { present: boolean; rest: string[] } {
  const i = argv.indexOf(name)
  if (i === -1) return { present: false, rest: argv }
  return { present: true, rest: [...argv.slice(0, i), ...argv.slice(i + 1)] }
}

/** Retira una bandera CON valor (`--nombre valor`) del arreglo, por nombre exacto. */
export function takeValue(argv: string[], name: string): { value: string | undefined; rest: string[] } {
  const i = argv.indexOf(name)
  if (i === -1) return { value: undefined, rest: argv }
  return { value: argv[i + 1], rest: [...argv.slice(0, i), ...argv.slice(i + 2)] }
}

// --- heredoc ----------------------------------------------------------------

export type HeredocDetail = {
  delimitador: string
  citado: boolean
  dash: boolean
  cuerpo: string
  cuerpoBytes: number
}

export type HeredocReport = {
  contieneLexico: boolean
  extraidos: number
  detalle: HeredocDetail[]
  comandoProcesado: string
  restauracionIngenua: string
  restauracionCoincide: boolean
}

const CUERPO_TRUNCADO_EN = 200

/**
 * Analiza `command` en busca de heredocs, con el mismo criterio que
 * `bash/heredoc.ts` documenta: extrae, y de paso restaura sobre el string
 * COMPLETO (no por token). Esa restauración es informativa, no un contrato:
 * el uso real de `restoreHeredocs` es por elemento de un arreglo YA
 * tokenizado (por un `shell-quote`-equivalente, ausente en este porte
 * parcial), así que un comando con contenido en la MISMA línea del operador
 * tras el heredoc (p. ej. `cat <<EOF && echo done`) puede no coincidir byte
 * a byte tras esta restauración de un solo tramo — se reporta la
 * discrepancia, no se oculta.
 */
export function analyzeHeredoc(command: string, opts?: { quotedOnly?: boolean }): HeredocReport {
  const { processedCommand, heredocs } = extractHeredocs(command, opts)
  const detalle: HeredocDetail[] = [...heredocs.values()].map((info) => {
    const operatorText = command.slice(info.operatorStartIndex, info.operatorEndIndex)
    const cuerpoCompleto = command.slice(info.contentStartIndex, info.contentEndIndex)
    const truncado = cuerpoCompleto.length > CUERPO_TRUNCADO_EN
    return {
      delimitador: info.delimiter,
      citado: /^<<-?['"]/.test(operatorText),
      dash: /^<<-/.test(operatorText),
      cuerpo: truncado ? `${cuerpoCompleto.slice(0, CUERPO_TRUNCADO_EN)}…` : cuerpoCompleto,
      cuerpoBytes: cuerpoCompleto.length,
    }
  })
  const [restauracionIngenua] = restoreHeredocs([processedCommand], heredocs)
  return {
    contieneLexico: containsHeredoc(command),
    extraidos: heredocs.size,
    detalle,
    comandoProcesado: processedCommand,
    restauracionIngenua: restauracionIngenua ?? '',
    restauracionCoincide: restauracionIngenua === command,
  }
}

async function cmdHeredoc(argv: string[]): Promise<number> {
  const { head, literal } = splitLiteral(argv)
  const quotedOnly = takeFlag(head, '--quoted-only')
  const json = takeFlag(quotedOnly.rest, '--json')
  const stdinFlag = takeFlag(json.rest, '--stdin')
  const positionals = [...stdinFlag.rest, ...literal]

  let command: string
  if (stdinFlag.present) {
    command = await Bun.stdin.text()
  } else if (positionals[0] !== undefined) {
    command = positionals[0]
  } else {
    console.error(
      'shell heredoc: falta el comando a analizar (un posicional, o --stdin). ' +
        'NO se emite veredicto sin entrada — adivinar aquí es exactamente lo que este CLI existe para evitar.',
    )
    return EXIT_REFUSE
  }

  const report = analyzeHeredoc(command, { quotedOnly: quotedOnly.present })
  if (json.present) {
    console.log(JSON.stringify(report, null, 2))
    return 0
  }
  console.log(`léxico (containsHeredoc, ciego a comillas): ${report.contieneLexico ? 'sí' : 'no'}`)
  console.log(`extraídos: ${report.extraidos}`)
  report.detalle.forEach((d, i) => {
    console.log(
      `  #${i} delimitador=${d.delimitador} citado=${d.citado ? 'sí' : 'no'} ` +
        `dash=${d.dash ? 'sí' : 'no'} cuerpo(${d.cuerpoBytes}B)=${JSON.stringify(d.cuerpo)}`,
    )
  })
  console.log(`comando procesado (placeholders): ${JSON.stringify(report.comandoProcesado)}`)
  console.log(
    `restauración (string completo, informativa — ver docstring del módulo): ` +
      `${report.restauracionCoincide ? 'coincide con el original' : 'NO coincide byte a byte'}`,
  )
  return 0
}

// --- quote --------------------------------------------------------------

function cmdQuote(argv: string[]): number {
  const { head, literal } = splitLiteral(argv)
  const json = takeFlag(head, '--json')
  const args = [...json.rest, ...literal]

  if (args.length === 0) {
    console.error(
      'shell quote: no hay ningún argumento que citar. NO se emite veredicto — ' +
        'una cadena vacía por defecto sería adivinar, no analizar.',
    )
    return EXIT_REFUSE
  }
  const quoted = quote(args)
  if (json.present) {
    console.log(JSON.stringify({ args, quoted }))
  } else {
    console.log(quoted)
  }
  return 0
}

// --- prefix --------------------------------------------------------------

function cmdPrefix(argv: string[]): number {
  const { head, literal } = splitLiteral(argv)
  const positionals = [...head, ...literal]

  if (positionals.length !== 2) {
    console.error(
      `shell prefix: exige exactamente 2 argumentos (prefijo, comando); recibidos ${positionals.length}. ` +
        'NO se emite veredicto.',
    )
    return EXIT_REFUSE
  }
  const [prefix, command] = positionals as [string, string]
  console.log(formatShellPrefixCommand(prefix, command))
  return 0
}

// --- fig ------------------------------------------------------------------

async function cmdFig(argv: string[]): Promise<number> {
  const { head, literal } = splitLiteral(argv)
  const json = takeFlag(head, '--json')
  const positionals = [...json.rest, ...literal]

  if (positionals.length !== 1) {
    console.error(
      `shell fig: exige exactamente 1 argumento (el nombre de comando); recibidos ${positionals.length}. ` +
        'NO se emite veredicto.',
    )
    return EXIT_REFUSE
  }
  const [name] = positionals as [string]
  const spec = await loadFigSpec(name)
  if (json.present) {
    console.log(JSON.stringify({ command: name, spec }))
    return 0
  }
  if (spec === null) {
    console.log(
      `${name}: sin especificación — rechazado por la validación de entrada de loadFigSpec, ` +
        'o el import de @withfig/autocomplete falló (el paquete no está instalado en este árbol; verificado).',
    )
  } else {
    console.log(JSON.stringify(spec, null, 2))
  }
  return 0
}

// --- stdin-peek -------------------------------------------------------------

async function cmdStdinPeek(argv: string[]): Promise<number> {
  const { value, rest } = takeValue(argv, '--timeout-ms')
  if (rest.length > 0) {
    console.error(
      `shell stdin-peek: no reconoce ${JSON.stringify(rest[0])}. NO se emite veredicto.`,
    )
    return EXIT_REFUSE
  }
  const timeoutMs = value === undefined ? 200 : Number(value)
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    console.error(
      `shell stdin-peek: --timeout-ms exige un entero positivo; recibido ${JSON.stringify(value)}. ` +
        'NO se emite veredicto.',
    )
    return EXIT_REFUSE
  }

  // `peekForStdinData` sola no distingue «cerró sin datos» de «cerró tras
  // entregar datos» — las dos resuelven `false`. Se añade un segundo
  // listener de 'data', propio de esta puerta, para verlo sin tocar el
  // módulo (EventEmitter admite varios listeners del mismo evento).
  let sawData = false
  const onData = (): void => {
    sawData = true
  }
  process.stdin.on('data', onData)
  const timedOut = await peekForStdinData(process.stdin, timeoutMs)
  process.stdin.off('data', onData)

  if (timedOut) {
    console.log(
      `sin datos en ${timeoutMs}ms — stdin sigue abierto e inactivo (¿tty heredado sin pipe real?)`,
    )
    return 1
  }
  console.log(
    sawData
      ? 'el stream cerró tras entregar datos — productor de pipe real'
      : 'el stream cerró sin entregar ningún dato — pipe vacío',
  )
  return 0
}

// --- env --------------------------------------------------------------------

function cmdEnv(argv: string[]): number {
  const gha = takeFlag(argv, '--gha')
  const json = takeFlag(gha.rest, '--json')
  if (json.rest.length > 0) {
    console.error(`shell env: no reconoce ${JSON.stringify(json.rest[0])}. NO se emite veredicto.`)
    return EXIT_REFUSE
  }

  // Sin `--gha` se lee el entorno real tal cual (subprocessEnv() sin
  // argumento cae a getAllEnv()); con `--gha` se simula el cribado de GHA
  // sobre una COPIA con la bandera forzada — nunca se toca el proceso real.
  // La bandera inyectada entra al conjunto `before`: es un INSUMO de la
  // simulación, no algo que `subprocessEnv` "gane" — si se dejara fuera de
  // `before`, aparecería falsamente como "agregada" en cada corrida --gha.
  const before: Record<string, string | undefined> = gha.present
    ? { ...process.env, CLAUDE_CODE_SUBPROCESS_ENV_SCRUB: '1' }
    : process.env
  const after = subprocessEnv(gha.present ? before : undefined)

  const beforeKeys = new Set(Object.keys(before))
  const afterKeys = new Set(Object.keys(after))
  const removidas = [...beforeKeys].filter((k) => !afterKeys.has(k)).sort()
  const agregadas = [...afterKeys].filter((k) => !beforeKeys.has(k)).sort()

  if (json.present) {
    console.log(JSON.stringify({ simulaGha: gha.present, removidas, agregadas }))
    return 0
  }
  console.log(`simula GHA: ${gha.present ? 'sí' : 'no'}`)
  console.log(`variables que un subproceso NO vería (${removidas.length}): ${removidas.join(', ') || '(ninguna)'}`)
  console.log(
    `variables que un subproceso SÍ ganaría, del proxy ascendente (${agregadas.length}): ` +
      `${agregadas.join(', ') || '(ninguna)'}`,
  )
  console.log('los VALORES nunca se imprimen — sólo los nombres, por diseño de esta puerta.')
  return 0
}

// --- despacho ----------------------------------------------------------------

function usage(): string {
  return [
    'uso: bun run bin/shell.ts <subcomando> [opciones]',
    '',
    '  heredoc [--quoted-only] [--json] (<comando> | --stdin)',
    '  quote [--json] [--] <arg...>',
    '  prefix [--] <prefijo> <comando>',
    '  fig [--json] <comando>',
    '  stdin-peek [--timeout-ms N]',
    '  env [--gha] [--json]',
    '',
    'Todo lo que sigue a un `--` literal se toma como posicional sin interpretar.',
  ].join('\n')
}

export async function main(argv: string[]): Promise<number> {
  const [sub, ...rest] = argv
  if (sub === undefined || sub === '-h' || sub === '--help') {
    console.log(usage())
    return sub === undefined ? EXIT_REFUSE : 0
  }
  switch (sub) {
    case 'heredoc':
      return cmdHeredoc(rest)
    case 'quote':
      return cmdQuote(rest)
    case 'prefix':
      return cmdPrefix(rest)
    case 'fig':
      return cmdFig(rest)
    case 'stdin-peek':
      return cmdStdinPeek(rest)
    case 'env':
      return cmdEnv(rest)
    default:
      console.error(
        `shell: «${sub}» no es un subcomando. NO se despacha una acción por defecto.\n\n${usage()}`,
      )
      return EXIT_REFUSE
  }
}

if (import.meta.main) {
  process.exit(await main(process.argv.slice(2)))
}
