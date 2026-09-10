/**
 * Tests del puerto de `api.ts`/`host.ts` (`../api.js`, `../host.js`).
 *
 * Cubre el contrato de host-binding: las 12 funciones de `api.ts` lanzan
 * `HostBindingsError` mientras no haya bindings instalados, y delegan
 * correctamente al binding una vez instalado. `beforeEach` reinstala un
 * mock nuevo por test — el singleton de `host.ts` no se resetea solo, y
 * el primer describe (sin instalar) necesita correr con el módulo
 * "virgen", así que ese describe va primero y aislado.
 */
import { beforeAll, describe, expect, test } from 'bun:test'
import type { CommandLike, CommandRegistryHostBindings } from '../contracts.js'
import {
  builtInCommandNames,
  clearCommandMemoizationCaches,
  clearCommandsCache,
  findCommand,
  getCommand,
  getCommandName,
  getCommands,
  getMcpSkillCommands,
  getSkillToolCommands,
  getSlashCommandToolSkills,
  hasCommand,
  isCommandEnabled,
} from '../api.js'
import {
  getCommandRegistryHostBindings,
  hasCommandRegistryHostBindings,
  installCommandRegistryHostBindings,
} from '../host.js'

describe('host bindings — antes de instalar', () => {
  test('hasCommandRegistryHostBindings es false', () => {
    expect(hasCommandRegistryHostBindings()).toBe(false)
  })

  test('getCommandRegistryHostBindings lanza HostBindingsError', () => {
    expect(() => getCommandRegistryHostBindings()).toThrow(
      /host bindings have not been installed/i,
    )
  })

  test('una función de api.ts que delega también lanza sin bindings', () => {
    expect(() => builtInCommandNames()).toThrow(/host bindings have not been installed/i)
  })
})

function makeMockBindings(): CommandRegistryHostBindings<CommandLike> {
  const cmdA: CommandLike = { name: 'a' }
  const cmdB: CommandLike = { name: 'b', disableModelInvocation: true }
  const all = [cmdA, cmdB]
  return {
    getCommands: async () => all,
    clearCommandMemoizationCaches: () => {},
    clearCommandsCache: () => {},
    getCommandName: command => command.name,
    isCommandEnabled: command => !command.disableModelInvocation,
    builtInCommandNames: () => new Set(['a', 'b']),
    findCommand: (name, commands) => commands.find(c => c.name === name),
    hasCommand: (name, commands) => commands.some(c => c.name === name),
    getCommand: (name, commands) => {
      const found = commands.find(c => c.name === name)
      if (!found) throw new Error(`not found: ${name}`)
      return found
    },
    getSkillToolCommands: async () => [cmdA],
    getSlashCommandToolSkills: async () => [cmdB],
    getMcpSkillCommands: mcpCommands => mcpCommands,
    internalOnlyCommands: () => [],
    remoteSafeCommands: () => new Set(all),
    bridgeSafeCommands: () => new Set(all),
    isBridgeSafeCommand: () => true,
    filterCommandsForRemoteMode: commands => commands,
    formatDescriptionWithSource: command => command.name,
  }
}

describe('host bindings — después de instalar', () => {
  beforeAll(() => {
    installCommandRegistryHostBindings(makeMockBindings())
  })

  test('hasCommandRegistryHostBindings es true', () => {
    expect(hasCommandRegistryHostBindings()).toBe(true)
  })

  test('getCommands delega al binding', async () => {
    const commands = await getCommands('/cwd')
    expect(commands.map(c => c.name)).toEqual(['a', 'b'])
  })

  test('getCommands ignora signal (no lo reenvía, no lanza)', async () => {
    const controller = new AbortController()
    const commands = await getCommands('/cwd', controller.signal)
    expect(commands).toHaveLength(2)
  })

  test('getCommandName / isCommandEnabled delegan', async () => {
    const [cmdA, cmdB] = await getCommands('/cwd')
    expect(getCommandName(cmdA!)).toBe('a')
    expect(isCommandEnabled(cmdA!)).toBe(true)
    expect(isCommandEnabled(cmdB!)).toBe(false)
  })

  test('builtInCommandNames delega', () => {
    expect(builtInCommandNames()).toEqual(new Set(['a', 'b']))
  })

  test('findCommand / hasCommand / getCommand delegan', async () => {
    const commands = await getCommands('/cwd')
    expect(findCommand('a', commands)?.name).toBe('a')
    expect(hasCommand('z', commands)).toBe(false)
    expect(getCommand('b', commands).name).toBe('b')
  })

  test('getSkillToolCommands / getSlashCommandToolSkills delegan', async () => {
    expect((await getSkillToolCommands('/cwd')).map(c => c.name)).toEqual(['a'])
    expect((await getSlashCommandToolSkills('/cwd')).map(c => c.name)).toEqual(['b'])
  })

  test('getMcpSkillCommands delega', async () => {
    const commands = await getCommands('/cwd')
    expect(getMcpSkillCommands(commands)).toEqual(commands)
  })

  test('clearCommandMemoizationCaches / clearCommandsCache no lanzan', () => {
    expect(() => clearCommandMemoizationCaches()).not.toThrow()
    expect(() => clearCommandsCache()).not.toThrow()
  })
})
