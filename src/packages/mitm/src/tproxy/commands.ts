/**
 * Los comandos del modo de captura transparente TPROXY (Linux): interceptar
 * TCP con TPROXY y enrutado por política, sin tocar `/etc/hosts` ni el proxy
 * del sistema (vale sin interfaz gráfica, y un reinicio lo borra).
 *
 * La receta marca en `mangle OUTPUT` las conexiones salientes LOCALES, porque
 * lo que se intercepta son agentes en la misma máquina y PREROUTING sólo ve el
 * tráfico reenviado: una `ip rule` devuelve los paquetes marcados a la entrega
 * local (`lo`), y al volver a entrar el TPROXY de `mangle PREROUTING` los
 * asigna al socket IP_TRANSPARENT.
 *
 *   iptables -t mangle -A OUTPUT -p tcp --dport N [-m mark ! --mark BYPASS] -j MARK --set-mark M
 *   ip rule add fwmark M lookup T
 *   ip route add local 0.0.0.0/0 dev lo table T
 *   iptables -t mangle -A PREROUTING -p tcp --dport N -m mark --mark M -j TPROXY --on-port L --tproxy-mark M
 *
 * Todo es puro: cada comando es `{bin, args}` para `execFile`, nunca una
 * cadena de shell, y el revert es el inverso exacto del apply en orden
 * inverso, para que una caída nunca deje una regla de `mangle` atrás.
 *
 * `bypassMark` evita el bucle: es el SO_MARK que el proxy pone en sus propias
 * conexiones al upstream, y la regla de OUTPUT lo excluye. Sin él no se emite
 * exclusión (vale para un receptor que sólo registra y no reenvía).
 *
 * Porte de `omniroute: src/mitm/tproxy/commands.ts` (MIT).
 */

export interface TproxyConfig {
  /** El puerto TCP de destino que se intercepta (p. ej. 443). */
  dport: number
  /** La marca que pone OUTPUT y casan la ip rule y PREROUTING. */
  mark: number
  /** El puerto local del socket IP_TRANSPARENT. */
  onPort: number
  /** La tabla de enrutado por política con la ruta `local 0.0.0.0/0`. */
  routeTable: number
  /** El SO_MARK de las conexiones propias del proxy, excluido en OUTPUT. */
  bypassMark?: number
}

/** Un comando para `execFile(bin, args)`. */
export interface TproxyCommand {
  bin: string
  args: string[]
}

function isPort(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= 65535
}

/** El error de una configuración, o `null` si es válida. Se comprueba antes de construir nada. */
export function validateTproxyConfig(cfg: TproxyConfig): string | null {
  if (!isPort(cfg.dport)) return `dport must be a valid TCP port (1-65535), got ${cfg.dport}`
  if (!isPort(cfg.onPort)) return `onPort must be a valid TCP port (1-65535), got ${cfg.onPort}`
  if (!Number.isInteger(cfg.mark) || cfg.mark < 1) return `mark must be a positive integer, got ${cfg.mark}`
  if (!Number.isInteger(cfg.routeTable) || cfg.routeTable < 1) {
    return `routeTable must be a positive integer, got ${cfg.routeTable}`
  }
  if (cfg.bypassMark !== undefined) {
    if (!Number.isInteger(cfg.bypassMark) || cfg.bypassMark < 1) {
      return `bypassMark must be a positive integer when set, got ${cfg.bypassMark}`
    }
    if (cfg.bypassMark === cfg.mark) return 'bypassMark must differ from mark (anti-loop)'
  }
  return null
}

// La regla de OUTPUT, compartida para que -A y -D casen exactamente.
function outputRuleSpec(cfg: TproxyConfig): string[] {
  const spec = ['-t', 'mangle', 'OUTPUT', '-p', 'tcp', '--dport', String(cfg.dport)]
  if (cfg.bypassMark !== undefined) spec.push('-m', 'mark', '!', '--mark', String(cfg.bypassMark))
  spec.push('-j', 'MARK', '--set-mark', String(cfg.mark))
  return spec
}

function preroutingRuleSpec(cfg: TproxyConfig): string[] {
  return [
    '-t', 'mangle', 'PREROUTING',
    '-p', 'tcp', '--dport', String(cfg.dport),
    '-m', 'mark', '--mark', String(cfg.mark),
    '-j', 'TPROXY', '--on-port', String(cfg.onPort), '--tproxy-mark', String(cfg.mark),
  ]
}

function iptables(op: '-A' | '-D', spec: string[]): TproxyCommand {
  const [t, table, chain, ...rest] = spec
  return { bin: 'iptables', args: [t!, table!, op, chain!, ...rest] }
}

/** Los comandos que activan la intercepción, en orden de aplicación. */
export function buildTproxyApplyCommands(cfg: TproxyConfig): TproxyCommand[] {
  return [
    { bin: 'ip', args: ['rule', 'add', 'fwmark', String(cfg.mark), 'lookup', String(cfg.routeTable)] },
    { bin: 'ip', args: ['route', 'add', 'local', '0.0.0.0/0', 'dev', 'lo', 'table', String(cfg.routeTable)] },
    iptables('-A', outputRuleSpec(cfg)),
    iptables('-A', preroutingRuleSpec(cfg)),
  ]
}

/** Los que la deshacen: el inverso exacto del apply, en orden inverso. */
export function buildTproxyRevertCommands(cfg: TproxyConfig): TproxyCommand[] {
  return [
    iptables('-D', preroutingRuleSpec(cfg)),
    iptables('-D', outputRuleSpec(cfg)),
    { bin: 'ip', args: ['route', 'del', 'local', '0.0.0.0/0', 'dev', 'lo', 'table', String(cfg.routeTable)] },
    { bin: 'ip', args: ['rule', 'del', 'fwmark', String(cfg.mark), 'lookup', String(cfg.routeTable)] },
  ]
}
