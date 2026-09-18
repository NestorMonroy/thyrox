import { describe, expect, test } from 'bun:test'

import {
  DANGEROUS_DIRECTORIES,
  DANGEROUS_FILES,
  normalizeCaseForComparison,
} from '../filesystem.ts'

/**
 * Copia de `ccnmt: packages/permission/src/__tests__/dangerousPaths.behavior.test.ts`
 * con los comentarios traducidos; el cuerpo es el de la fuente.
 *
 * Fija las listas DANGEROUS_FILES y DANGEROUS_DIRECTORIES. Éstas reciben un
 * trato de permiso aparte, para impedir la edición automática de archivos que
 * podrían:
 *   - Ejecutar código en el siguiente arranque del shell (.bashrc, .zshrc,
 *     .profile, etc.)
 *   - Exfiltrar redirigiendo un remoto de git (.gitconfig, .gitmodules)
 *   - Anular las barreras de seguridad del proyecto (.mcp.json, .claude.json)
 *   - Manipular el estado del sistema (los directorios .git y .claude)
 *
 * Una deriva aquí es una regresión de SEGURIDAD — se fija la lista entera.
 */
describe('dangerous-file/dir lists (auto-edit gating)', () => {
  describe('DANGEROUS_FILES', () => {
    test('contains shell init files (.bashrc, .zshrc, .profile, etc.)', () => {
      // Los archivos de inicio del shell se ejecutan en cada shell nuevo.
      // Editarlos de forma automática es un vector de escalada de
      // privilegios.
      expect([...DANGEROUS_FILES]).toEqual(
        expect.arrayContaining([
          '.bashrc',
          '.bash_profile',
          '.zshrc',
          '.zprofile',
          '.profile',
        ]),
      )
    })

    test('contains git config files (.gitconfig, .gitmodules)', () => {
      // .gitconfig puede redirigir las URL de los remotos (exfiltración de
      // datos). .gitmodules puede declarar fuentes de submódulo maliciosas.
      expect([...DANGEROUS_FILES]).toEqual(
        expect.arrayContaining(['.gitconfig', '.gitmodules']),
      )
    })

    test('contains .ripgreprc (controls rg search behavior / file include)', () => {
      // .ripgreprc puede redirigir la búsqueda para leer rutas sensibles.
      expect([...DANGEROUS_FILES]).toContain('.ripgreprc')
    })

    test('contains .mcp.json (MCP server config — code execution surface)', () => {
      // Editar .mcp.json sin el prompt de confianza dejaría que código no
      // confiable registrara un servidor MCP que ejecuta comandos
      // arbitrarios.
      expect([...DANGEROUS_FILES]).toContain('.mcp.json')
    })

    test('contains .claude.json (project settings, including hooks)', () => {
      // .claude.json contiene `apiKeyHelper` y los hooks — vectores directos de ejecución de código.
      expect([...DANGEROUS_FILES]).toContain('.claude.json')
    })

    test('list length is exactly 10 (pin against silent additions/removals)', () => {
      expect(DANGEROUS_FILES.length).toBe(10)
    })

    test('all entries are leaf filenames (no path separators)', () => {
      // Las entradas con separador de ruta se compararían de otra forma — se
      // fija para que la lista siga siendo sólo de nombres de hoja.
      for (const file of DANGEROUS_FILES) {
        expect(file).not.toContain('/')
        expect(file).not.toContain('\\')
      }
    })
  })

  describe('DANGEROUS_DIRECTORIES', () => {
    test('exact list: .git, .vscode, .idea, .claude', () => {
      expect([...DANGEROUS_DIRECTORIES]).toEqual([
        '.git',
        '.vscode',
        '.idea',
        '.claude',
      ])
    })

    test('all entries are leaf dirnames (no path separators)', () => {
      for (const dir of DANGEROUS_DIRECTORIES) {
        expect(dir).not.toContain('/')
        expect(dir).not.toContain('\\')
      }
    })
  })

  describe('normalizeCaseForComparison', () => {
    test('always lowercases (regardless of platform)', () => {
      // Crítico: un sistema de archivos que no distingue mayúsculas (macOS,
      // Windows) podría saltarse la comprobación de `.claude` con `.CLaude` —
      // pasar todo a minúscula lo impide.
      expect(normalizeCaseForComparison('.CLaude/Settings.locaL.json')).toBe(
        '.claude/settings.local.json',
      )
      expect(normalizeCaseForComparison('/Users/foo/.BASHrc')).toBe(
        '/users/foo/.bashrc',
      )
    })

    test('NOT platform-conditional (Linux paths also lowercased)', () => {
      // Fijado contra un refactor que diga «Linux distingue mayúsculas, así
      // que ahí nos podemos saltar la normalización» — eso crearía una
      // divergencia en la que la misma ruta casa en macOS y se cuela en
      // Linux.
      const original = '/etc/Profile'
      expect(normalizeCaseForComparison(original)).toBe('/etc/profile')
    })
  })
})
