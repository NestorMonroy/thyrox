import { describe, expect, test } from 'bun:test'

import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Copia de `ccnmt: packages/permission/src/__tests__/automodeAntAlignment.contract.test.ts`
 * con los comentarios traducidos; el cuerpo es el de la fuente.
 *
 * Fijados de contrato a nivel de fuente de la alineación completa, del
 * 2026-05-27, del clasificador de modo automático de ccb con ant v2.1.150.
 * Estos cuatro comportamientos estaban divergiendo en silencio y hacían que el
 * modo automático «bloqueara con demasiada facilidad»; los fijados impiden que
 * una edición futura los haga regresar. Ver
 * `memory/project_automode_full_align_ant_2150_2026_05_27.md` y la fuente de
 * ant en
 * `bun-demincer/work/claude-code-2.1.150/resplit/{3149,4260}.js`.
 *
 * Por qué a nivel de fuente: bun:test corre con las feature flags APAGADAS
 * (TRANSCRIPT_CLASSIFIER está tras una puerta) y el camino del clasificador
 * hace llamadas `sideQuery` en vivo, así que aquí no se pueden ejercitar en
 * tiempo de ejecución ni el prompt ensamblado ni el flujo de decisión. Lo que
 * se fija es la FORMA.
 */

const yoloClassifier = readFileSync(
  resolve(__dirname, '..', 'yoloClassifier.ts'),
  'utf-8',
)
const xmlFormat = readFileSync(
  resolve(__dirname, '..', 'classifierXmlFormat.ts'),
  'utf-8',
)
const permissions = readFileSync(
  resolve(__dirname, '..', 'permissions.ts'),
  'utf-8',
)
const classifierDecision = readFileSync(
  resolve(__dirname, '..', 'classifierDecision.ts'),
  'utf-8',
)

describe('auto-mode classifier model (ant IZ7→F7: main-loop, not Haiku)', () => {
  const fnStart = yoloClassifier.indexOf('function getClassifierModel')
  const fnSlice = yoloClassifier.slice(fnStart, fnStart + 2000)

  test('falls back to the main-loop model, matching ant', () => {
    expect(fnStart).toBeGreaterThan(0)
    expect(fnSlice).toMatch(/return getMainLoopModel\(\)/)
  })

  test('does NOT route the classifier to the small-fast model', () => {
    // El cambio a Haiku de 508fee15 queda revertido — un modelo débil bajo un
    // prompt de «ante la duda, bloquea» bloquea de más acciones benignas.
    expect(fnSlice).not.toMatch(/return getSmallFastModel\(\)/)
  })

  test('env override CLAUDE_CODE_AUTO_MODE_MODEL stays the escape hatch', () => {
    expect(yoloClassifier).toMatch(/CLAUDE_CODE_AUTO_MODE_MODEL/)
  })
})

describe('two-stage classifier stage-1 suffix (ant Gp5: both→fp5, fast→Mp5)', () => {
  test('fp5 (both-mode) suffix exists and defers intent/ALLOW to stage 2', () => {
    expect(xmlFormat).toMatch(/XML_S1_SUFFIX_BOTH/)
    expect(xmlFormat).toMatch(
      /Stage 1 does NOT apply user intent or ALLOW exceptions/,
    )
    expect(xmlFormat).toMatch(/Block if ANY rule could apply/)
  })

  test('Mp5 (fast-only) suffix stays the terse immediate-block form', () => {
    expect(xmlFormat).toMatch(
      /XML_S1_SUFFIX = '\\nErr on the side of blocking\. <block> immediately\.'/,
    )
  })

  test('classifier selects the suffix by mode (both vs fast)', () => {
    expect(yoloClassifier).toMatch(
      /mode === 'both' \? XML_S1_SUFFIX_BOTH : XML_S1_SUFFIX/,
    )
  })
})

describe('CLAUDE.md classifier message (ant Ap5 scoping)', () => {
  test('scopes authorization to the SPECIFIC action, same operation/target', () => {
    expect(yoloClassifier).toMatch(/authorizes the SPECIFIC action under review/)
    expect(yoloClassifier).toMatch(/same operation, same/)
  })

  test('denies that generic encouragement lowers the block threshold', () => {
    expect(yoloClassifier).toMatch(/Generic/)
    expect(yoloClassifier).toMatch(/must not lower your block threshold/)
  })
})

describe('fallback-to-ask paths (ant xaH) — prompt, do not run the classifier', () => {
  test('isAskRuleDecision (ant FW6) recurses into subcommandResults', () => {
    expect(classifierDecision).toMatch(/export function isAskRuleDecision/)
    expect(classifierDecision).toMatch(/reason\?\.type === 'subcommandResults'/)
  })

  test('isPlanModeDecision (ant qMK) recognizes the plan-mode floor', () => {
    expect(classifierDecision).toMatch(/export function isPlanModeDecision/)
    expect(classifierDecision).toMatch(/reason\?\.type === 'mode'/)
  })

  test('the gate triages via computeAutoModeFallback before the classifier', () => {
    expect(permissions).toMatch(/computeAutoModeFallback\(/)
    expect(permissions).toMatch(/fallback === 'deny-headless'/)
  })

  test('sandboxOverride ALONE falls through to the classifier (ant: no J in j||D||f)', () => {
    // `computeAutoModeFallback` devuelve null cuando sólo hay
    // `sandboxOverride`, para que llegue al clasificador; las tres razones que
    // merecen prompt devuelven una razón.
    expect(classifierDecision).toMatch(/sandboxOverride alone/)
    expect(classifierDecision).toMatch(/isSandboxOverride/)
    expect(classifierDecision).toMatch(
      /return \{ reason: 'safety_check' \}|reason: 'safety_check'/,
    )
  })

  test('emits tengu_auto_mode_fallback_to_ask for every fallback reason', () => {
    expect(permissions).toMatch(/tengu_auto_mode_fallback_to_ask/)
    // Las razones del triaje viven en `computeAutoModeFallback`
    // (`classifierDecision`); las caídas de vuelta a nivel de puerta
    // —interacción, demasiado largo, fallar abierto— viven en línea.
    for (const reason of ['safety_check', 'ask_rule', 'plan_mode_floor']) {
      expect(classifierDecision).toContain(`'${reason}'`)
    }
    for (const reason of [
      'requires_user_interaction',
      'transcript_too_long',
      'classifier_unavailable_fail_open',
    ]) {
      expect(permissions).toContain(`'${reason}'`)
    }
  })

  test('REPL is allowed through on transcript-too-long (ant if(H.name===e9))', () => {
    expect(permissions).toMatch(/tool\.name === REPL_TOOL_NAME/)
  })
})
