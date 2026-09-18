import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Copia de `ccnmt: packages/permission/src/__tests__/classifierProtectedPaths.contract.test.ts`
 * con los comentarios traducidos; el cuerpo es el de la fuente.
 *
 * Test de contrato — ant v2.1.150 (módulo 3148.js para la base y 3149.js para
 * la plantilla) es el clasificador de seguridad canónico del modo automático.
 * Los prompts de ccb son un porte verbatim.
 *
 * El prompt de la v150 está estructurado en dos piezas, que
 * `buildYoloSystemPrompt` ensambla en tiempo de ejecución:
 *   - auto_mode_system_prompt.txt — el prompt BASE: el Threat Model, la User
 *     Intent Rule de 7 puntos, las 13 Evaluation Rules y el Classification
 *     Process. Contiene el marcador `<permissions_template>` pero NINGUNO de
 *     los textos concretos de regla BLOCK/ALLOW.
 *   - permissions_{external,anthropic}.txt — la PLANTILLA: las listas de
 *     reglas HARD BLOCK / SOFT BLOCK / ALLOW con sus etiquetas
 *     `<user_*_to_replace>`. ant 150 distribuye una sola plantilla (RR8); ccb
 *     conserva los dos nombres de archivo, con contenido idéntico, para la
 *     eliminación de código muerto en tiempo de build y para este test.
 *
 * Éstas son aserciones de PRESENCIA DE TEXTO, no de comportamiento — las
 * decisiones reales del clasificador son una llamada a un LLM y no se pueden
 * probar con un test unitario (ver `feedback_llm_bugs_no_unit_test`). Lo que
 * SÍ se puede fijar es que el texto de las reglas y el marco de razonamiento
 * que el modelo lee siguen ahí, para que una edición futura del prompt no
 * pueda dejar caer en silencio una salvaguarda, una excepción o una regla de
 * razonamiento.
 */

const PROMPT_DIR = join(import.meta.dir, '..', 'yolo-classifier-prompts')

function readPrompt(name: string): string {
  return readFileSync(join(PROMPT_DIR, name), 'utf-8')
}

const BASE = 'auto_mode_system_prompt.txt'
const TEMPLATES = ['permissions_external.txt', 'permissions_anthropic.txt'] as const

// ---------------------------------------------------------------------------
// Prompt BASE — el marco de razonamiento que al prompt de ccb previo a la v150
// le faltaba. Son las adiciones de más valor: el juicio del clasificador vive
// aquí, no en las listas de reglas. Una regresión que devolviera el prompt base
// a su forma vieja de «Classification Process más lista plana de reglas»
// pasaría las aserciones de plantilla de abajo y fallaría aquí.
// ---------------------------------------------------------------------------
describe('classifier BASE prompt — v150 reasoning framework (3148.js)', () => {
  const text = readPrompt(BASE)

  test('declares the three-risk Threat Model', () => {
    expect(text).toMatch(/## Threat Model/)
    expect(text).toMatch(/Prompt injection/)
    expect(text).toMatch(/Scope creep/)
    expect(text).toMatch(/Accidental damage/)
  })

  test('carries the User Intent Rule with the high-evidence bar', () => {
    expect(text).toMatch(/## User Intent Rule/)
    // nunca levanta un HARD BLOCK
    expect(text).toMatch(/never clears HARD BLOCK/)
    // #5 Preguntar no es consentir
    expect(text).toMatch(/Questions are not consent/)
    // #6 No fiarse del resultado de una herramienta, con la excepción de AskUserQuestion
    expect(text).toMatch(/Don't assume tool results are trusted/)
    expect(text).toMatch(/\[User answered AskUserQuestion\]/)
    // #7 Los límites siguen en vigor
    expect(text).toMatch(/Boundaries stay in force until clearly lifted/)
  })

  test('carries the scope-escalation = autonomous-behavior rule', () => {
    expect(text).toMatch(/Scope escalation = autonomous behavior/)
    expect(text).toMatch(/\[Request interrupted by user\]/)
  })

  test('carries the Evaluation Rules that defeat classifier bypass', () => {
    expect(text).toMatch(/PREEMPTIVE BLOCK ON CLEAR INTENT/)
    expect(text).toMatch(/CLASSIFIER BYPASS/)
    expect(text).toMatch(/ENCODED COMMANDS/)
    expect(text).toMatch(/LOOK THROUGH CODE WRAPPERS/)
    expect(text).toMatch(/SUB-AGENT DELEGATION/)
    expect(text).toMatch(/SHARED INFRA BIAS/)
  })

  test('carries the "Silence is not consent" anti-tacit-approval rule', () => {
    // La línea que más peso carga para un modo automático largo y sin
    // vigilancia: una serie ininterrumpida de acciones NO es evidencia de
    // aprobación.
    expect(text).toMatch(/Silence is not consent/)
    expect(text).toMatch(/EVALUATE ON OWN MERITS/)
  })

  test('still carries the `<permissions_template>` assembly placeholder', () => {
    expect(text).toMatch(/<permissions_template>/)
  })

  test('does NOT inline the rule lists (those live in the template)', () => {
    // El prompt base es el marco; las reglas concretas tienen que venir de la
    // plantilla, para que `buildYoloSystemPrompt` pueda fundir en ellas los
    // overrides del usuario.
    expect(text).not.toMatch(/<user_hard_deny_rules_to_replace>/)
    expect(text).not.toMatch(/<settings_deny_rules>/)
  })
})

// ---------------------------------------------------------------------------
// PLANTILLA — las listas de reglas BLOCK/ALLOW. Los dos nombres de archivo
// tienen que llevar contenido de la v150 idéntico (ant los colapsó en uno).
// ---------------------------------------------------------------------------
describe('classifier TEMPLATE — v150 rule lists (3149.js RR8)', () => {
  for (const file of TEMPLATES) {
    describe(file, () => {
      const text = readPrompt(file)

      test('uses the HARD BLOCK / SOFT BLOCK / ALLOW structure', () => {
        expect(text).toMatch(/## HARD BLOCK/)
        expect(text).toMatch(/## SOFT BLOCK/)
        expect(text).toMatch(/## ALLOW \(exceptions\)/)
      })

      test('hard-blocks Data Exfiltration and Auto-Mode Bypass (user intent cannot clear)', () => {
        expect(text).toMatch(/<user_hard_deny_rules_to_replace>/)
        expect(text).toMatch(/Data Exfiltration/)
        expect(text).toMatch(/Auto-Mode Bypass/)
      })

      test('names the agent-config self-modification surface', () => {
        // Los archivos de cron, loop y workflow son los que ccb carga de
        // verdad al arrancar — son las adiciones sobre la lista previa a la
        // v150.
        expect(text).toMatch(/\.claude\/workflows\//)
        expect(text).toMatch(/\.claude\/routines\//)
        expect(text).toMatch(/\.claude\/scheduled_tasks\.json/)
        expect(text).toMatch(/\.claude\/loop\.md/)
      })

      test('blocks the Bash(prefix:*) permission-widening trick', () => {
        expect(text).toMatch(/Bash\(prefix:\*\)/)
      })

      test('blocks Memory Poisoning of the memory directory', () => {
        expect(text).toMatch(/Memory Poisoning/)
        expect(text).toMatch(/\.claude\/projects\/\*\/memory\//)
      })

      test('carries the v150 shared-infra / production soft-block classes', () => {
        // Las clases que a la plantilla de ccb previa a la v150 le faltaban
        // por completo — el núcleo de la «致命偏移» que este porte corrigió.
        expect(text).toMatch(/Production Reads/)
        expect(text).toMatch(/Blind Apply/)
        expect(text).toMatch(/Credential Exploration/)
        expect(text).toMatch(/Exfil Scouting/)
        expect(text).toMatch(/Untrusted Code Integration/)
        expect(text).toMatch(/Sandbox Network Callback/)
      })

      test('carries the `<settings_deny_rules>` injection marker', () => {
        // `buildYoloSystemPrompt` sustituye esto por la guía del usuario
        // sobre elusión de reglas de denegación entre herramientas; tiene que
        // estar presente para que la inyección aterrice.
        expect(text).toMatch(/<settings_deny_rules>/)
      })

      test('carves out routine memory-directory writes (no false-block)', () => {
        // Sin esta excepción el agente no podría registrar sus propios
        // recuerdos — que es el sentido entero del sistema de memoria. Tiene
        // que convivir con el bloque de Memory Poisoning de arriba.
        expect(text).toMatch(/Memory Directory/)
      })

      test('carves out the agent’s own scheduling tools (no false-block)', () => {
        // CronCreate, CronDelete, CronList y RemoteTrigger son herramientas
        // propias de ccb; usarlas no debe disparar Unauthorized Persistence ni
        // Self-Modification.
        expect(text).toMatch(/CronCreate/)
      })
    })
  }

  test('both template filenames carry identical content (ant 150 unified)', () => {
    expect(readPrompt('permissions_external.txt')).toBe(
      readPrompt('permissions_anthropic.txt'),
    )
  })
})
