```yml
work_package_id: 2026-04-09-17-28-34-auto-operations
created_at: 2026-04-09 22:30:00
project: thyrox
fase: FASE 28
source_phase: Phase 7 — TRACK
total_lessons: 8
```

# Lessons Learned — auto-operations (FASE 28)

## Propósito

Capturar qué aprendió el equipo durante FASE 28 — sincronización determinista de
`now.md` via hooks reactivos. Qué funcionó, qué falló, reglas generalizables.

---

## Lecciones

### L-001: Los hooks de sesión NO se recargan al editar settings.json en la misma sesión

**Qué pasó**

Se agregó el `PostToolUse` hook en `settings.json` durante Phase 6 (T-005). Al
intentar validar el hook en T-017 Step 2, el hook NO disparó — el Write al WP no
actualizó `now.md::current_work` automáticamente.

**Raíz**

Claude Code carga los hooks de `settings.json` al INICIO de la sesión, no on-demand.
Cualquier modificación a `settings.json` mid-session requiere reiniciar la sesión para
que los nuevos hooks sean efectivos.

**Fix aplicado**

T-017 documentado como PARTIAL con la limitación explícita. La validación completa del
PostToolUse hook se realiza en la siguiente sesión (la actual, FASE 28 Phase 7).

**Regla**

Cuando se agrega o modifica un hook en `settings.json`, planificar la validación en
una sesión SIGUIENTE — nunca intentar validar el hook en la misma sesión que se creó.
Documentar la limitación como "requiere nueva sesión" en el task-plan.

---

### L-002: `basename` con trailing slash falla en session-start hook

**Qué pasó**

Al iniciar esta sesión (Phase 7), el hook de session-start mostró "Sin work package activo"
aunque `now.md` tenía `current_work: work/2026-04-09-17-28-34-auto-operations/` (con
trailing slash). `PROJECT_ROOT` en `session-start.sh` usa una ruta relativa con `../../..`
que puede resolver incorrectamente dependiendo del directorio de trabajo del hook.

**Raíz**

`PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && cd .. && pwd)"` —
el path `../../..` desde `.claude/scripts/` sube demasiados niveles cuando el hook
se invoca con una ruta relativa. `CONTEXT_DIR` apunta fuera del proyecto.

**Fix aplicado**

No corregido en esta FASE (fuera de scope). Registrado como deuda técnica implícita
en TD-032 (sección bugs de session-start).

**Regla**

En scripts de hooks, usar siempre rutas absolutas basadas en el repositorio git:
`PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"`.
Nunca depender de `../../..` relativo — el directorio de invocación del hook puede
variar según el entorno Claude Code.

---

### L-003: Los gaps de Phase 6 solo se detectan con deep review explícito

**Qué pasó**

Phase 6 ejecutó las 20 tareas correctamente pero dejó 4 artefactos de tracking sin
actualizar: checkboxes del task-plan (todos `[ ]`), `execution-log.md` sin crear,
ROADMAP.md sin entrada de FASE 28, SP-02 del Stopping Point Manifest sin marcar.

**Raíz**

El framework no tiene mecanismo automático para verificar estos artefactos al final
de Phase 6. Las instrucciones existen en `workflow-execute/SKILL.md` pero el LLM las
omite silenciosamente cuando está enfocado en las tareas de implementación.

**Fix aplicado**

Detectados y corregidos en el deep review pre-gate Phase 6→7. Registrado como TD-032
con propuesta de solución en Plano A (instrucciones reforzadas) y Plano B (hooks automáticos).

**Regla**

El deep review pre-gate es OBLIGATORIO. Sin él, los artefactos de tracking se desfasan
de la implementación. El checklist de pre-Phase 7 en `workflow-execute/SKILL.md` debe
incluir verificación explícita de los 4 items: checkboxes, execution-log, ROADMAP, SP-Manifest.

---

### L-004: `echo 'phase: N' >>` introduce duplicados silenciosos en YAML

**Qué pasó**

Los 7 `workflow-*/SKILL.md` usaban `echo 'phase: Phase N' >> .claude/context/now.md`
como hook. Al dispararse en sesiones sucesivas, el campo `phase:` se duplicaba fuera
del bloque YAML (después del cierre ` ``` `), creando un archivo inválido.

**Raíz**

`>>` es append — no reemplaza el valor existente. El campo `phase:` original quedaba
en el YAML y el nuevo se añadía al final del documento, fuera del YAML frontmatter.

**Fix aplicado**

Reemplazado por `bash .claude/scripts/set-session-phase.sh 'Phase N'` que usa
`sed -i "s|^phase: .*|phase: $PHASE|"` — reemplaza in-place con anchor `^`.

**Regla**

Nunca usar `>>` para actualizar campos YAML existentes. Siempre usar `sed -i` con
anchor de línea (`^campo:`) para garantizar exactamente una ocurrencia del campo.

---

### L-005: La reclasificación de tamaño de WP debe ocurrir en Phase 2, no al llegar a Phase 5

**Qué pasó**

FASE 28 se clasificó inicialmente como "pequeño" (3 archivos nuevos). En Phase 2
se descubrió que el scope real eran 11 archivos (3 scripts + 7 SKILL.md + settings.json).
La reclasificación a "mediano" ocurrió durante Phase 2 — bien. Pero el plan original
en Phase 3 todavía omitía Phase 4 STRUCTURE del scope.

**Raíz**

La reclasificación en Phase 2 no propagó automáticamente la obligatoriedad de todas
las fases al plan de Phase 3. El LLM asumió que las fases previas al punto de
reclasificación seguían siendo opcionales.

**Fix aplicado**

El deep review de Phase 3 detectó el gap y Phase 4 STRUCTURE fue ejecutada.
TD-028 registrado: "Sin mecanismo para detectar reclasificación de tamaño mid-flight".

**Regla**

Al reclasificar el tamaño de un WP en cualquier phase, actualizar explícitamente el
`exit-conditions.md` de TODAS las fases marcando las que pasan de opcionales a obligatorias.
No confiar en que el LLM recuerde la reclasificación en sesiones posteriores.

---

### L-006: El deep review pre-gate atrapa errores costosos antes de que lleguen a ejecución

**Qué pasó**

En Phase 4, el spec-checklist se marcó 20/20 sin verificar los archivos reales.
El deep review manual encontró 4 gaps: `design.md` faltaba (Complejo requiere design.md),
SPEC-003 incompleto, SPEC-004 con estructura JSON incorrecta, SPEC-006 sin ubicación exacta.
Si estos gaps hubieran llegado a Phase 6, las tareas T-005 y T-013 habrían fallado.

**Raíz**

La instrucción "completar spec-checklist" fue ejecutada sin lectura de archivos reales.
El LLM asumió la estructura de settings.json y workflow-track/SKILL.md sin verificar.

**Fix aplicado**

Deep review obligatorio en cada phase transition, instaurado como práctica por el usuario.
TD-031 registrado: agregar sección de deep review en cada `workflow-*/SKILL.md`.

**Regla**

Antes de marcar cualquier spec-checklist como completo, leer los archivos REALES que
la spec describe — nunca asumir su contenido desde memoria. "Verificado" significa
comparar spec contra archivo real, no solo que el campo del checklist parece razonable.

---

### L-007: El Stopping Point Manifest se desactualiza si no se actualiza en el momento del gate

**Qué pasó**

SP-02 (GATE OPERACION Phase 5→6) fue aprobado por el usuario pero el Stopping Point
Manifest en `exit-conditions.md` quedó como "pendiente" durante toda Phase 6.
Solo se detectó y corrigió en el deep review de Phase 6.

**Raíz**

La instrucción de actualizar el manifest vive en la explicación de `workflow-execute/SKILL.md`
pero no hay un recordatorio en el momento exacto del gate (cuando el usuario dice "SI").

**Fix aplicado**

Corregido en deep review Phase 6. TD-032 propone agregar instrucción explícita:
"Después de aprobar GATE OPERACION: marcar SP-NNN como 'si' en el Stopping Point Manifest".

**Regla**

El SP-Manifest debe actualizarse INMEDIATAMENTE cuando el gate es aprobado — en la
misma respuesta donde se procesa el "SI" del usuario, antes de ejecutar la siguiente tarea.

---

### L-008: La práctica de deep review pre-gate debe formalizarse en los SKILL.md

**Qué pasó**

El usuario aplicó manualmente el deep review en cada transición de phase (3→4, 4→5, 5→6, 6→7)
porque el framework no lo instruía explícitamente. En cada caso se encontraron gaps
que hubieran pasado al siguiente phase sin detección.

**Raíz**

`workflow-*/SKILL.md` definen los gates humanos pero no incluyen un paso de "verificación
retrospectiva de la fase anterior" antes del gate. El deep review era responsabilidad
implícita del LLM sin recordatorio explícito.

**Fix aplicado**

TD-031 registrado. Propuesta: agregar sección "Deep review pre-gate (OBLIGATORIO)"
en cada `workflow-*/SKILL.md` con checklist específico por fase.

**Regla**

Un gate humano sin deep review previo es un gate débil. La secuencia correcta es:
Producir artefacto → Deep review (verificar contra fases anteriores y archivos reales) →
Corregir gaps → Presentar gate. Solo la última línea es visible para el usuario.

---

## Patrones identificados

| Patrón | Lecciones relacionadas | Acción sistémica |
|--------|----------------------|------------------|
| **Verificación por asunción** | L-006, L-002 | Agregar regla: "Verificar significa leer archivo real, no asumir" en workflow-structure/SKILL.md |
| **State drift en tracking** | L-003, L-007 | TD-032: Plano A (instrucciones) + Plano B (hooks automáticos) |
| **Gate sin deep review** | L-008, L-005 | TD-031: agregar sección deep review en 7 workflow-*/SKILL.md |
| **Hooks session-scoped** | L-001 | Documentar en references/hooks.md: "hook change requires session restart" |

---

## Qué replicar

- **Deep review obligatorio en cada phase transition**: detectó 12+ gaps a través de las 4 transiciones. Debe formalizarse.
- **Parallel execution en tasks independientes**: T-001/T-002/T-003 ejecutados en paralelo, sin conflictos — el patrón [P] funciona bien con tareas que tocan archivos disjuntos.
- **GATE OPERACION explícito**: la separación entre Fase A (scripts nuevos, sin gate) y Fase B (edición de config, con gate) resultó natural y efectiva.
- **Fallback jq→python3 en sync-wp-state.sh**: el patrón de tener un fallback para dependencias externas es robusto.

---

## Deuda pendiente

| ID | Descripción | Prioridad | Work package sugerido |
|----|-------------|-----------|----------------------|
| TD-028 | Mecanismo para detectar reclasificación de WP mid-flight | media | wp-reclassification-guard |
| TD-029 | Doble validación formal en transiciones de phase | alta | workflow-gate-hardening |
| TD-030 | Análisis de impacto de renombrar Phase N → workflow-* nomenclatura | baja | nomenclature-alignment |
| TD-031 | workflow-*/SKILL.md sin sección de deep review pre-gate | alta | workflow-deep-review |
| TD-032 | GAPs Phase 6 no prevenidos (checkboxes, execution-log, ROADMAP, SP-Manifest) | alta | phase6-tracking-automation |

---

## Checklist de cierre

- [x] Cada lección tiene raíz identificada (no solo síntoma)
- [x] Cada lección tiene regla generalizable
- [x] Patrones sistémicos documentados (4 patrones)
- [x] Deuda técnica registrada con prioridad (TD-028..TD-032)
- [x] Documento commiteado en `work/.../lessons-learned.md`
