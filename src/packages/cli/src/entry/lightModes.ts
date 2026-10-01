/**
 * Los modos que `cli.tsx` resuelve sin importar `main.tsx`.
 *
 * Un modo ligero es un comando autocontenido: recibe `argv`, devuelve un
 * código de salida y no necesita el preámbulo del arranque completo —ni la
 * configuración, ni los plugins, ni el REPL—. Medido en el análisis de
 * arranque (#130): por `main.tsx`, `thyrox providers list` cargaba 4627
 * módulos; el comando solo, 86.
 *
 * Es la misma forma que los caminos rápidos que `cli.tsx` ya tiene para
 * `--version` o `remote-control`, en tabla: cada entrada importa su comando
 * sólo cuando se pide, así que consultar la tabla no carga ninguno.
 */
type CommandRunner = (argv: string[]) => number | Promise<number>

export const LIGHT_MODES: Readonly<Record<string, () => Promise<CommandRunner>>> = {
  providers: async () => (await import('../commands/providers-commands.ts')).providersCommand,
  mitm: async () => (await import('../commands/mitm-commands.ts')).mitmCommand,
}

/** El cargador del modo ligero que `args` pide, o `undefined` si no es uno. */
export function lightModeFor(args: readonly string[]): (() => Promise<CommandRunner>) | undefined {
  const name = args[0]
  return name !== undefined && Object.hasOwn(LIGHT_MODES, name) ? LIGHT_MODES[name] : undefined
}

/** Corre el modo ligero y devuelve su código; `undefined` si `args` no pide uno. */
export async function runLightMode(args: string[]): Promise<number | undefined> {
  const load = lightModeFor(args)
  if (!load) return undefined
  const run = await load()
  return run(args)
}
