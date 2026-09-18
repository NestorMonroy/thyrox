/**
 * Copia de `ccnmt: packages/permission/src/components/PermissionExplanation.tsx`
 * con los comentarios traducidos; el cuerpo es el de la fuente.
 *
 * Interfaz de explicación de permiso.
 *
 * Renderiza, dentro del diálogo de confirmación de permiso, el explicador por
 * LLM que se abre con `ctrl+e`. Son tres partes (portadas de ant v2.1.150
 * 5236.js):
 *
 * - `usePermissionExplainer` (ant Wy6) — cablea el atajo
 *   `confirm:toggleExplanation`, arranca la llamada al LLM de un solo disparo
 *   al primer toggle, y aborta la petición en vuelo al desmontar.
 * - `PermissionExplanation` (ant Zy6) — el contenedor de Suspense. Muestra un
 *   shimmer de carga mientras la promesa resuelve.
 * - `PermissionExplanationContent` (ant APO) — renderiza la explicación ya
 *   resuelta, con su razonamiento y su línea de riesgo.
 *
 * La llamada al LLM lleva `.catch(() => null)` y es abortable, así que no
 * puede reventar el diálogo de permiso.
 */

import React, { Suspense, use, useCallback, useEffect, useRef, useState } from 'react'
import { Box, Text } from '@anthropic/ink'
import { useKeybinding } from '@anthropic/ink/keybindings'
import { logEvent } from '@claude-code-how-works/local-observability'
import { useShortcutDisplay } from '@claude-code-how-works/repl/keybindings/useShortcutDisplay.js'
import { ShimmerChar } from '@claude-code-how-works/repl/components/Spinner/ShimmerChar.js'
import { useShimmerAnimation } from '@claude-code-how-works/repl/components/Spinner/useShimmerAnimation.js'
import {
  generatePermissionExplanation,
  isPermissionExplainerEnabled,
  riskLevelColor,
  riskLevelLabel,
  type PermissionExplanation as ExplanationData,
} from '../permissionExplainer.js'

const LOADING_TEXT = 'Loading explanation\u2026'

/** Las entradas que el explicador necesita para describir una llamada de herramienta pendiente. */
export type PermissionExplainerInput = {
  toolName: string
  toolInput: unknown
  toolDescription?: string
  messages?: Parameters<typeof generatePermissionExplanation>[0]['messages']
}

export type PermissionExplainerState = {
  /** Si el bloque de explicación debe estar visible. */
  visible: boolean
  /** Si la funcionalidad del explicador está habilitada (gobierna la pista y el atajo). */
  enabled: boolean
  /** La cadena que se muestra para el atajo del toggle (por ejemplo «ctrl+e»). */
  chord: string
  /** La promesa de la explicación, en vuelo o ya resuelta; null antes del primer toggle. */
  promise: Promise<ExplanationData | null> | null
}

/**
 * ant Wy6 — es el dueño del atajo y del ciclo de vida de la llamada al LLM. Se
 * llama desde un componente de petición de permiso; el estado que devuelve se
 * renderiza con <PermissionExplanation />.
 */
export function usePermissionExplainer(
  input: PermissionExplainerInput,
): PermissionExplainerState {
  const enabled = isPermissionExplainerEnabled()
  const chord = useShortcutDisplay(
    'confirm:toggleExplanation',
    'Confirmation',
    'ctrl+e',
  )
  const [visible, setVisible] = useState(false)
  const [promise, setPromise] = useState<Promise<ExplanationData | null> | null>(
    null,
  )
  const abortRef = useRef<AbortController | null>(null)

  const handleToggle = useCallback(() => {
    // Arrancar la petición sólo la primera vez que se hace visible.
    if (!visible) {
      logEvent('tengu_permission_explainer_shortcut_used', {})
      if (!promise) {
        const controller = new AbortController()
        abortRef.current = controller
        setPromise(
          generatePermissionExplanation({
            toolName: input.toolName,
            toolInput: input.toolInput,
            toolDescription: input.toolDescription,
            messages: input.messages ?? [],
            signal: controller.signal,
          }).catch(() => null),
        )
      }
    }
    setVisible(prev => !prev)
  }, [visible, promise, input])

  useKeybinding('confirm:toggleExplanation', handleToggle, {
    context: 'Confirmation',
    isActive: enabled,
  })

  // Abortar cualquier petición en vuelo al desmontar.
  useEffect(() => () => abortRef.current?.abort(), [])

  return { visible, enabled, chord, promise }
}

/**
 * ant APO — renderiza la explicación ya resuelta. Suspende sobre la promesa con
 * `React.use` hasta que asienta.
 */
function PermissionExplanationContent({
  promise,
}: {
  promise: Promise<ExplanationData | null>
}): React.ReactNode {
  const data = use(promise)

  if (!data) {
    return (
      <Box marginTop={1}>
        <Text dimColor>Explanation unavailable</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text>{data.explanation}</Text>
      <Box marginTop={1}>
        <Text>{data.reasoning}</Text>
      </Box>
      <Box marginTop={1}>
        <Text>
          <Text color={riskLevelColor(data.riskLevel)}>
            {riskLevelLabel(data.riskLevel)}:
          </Text>
          <Text> {data.risk}</Text>
        </Text>
      </Box>
    </Box>
  )
}

/** ant KPO — el shimmer de carga que se muestra mientras la explicación se genera. */
function LoadingExplanation(): React.ReactNode {
  const [ref, glimmerIndex] = useShimmerAnimation(
    'responding',
    LOADING_TEXT,
    false,
  )
  return (
    <Box ref={ref}>
      <Text>
        {[...LOADING_TEXT].map((char, i) => (
          <ShimmerChar
            key={i}
            char={char}
            index={i}
            glimmerIndex={glimmerIndex}
            messageColor="inactive"
            shimmerColor="text"
          />
        ))}
      </Text>
    </Box>
  )
}

/**
 * ant Zy6 — el contenedor de Suspense. No renderiza nada hasta que el usuario
 * hace visible el explicador (y se ha arrancado una petición).
 */
export function PermissionExplanation({
  visible,
  promise,
}: {
  visible: boolean
  promise: Promise<ExplanationData | null> | null
}): React.ReactNode {
  if (!visible || !promise) return null
  return (
    <Suspense
      fallback={
        <Box marginTop={1}>
          <LoadingExplanation />
        </Box>
      }
    >
      <PermissionExplanationContent promise={promise} />
    </Suspense>
  )
}
