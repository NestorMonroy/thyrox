```yml
work_package_id: 2026-04-12-10-10-50-skill-authoring-modernization
closed_at: 2026-04-13 20:00:00
project: thyrox-framework
source_phase: Phase 7 — TRACK
total_lessons: 8
fase: FASE 33
```

# Lessons Learned: skill-authoring-modernization (FASE 33)

---

## Lecciones

### L-001: El Write tool no elimina el razonamiento previo silencioso

**Qué pasó**

Al intentar generar el `requirements-spec.md` con el Write tool (después de creer que el problema era "respuesta narrativa larga"), el timeout persistió. El modelo procesó todo el contexto acumulado de 3 agentes (~300KB) antes de emitir el primer token — incluso para tool calls.

**Raíz**

`Time-to-First-Token (TTFToken) = f(tamaño del contexto)`. Mayor contexto → mayor TTFToken. Si TTFToken > `CLAUDE_STREAM_IDLE_TIMEOUT_MS`, el timeout ocurre antes de cualquier output, independientemente de la estrategia de generación (narrativa vs Write tool).

**Fix aplicado**

`CLAUDE_STREAM_IDLE_TIMEOUT_MS=120000` en `settings.json`. Nueva sesión para que el fix aplique al arranque.

**Regla**

Cuando el contexto acumulado supera ~200KB y se experimentan timeouts, la única solución es reducir el contexto (`/compact`) o abrir sesión nueva con `CLAUDE_STREAM_IDLE_TIMEOUT_MS` configurado. Cambiar la estrategia de generación no resuelve el problema si la causa es el TTFToken.

---

### L-002: settings.json se lee al arrancar — los fixes de env no aplican a la sesión activa

**Qué pasó**

Se agregó `CLAUDE_STREAM_IDLE_TIMEOUT_MS=120000` a `settings.json` dentro de la sesión que tenía el timeout. El error persistió en la misma sesión.

**Raíz**

`settings.json` se lee una sola vez al arrancar Claude Code. Las variables de entorno definidas en `settings.json.env` no se recargan en tiempo de ejecución. La sesión continúa con el valor que tenía al inicio.

**Fix aplicado**

Cerrar la sesión y reiniciar. En la nueva sesión el valor ya aplica.

**Regla**

Cuando [se modifica `settings.json.env` para resolver un problema], hacer [reiniciar la sesión inmediatamente] porque [los cambios en env vars solo aplican al arranque, no a la sesión actual].

---

### L-003: El diagnóstico dentro de la sesión afectada agrava el problema

**Qué pasó**

Se crearon 4 diagramas de Ishikawa para analizar el timeout dentro de la misma sesión que lo sufría. Cada Ishikawa agregó ~100 líneas de contexto → mayor TTFToken → timeouts más frecuentes → más análisis → loop de degradación.

**Raíz**

Anti-patrón de diagnóstico: analizar el problema dentro del sistema que lo padece consume el mismo recurso escaso (context budget / TTFToken) que se está tratando de preservar.

**Fix aplicado**

Crear WP separado (`ishikawa-stream-analysis`) con sesión nueva y contexto limpio para el análisis profundo.

**Regla**

Cuando [una sesión experimenta timeouts frecuentes y se necesita diagnosticar la causa], hacer [abrir sesión nueva con contexto mínimo para el diagnóstico] porque [agregar análisis a la sesión afectada empeora la condición que se está diagnosticando].

---

### L-004: Los agentes paralelos resuelven el contexto de sub-agentes, NO el timeout de síntesis del padre

**Qué pasó**

Se usaron 4 agentes paralelos para crear los 18 archivos de referencia. Funcionó para la creación. Sin embargo, en intentos previos el padre intentaba "sintetizar" el output de los agentes como respuesta narrativa → timeout del padre.

**Raíz**

`run_in_background` aisla el contexto de los sub-agentes pero el padre sigue siendo responsable de la síntesis. Si la síntesis es larga (700+ líneas de texto) o requiere razonamiento sobre grandes outputs, el padre también puede hacer timeout.

**Fix aplicado**

El padre solo orquesta (lanza agentes, valida commits) y NO genera contenido largo. Los agentes crean los archivos directamente con Write tool y hacen sus propios commits.

**Regla**

Cuando [se usa el patrón de agentes paralelos], hacer [que cada agente commit su propio trabajo y el padre solo orqueste] porque [el padre también está sujeto a timeout si debe sintetizar grandes outputs].

---

### L-005: Write permission para archivos fuera de context/work/ no aplica a sub-agentes en background

**Qué pasó**

Los agentes en background (Agent-C especialmente) completaron sin errores pero no pudieron crear archivos en `.claude/references/` — solo en `context/work/**` que estaba en el allow list.

**Raíz**

El allow list de `settings.json` tiene `Write(/.claude/context/work/**)` pero no `Write(/.claude/references/**)`. Los agentes en background no pueden solicitar aprobación interactiva al usuario (no hay UI disponible).

**Fix aplicado**

Los archivos fueron creados desde la sesión principal (que tiene `acceptEdits` mode y puede escribir a `.claude/references/`).

**Regla**

Cuando [se lanza un sub-agente en background que necesita Write a archivos fuera de `context/work/`], hacer [agregar el path al allow list en `settings.json` antes de lanzar el agente, o crear los archivos desde la sesión principal] porque [los agentes en background no pueden solicitar permisos interactivos].

---

### L-006: Phase 4 STRUCTURE puede omitirse con aprobación explícita del usuario cuando el scope ya está claro en Phase 3

**Qué pasó**

Phase 4 (requirements-spec) nunca se completó formalmente. Se intentó 4 veces — fallando por stream timeout. El usuario aprobó pasar directamente a Phase 6 con el plan de Phase 3 como guía.

**Raíz**

Phase 4 añade valor cuando el scope tiene ambigüedades que requieren especificación detallada. En este WP, el scope ya estaba completamente definido en Phase 3 (plan.md con tabla de secciones por archivo). La spec hubiera duplicado el plan.

**Fix aplicado**

Proceder a Phase 6 con aprobación explícita del usuario. El plan.md sirvió como especificación de facto.

**Regla**

Cuando [Phase 3 ya especifica el contenido de cada archivo con suficiente detalle], hacer [proponer al usuario omitir Phase 4 con justificación explícita] porque [una spec que duplica el plan no agrega valor y consume contexto].

---

### L-007: La estrategia de 4 agentes paralelos para crear 18+ archivos es efectiva cuando el allow list está correctamente configurado

**Qué pasó**

El mismo trabajo que falló múltiples veces en sesiones secuenciales (timeout, contexto saturado) se completó en una sola sesión con 4 agentes paralelos, cada uno trabajando en un grupo de archivos relacionados.

**Raíz**

El problema no era la complejidad del contenido sino la saturación del contexto del padre. Los agentes en background tienen contexto propio y no saturan el contexto del padre.

**Fix aplicado**

4 grupos paralelos (A: authoring, B: platform, C: patterns, D: streaming+updates). Cada agente con sus fuentes y commit propio.

**Regla**

Cuando [hay 5+ archivos independientes a crear en el mismo WP], hacer [paralelizar con 3-4 agentes por grupo de afinidad temática, cada uno con su commit] porque [el padre no satura su contexto y el trabajo escala linealmente con los agentes].

---

### L-008: El WP se expandió de 14 a 18 archivos entre Phase 2 y Phase 3

**Qué pasó**

Phase 1 estimó 14 archivos. El deep-review entre Phase 2 y Phase 3 reveló 4 archivos adicionales (stream-resilience, streaming-errors, long-running-calls, component-decision). El scope final fue 18 archivos + 2 de cierre.

**Raíz**

El análisis de Phase 1 identificó los gaps pero subestimó cuántos archivos separados requería cubrirlos. Solo al hacer el mapa de contenido detallado (Phase 2) emergieron las separaciones naturales.

**Fix aplicado**

Se documentó la expansión en el plan (scope creep resuelto), se actualizó el risk register. No causó retrabajo porque se detectó antes de Phase 4.

**Regla**

Cuando [el scope de archivos a crear supera 10], hacer [un deep-review Phase 2→3 explícito antes de commitear el plan] porque [la granularidad real del trabajo solo emerge al hacer el mapa de contenido detallado por archivo].

---

## Patrones identificados

| Patrón | Lecciones relacionadas | Acción sistémica |
|--------|----------------------|------------------|
| **Context saturation loop** | L-001, L-002, L-003 | Documentado en `stream-resilience.md` y `streaming-errors.md`. Regla en `diagrama-ishikawa` agente. |
| **Sub-agent permission gap** | L-005 | Añadir `Write(/.claude/references/**)` al allow list para WPs de documentación. |
| **Parallel agents para docs** | L-004, L-007 | Patrón documentado en `long-running-calls.md` §Estrategia THYROX. |

---

## Qué replicar

- **4 agentes paralelos por grupo temático**: Escaló perfectamente para 18 archivos. Cada agente commit propio = historial limpio y granular.
- **Deep-review Phase 2→3**: Detectó 4 archivos faltantes antes de ejecutar. Previno retrabajo.
- **WP paralelo para análisis de incidentes**: El `ishikawa-stream-analysis` WP mantuvo el análisis separado del trabajo principal. Contexto limpio para cada propósito.

---

## Deuda pendiente

| ID | Descripción | Prioridad | Work package sugerido |
|----|-------------|-----------|----------------------|
| — | Allow list `Write(/.claude/references/**)` faltante para sub-agentes | media | technical-debt-resolution (próximo WP) |

---

## Checklist de cierre

- [x] Cada lección tiene raíz identificada (no solo síntoma)
- [x] Cada lección tiene regla generalizable
- [x] Patrones sistémicos documentados si aplica
- [x] Deuda técnica registrada con prioridad
- [x] Documento commiteado en `work/.../lessons-learned.md`
