import { describe, expect, test } from 'bun:test'
import { SettingsSchema } from '../settings/types.ts'

// T-051: el selector de pruebas por impacto sólo sirve fuera de este paquete
// si su configuración es del PROYECTO, no del código. Cada repo declara su
// estrategia, su corredor y sus disparadores transversales.
describe('settings.testImpact — la configuración por proyecto (T-051)', () => {
  const valido = {
    testImpact: {
      strategy: 'text-reference',
      testGlob: '__tests__/**/*.test.ts',
      runner: 'bun test',
      fullRunner: 'bun test',
      crossCutting: ['src/types.ts', 'src/config/**'],
    },
  }

  test('acepta la forma completa', () => {
    const r = SettingsSchema.safeParse(valido)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.testImpact?.crossCutting).toEqual(['src/types.ts', 'src/config/**'])
  })

  test('es opcional: un proyecto que no lo declare sigue siendo válido', () => {
    expect(SettingsSchema.safeParse({}).success).toBe(true)
  })

  // Una estrategia inventada tiene que fallar al cargar, no al correr: un
  // valor desconocido aquí produciría un subconjunto vacío que se leería como
  // «no hay nada que probar».
  test('una estrategia fuera del enum se rechaza al cargar, no al usar', () => {
    const r = SettingsSchema.safeParse({ testImpact: { ...valido.testImpact, strategy: 'adivinanza' } })
    expect(r.success).toBe(false)
  })

  test('path-convention admite su patrón de derivación', () => {
    const r = SettingsSchema.safeParse({ testImpact: { strategy: 'path-convention',
      testGlob: '__tests__/**/*.test.ts', runner: 'bun test', fullRunner: 'bun test',
      pathPattern: { from: 'src/(.+)\\.ts$', to: '__tests__/$1.test.ts' } } })
    expect(r.success).toBe(true)
  })
})
