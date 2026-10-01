import { describe, expect, test } from 'bun:test'

import {
  buildDaemonHelpBanner,
  classifyDaemonBgSubcommand,
  describeDaemonOrigin,
  EXIT_CODE_SERVICE_STARTUP_FAILURE,
  EXPERIMENTAL_FEATURE_GATED_SUBCOMMANDS,
  formatServiceUnreachableAfterInstallWarning,
  parseSpawnedBy,
  POLICY_FAILURE_TOLERANT_SUBCOMMANDS,
  resolveDaemonBgDispatch,
  resolveDaemonBgInvocation,
  SERVICE_REACHABILITY_TIMEOUT_MS,
  validateDaemonOrigin,
  warnOnUnknownArgs,
  writeStderrLine,
  writeStdoutLine,
} from '../daemonCli.js'

// Porte de `Bt`, `on`, `Lt`, `an`, `sn`, `G`, `z`, `Ce`, `jt`, `wa`, `rn`,
// `nn` y el codigo de salida `Yr` (`chunk-92tvramn.js`, referencia 2.1.283,
// resueltos con `bin/binary symbol`). Fuente de verdad: las filas D18 de
// `.claude/workbench/daemon-inventory-20260929T065202/parity-map.tsv`.

describe('writeStdoutLine / writeStderrLine', () => {
  test('G escribe la linea en stdout con un unico salto final', () => {
    const written: string[] = []
    const original = process.stdout.write.bind(process.stdout)
    process.stdout.write = ((chunk: string) => {
      written.push(chunk)
      return true
    }) as typeof process.stdout.write
    try {
      writeStdoutLine('pid:     123')
    } finally {
      process.stdout.write = original
    }
    expect(written).toEqual(['pid:     123\n'])
  })

  test('z escribe la linea en stderr con un unico salto final', () => {
    const written: string[] = []
    const original = process.stderr.write.bind(process.stderr)
    process.stderr.write = ((chunk: string) => {
      written.push(chunk)
      return true
    }) as typeof process.stderr.write
    try {
      writeStderrLine('warning: algo')
    } finally {
      process.stderr.write = original
    }
    expect(written).toEqual(['warning: algo\n'])
  })
})

describe('validateDaemonOrigin (Lt)', () => {
  test('acepta service/transient/foreground tal cual', () => {
    expect(validateDaemonOrigin('service')).toBe('service')
    expect(validateDaemonOrigin('transient')).toBe('transient')
    expect(validateDaemonOrigin('foreground')).toBe('foreground')
  })

  test('normaliza auto a transient', () => {
    expect(validateDaemonOrigin('auto')).toBe('transient')
  })

  test('rechaza cualquier otro valor devolviendo undefined', () => {
    expect(validateDaemonOrigin('bogus')).toBeUndefined()
    expect(validateDaemonOrigin(undefined)).toBeUndefined()
  })
})

describe('describeDaemonOrigin (an)', () => {
  test('origin ausente se lee como "unknown" y se devuelve tal cual', () => {
    expect(describeDaemonOrigin({})).toBe('unknown')
  })

  test('origin distinto de transient/auto se devuelve sin adornar', () => {
    expect(describeDaemonOrigin({ origin: 'service' })).toBe('service')
    expect(describeDaemonOrigin({ origin: 'foreground' })).toBe('foreground')
  })

  test('transient sin spawnedBy describe un cliente generico', () => {
    expect(describeDaemonOrigin({ origin: 'transient' })).toBe(
      'transient — started on-demand by a client',
    )
  })

  test('transient con spawnedBy nombra label, pid y cwd', () => {
    expect(
      describeDaemonOrigin({
        origin: 'transient',
        spawnedBy: { label: 'claude-code', cwd: '/home/user/proj', pid: 4242 },
      }),
    ).toBe('transient — started on-demand by `claude-code` (pid 4242) in /home/user/proj')
  })
})

describe('parseSpawnedBy (sn)', () => {
  test('JSON valido con la forma exacta se acepta', () => {
    expect(
      parseSpawnedBy(JSON.stringify({ label: 'x', cwd: '/a', pid: 1 })),
    ).toEqual({ label: 'x', cwd: '/a', pid: 1 })
  })

  test('JSON invalido (no parsea) devuelve undefined en vez de lanzar', () => {
    expect(parseSpawnedBy('{not json')).toBeUndefined()
  })

  test('JSON valido pero de otro tipo (array) devuelve undefined', () => {
    expect(parseSpawnedBy('[1,2,3]')).toBeUndefined()
  })

  test('JSON valido con forma incompleta devuelve undefined', () => {
    expect(parseSpawnedBy(JSON.stringify({ label: 'x', cwd: '/a' }))).toBeUndefined()
    expect(parseSpawnedBy(JSON.stringify({ label: 'x', cwd: '/a', pid: '1' }))).toBeUndefined()
  })

  test('null parseado devuelve undefined', () => {
    expect(parseSpawnedBy('null')).toBeUndefined()
  })
})

describe('warnOnUnknownArgs (Ce)', () => {
  test('sin argumentos sobrantes, no escribe nada', () => {
    const written: string[] = []
    const original = process.stderr.write.bind(process.stderr)
    process.stderr.write = ((chunk: string) => {
      written.push(chunk)
      return true
    }) as typeof process.stderr.write
    try {
      warnOnUnknownArgs(['--json'], ['--json'])
    } finally {
      process.stderr.write = original
    }
    expect(written).toEqual([])
  })

  test('las flags de depuracion conocidas se descartan en silencio', () => {
    const written: string[] = []
    const original = process.stderr.write.bind(process.stderr)
    process.stderr.write = ((chunk: string) => {
      written.push(chunk)
      return true
    }) as typeof process.stderr.write
    try {
      warnOnUnknownArgs(
        ['--debug', '-d', '--debug-to-stderr', '-d2e', '--debug=x', '--debug-file=y', '--debug-file', 'z'],
        [],
      )
    } finally {
      process.stderr.write = original
    }
    expect(written).toEqual([])
  })

  test('un argumento sobrante se avisa por stderr, con su texto exacto', () => {
    const written: string[] = []
    const original = process.stderr.write.bind(process.stderr)
    process.stderr.write = ((chunk: string) => {
      written.push(chunk)
      return true
    }) as typeof process.stderr.write
    try {
      warnOnUnknownArgs(['--json', '--bogus', 'extra'], ['--json'])
    } finally {
      process.stderr.write = original
    }
    expect(written).toEqual(['warning: extra arguments ignored: --bogus extra\n'])
  })
})

describe('formatServiceUnreachableAfterInstallWarning (jt)', () => {
  test('nombra la accion y el timeout en segundos, con la sugerencia completa', () => {
    expect(formatServiceUnreachableAfterInstallWarning('start', SERVICE_REACHABILITY_TIMEOUT_MS)).toBe(
      'warning: the service manager accepted the start, but the installed daemon is not reachable ' +
        'after 45s — the first start after an update can be slow. Check `claude daemon status` and ' +
        '`claude daemon logs`; if the service file points at a binary or launcher that no longer ' +
        'exists, `claude daemon install` rewrites it from the current settings.',
    )
  })

  test('el timeout se deriva del parametro, no de una constante fija', () => {
    expect(formatServiceUnreachableAfterInstallWarning('restart', 5000)).toContain('after 5s')
  })
})

describe('buildDaemonHelpBanner (Bt)', () => {
  const sections = {
    base: 'BASE\n',
    serviceInstallSection: 'INSTALL\n',
    serviceInstallDisabledNotice: 'DISABLED\n',
    remoteControlSection: 'REMOTE\n',
    optionsSection: 'OPTIONS\n',
  }

  test('con el servicio habilitado incluye la seccion de instalacion, no el aviso', () => {
    const banner = buildDaemonHelpBanner(sections, {
      serviceInstallEnabled: true,
      remoteControlAvailable: false,
      remoteControlFeatureEnabled: false,
    })
    expect(banner).toBe('BASE\nINSTALL\nOPTIONS\n')
  })

  test('con el servicio deshabilitado incluye el aviso, no la seccion de instalacion', () => {
    const banner = buildDaemonHelpBanner(sections, {
      serviceInstallEnabled: false,
      remoteControlAvailable: false,
      remoteControlFeatureEnabled: false,
    })
    expect(banner).toBe('BASE\nDISABLED\nOPTIONS\n')
  })

  test('con remote-control disponible como plataforma, la seccion de remote-control no aparece', () => {
    const banner = buildDaemonHelpBanner(sections, {
      serviceInstallEnabled: true,
      remoteControlAvailable: true,
      remoteControlFeatureEnabled: true,
    })
    expect(banner).toBe('BASE\nINSTALL\nOPTIONS\n')
  })

  test('sin plataforma pero con el feature flag activo, aparece la seccion de remote-control', () => {
    const banner = buildDaemonHelpBanner(sections, {
      serviceInstallEnabled: true,
      remoteControlAvailable: false,
      remoteControlFeatureEnabled: true,
    })
    expect(banner).toBe('BASE\nINSTALL\nREMOTE\nOPTIONS\n')
  })

  test('sin plataforma y sin el feature flag, no aparece ninguna seccion de remote-control', () => {
    const banner = buildDaemonHelpBanner(sections, {
      serviceInstallEnabled: true,
      remoteControlAvailable: false,
      remoteControlFeatureEnabled: false,
    })
    expect(banner).toBe('BASE\nINSTALL\nOPTIONS\n')
  })
})

describe('resolveDaemonBgInvocation (on)', () => {
  const defaults = { jsonPath: '/default.json', logPath: '/default.log', isStdinTty: false }

  test('sin argumentos y stdin no-TTY, infiere "run"', () => {
    expect(resolveDaemonBgInvocation([], defaults).sub).toBe('run')
  })

  test('sin argumentos y stdin TTY, infiere "hub"', () => {
    expect(resolveDaemonBgInvocation([], { ...defaults, isStdinTty: true }).sub).toBe('hub')
  })

  test('un subcomando conocido se resuelve tal cual, sin importar TTY', () => {
    expect(resolveDaemonBgInvocation(['status'], { ...defaults, isStdinTty: true }).sub).toBe('status')
  })

  test('--json-path con espacio se extrae y se marca explicito', () => {
    const result = resolveDaemonBgInvocation(['run', '--json-path', '/x.json'], defaults)
    expect(result.jsonPath).toBe('/x.json')
    expect(result.rest).toEqual([])
  })

  test('--json-path=valor (forma con "=") tambien se reconoce', () => {
    const result = resolveDaemonBgInvocation(['run', '--json-path=/y.json'], defaults)
    expect(result.jsonPath).toBe('/y.json')
  })

  test('--log-file y --log-file= se reconocen igual que --json-path', () => {
    expect(resolveDaemonBgInvocation(['run', '--log-file', '/x.log'], defaults).logPath).toBe('/x.log')
    expect(resolveDaemonBgInvocation(['run', '--log-file=/y.log'], defaults).logPath).toBe('/y.log')
  })

  test('--origin se valida con Lt al extraerlo', () => {
    expect(resolveDaemonBgInvocation(['run', '--origin', 'auto'], defaults).origin).toBe('transient')
    expect(resolveDaemonBgInvocation(['run', '--origin=bogus'], defaults).origin).toBeUndefined()
  })

  test('--spawned-by se parsea con sn al extraerlo', () => {
    const raw = JSON.stringify({ label: 'x', cwd: '/a', pid: 9 })
    expect(resolveDaemonBgInvocation(['run', '--spawned-by', raw], defaults).spawnedBy).toEqual({
      label: 'x',
      cwd: '/a',
      pid: 9,
    })
  })

  test('un token desconocido que no parece ruta se toma como subcomando literal', () => {
    const result = resolveDaemonBgInvocation(['frobnicate'], defaults)
    expect(result.sub).toBe('frobnicate')
    expect(result.rest).toEqual([])
  })

  test('un token desconocido que parece ruta se interpreta como jsonPath posicional de "run"', () => {
    const result = resolveDaemonBgInvocation(['./legacy.json'], defaults)
    expect(result.sub).toBe('run')
    expect(result.jsonPath).toBe('./legacy.json')
  })

  test('"run" seguido de un positional se usa como jsonPath legado si no hubo --json-path explicito', () => {
    const result = resolveDaemonBgInvocation(['run', '/legacy.json'], defaults)
    expect(result.jsonPath).toBe('/legacy.json')
  })

  test('con --json-path explicito, un positional adicional de "run" no lo sobreescribe', () => {
    const result = resolveDaemonBgInvocation(['run', '--json-path', '/explicit.json', '/legacy.json'], defaults)
    expect(result.jsonPath).toBe('/explicit.json')
  })
})

describe('sets de gating de subcomandos (rn/nn)', () => {
  test('EXPERIMENTAL_FEATURE_GATED_SUBCOMMANDS es exactamente list/scheduled/remote-control/hub', () => {
    expect([...EXPERIMENTAL_FEATURE_GATED_SUBCOMMANDS].sort()).toEqual(
      ['hub', 'list', 'remote-control', 'scheduled'].sort(),
    )
  })

  test('POLICY_FAILURE_TOLERANT_SUBCOMMANDS es exactamente run/status/stop/uninstall', () => {
    expect([...POLICY_FAILURE_TOLERANT_SUBCOMMANDS].sort()).toEqual(
      ['run', 'status', 'stop', 'uninstall'].sort(),
    )
  })
})

describe('classifyDaemonBgSubcommand', () => {
  test('un subcomando fuera de rn no esta gateado', () => {
    expect(classifyDaemonBgSubcommand('run')).toEqual({ kind: 'ungated' })
  })

  test('remote-control esta gateado por su propio feature flag', () => {
    expect(classifyDaemonBgSubcommand('remote-control')).toEqual({
      kind: 'gated-by-remote-control-feature',
    })
  })

  test('list/scheduled/hub estan gateados por el flag experimental generico', () => {
    expect(classifyDaemonBgSubcommand('list')).toEqual({ kind: 'gated-by-experimental-flag' })
    expect(classifyDaemonBgSubcommand('scheduled')).toEqual({ kind: 'gated-by-experimental-flag' })
    expect(classifyDaemonBgSubcommand('hub')).toEqual({ kind: 'gated-by-experimental-flag' })
  })
})

describe('resolveDaemonBgDispatch (wa: resolucion de hub y gating)', () => {
  test('hub se degrada a status cuando remote-control no esta disponible en esta plataforma', () => {
    expect(
      resolveDaemonBgDispatch(
        { sub: 'hub' },
        { remoteControlAvailable: false, remoteControlFeatureEnabled: false },
      ),
    ).toEqual({ action: 'run', sub: 'status' })
  })

  test('hub se mantiene cuando remote-control si esta disponible en esta plataforma', () => {
    expect(
      resolveDaemonBgDispatch(
        { sub: 'hub' },
        { remoteControlAvailable: true, remoteControlFeatureEnabled: false },
      ),
    ).toEqual({ action: 'run', sub: 'hub' })
  })

  test('list se rehusa cuando el flag experimental esta apagado', () => {
    expect(
      resolveDaemonBgDispatch(
        { sub: 'list' },
        { remoteControlAvailable: false, remoteControlFeatureEnabled: false },
      ),
    ).toEqual({ action: 'refuse', sub: 'list' })
  })

  test('remote-control se rige por su propio flag, no por remoteControlAvailable', () => {
    expect(
      resolveDaemonBgDispatch(
        { sub: 'remote-control' },
        { remoteControlAvailable: false, remoteControlFeatureEnabled: true },
      ),
    ).toEqual({ action: 'run', sub: 'remote-control' })
  })

  test('un subcomando no gateado siempre corre', () => {
    expect(
      resolveDaemonBgDispatch(
        { sub: 'status' },
        { remoteControlAvailable: false, remoteControlFeatureEnabled: false },
      ),
    ).toEqual({ action: 'run', sub: 'status' })
  })
})

describe('EXIT_CODE_SERVICE_STARTUP_FAILURE (Yr)', () => {
  test('es 70, estilo sysexits.h', () => {
    expect(EXIT_CODE_SERVICE_STARTUP_FAILURE).toBe(70)
  })
})
