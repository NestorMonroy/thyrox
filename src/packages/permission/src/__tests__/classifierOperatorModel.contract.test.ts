import { beforeEach, describe, expect, test } from 'bun:test'
import { installConfigHostBindings } from '@thyrox/config/host'
import { getEmptyToolPermissionContext } from '@thyrox/tool-registry/Tool.js'
import { buildYoloSystemPrompt } from '../yoloSystemPrompt.js'

// `buildYoloSystemPrompt` lee la config de auto mode (`getAutoModeConfig`),
// que exige los host bindings de `@thyrox/config`.
beforeEach(() => {
  installConfigHostBindings({})
})

/**
 * Copia de `ccnmt: packages/permission/src/__tests__/classifierOperatorModel.contract.test.ts`
 * con los comentarios traducidos; el cuerpo es el de la fuente.
 *
 * Test de contrato — la inyección del Session Context del modelo de operador
 * de ccb.
 *
 * La plantilla del clasificador de modo automático que viene de aguas arriba
 * (ant) hereda un modelo de amenaza multi-inquilino. Una de sus reglas —el
 * SOFT BLOCK «Git Push to Default Branch … bypasses pull request review»— es
 * sencillamente falsa para ccb: ccb lo mantiene una sola persona, su flujo de
 * publicación documentado ES commitear y empujar directamente a main, y no
 * hay ninguna puerta de revisión por PR. Sin corregir, el clasificador —que
 * es otro LLM y nunca ve CYBER_RISK_INSTRUCTION— bloquea el flujo normal de
 * publicación del operador, y se agarra a un push bloqueado para bloquear
 * también el git de SÓLO LECTURA que venga después (`git fetch`, `status`,
 * `rev-parse`).
 *
 * `buildSessionContextLines` (`yoloSystemPrompt.ts`) corrige esto en CÓDIGO
 * —no en las plantillas .txt que se sincronizan con aguas arriba— añadiendo
 * los hechos del modelo de operador al bloque de Session Context del
 * clasificador. Estas aserciones fijan que la corrección está presente y
 * correctamente ACOTADA, para que una edición futura no pueda ni dejarla caer
 * en silencio ni ensancharla hasta volverla un resquicio de exfiltración real.
 *
 * Es presencia de texto, no comportamiento (la decisión del clasificador es
 * una llamada a un LLM — ver `feedback_llm_bugs_no_unit_test`). Lo que queda
 * bajo llave es que los hechos que el modelo lee siguen ahí y siguen acotados.
 */
describe('classifier Session Context — ccb operator model', () => {
  async function sessionContextText(): Promise<string> {
    const { sessionContextBlocks } = await buildYoloSystemPrompt(
      getEmptyToolPermissionContext(),
    )
    return sessionContextBlocks.map(b => b.text).join('\n')
  }

  test('declares the single-operator, self-hosted model', async () => {
    const text = await sessionContextText()
    expect(text).toContain('Operator model')
    expect(text).toMatch(/self-hosted|single-operator|solo/i)
    // El sentido entero: NO es un entorno compartido ni multi-inquilino.
    expect(text).toMatch(/NOT a shared|multi-tenant/i)
  })

  test('authorizes default-branch push as the normal release flow', async () => {
    const text = await sessionContextText()
    expect(text).toContain('Release flow')
    expect(text).toMatch(/default[ -]branch/i)
    // Tiene que neutralizar explícitamente el soft block «Git Push to
    // Default Branch» de aguas arriba — si no, la regla se sigue disparando.
    expect(text).toContain('Git Push to Default Branch')
  })

  test('keeps default-branch authorization SCOPED — does not open an exfil hole', async () => {
    const text = await sessionContextText()
    // La autorización tiene que seguir acotada al remoto del propio repo del
    // directorio de trabajo. Empujar a un repo DE FUERA tiene que seguir
    // siendo Data Exfiltration (hard block), y el git destructivo tiene que
    // seguir bloqueado. Si una edición futura deja caer esos calificadores,
    // este test falla — el acotamiento es la frontera de seguridad.
    expect(text).toMatch(/own remote|working-dir repo/i)
    expect(text).toContain('Data Exfiltration')
    expect(text).toMatch(/force-push|Git Destructive/i)
  })

  test('marks read-only git as never security-relevant', async () => {
    const text = await sessionContextText()
    expect(text).toMatch(/Read-only git|read-only \/|fetch-only/i)
    expect(text).toContain('git status')
    expect(text).toContain('git fetch')
    // La guarda contra el envenenamiento de contexto: un push bloqueado antes
    // no debe convertir una consulta de sólo lectura posterior en un
    // «reintento».
    expect(text).toMatch(/prior blocked push|not make a later read-only/i)
  })
})
