```yml
work_package_id: 2026-04-05-01-09-22-thyrox-capabilities-integration
closed_at: 2026-04-06
project: THYROX
source_phase: Phase 7 — TRACK
total_lessons: 5
author: Claude
```

# Lessons Learned: THYROX Capabilities Integration — MCP + Native Agents

## Propósito

Capturar qué aprendió el equipo durante la FASE 11 — integración de MCP servers y native agents
en el framework THYROX. Énfasis especial en el incidente de sobreescritura de `task-planner.md`
al final de la ejecución, que reveló dos problemas sistémicos distintos.

---

## Lecciones

### L-030: Sobreescritura de archivo completado después del push final

**Qué pasó**

Después de completar T-027 (commit de cierre + push), se escribió una segunda versión de
`.claude/agents/task-planner.md` con el campo `model: claude-sonnet-4-6` agregado en el
frontmatter. El archivo ya había sido commiteado y pusheado en su versión correcta. La
sobreescritura ocurrió sin tarea asociada, sin justificación en el task-plan, y en una fase
donde ya no debía modificarse código.

**Raíz**

No existe una condición de stop explícita después del commit+push final. Phase 6 termina cuando
"todas las tareas están commiteadas", pero el texto del SKILL no dice "no modificar archivos
después del último commit". Esta ausencia creó una ventana donde la modificación post-cierre
fue posible sin activar ningún gate.

El detonador específico fue la transición de una tarea de commit (T-027) a la siguiente acción
(Phase 7: TRACK) — en ese intersticio, sin una tarea activa ni un checkpoint, se modificó un
archivo ya finalizado.

**Fix aplicado**

Identificado y restaurado manualmente. No se commiteó la versión incorrecta. La restauración
fue al contenido original exacto porque el archivo era idéntico al commiteado.

**Regla**

Cuando el último commit del work package está done y pusheado, no modificar ningún archivo del
proyecto antes de iniciar formalmente Phase 7: TRACK. Si surge una mejora, abrirla como nueva
tarea en el task-plan antes de implementarla.

---

### L-031: Campo `model` en native agents — dualidad de schemas no documentada

**Qué pasó**

El sistema tiene dos formatos de definición de agente con campos distintos:
- `registry/agents/*.yml` (fuente del bootstrap) incluye `model: claude-sonnet-4-6`
- `.claude/agents/*.md` (native Claude Code agents) no requiere `model` en frontmatter

Al escribir la segunda versión de `task-planner.md`, se trasladó el campo `model` del schema
YAML al formato nativo — mezclando dos schemas que coexisten en el mismo proyecto pero sirven
propósitos distintos.

**Raíz**

La razón declarada en el momento fue "Claude Code lo infiere" — y esto es técnicamente correcto:
cuando `.claude/agents/*.md` no incluye `model`, Claude Code usa el modelo activo de la sesión.
El campo `model` ES válido en el frontmatter nativo, pero incluirlo solo en algunos agentes crea
inconsistencia dentro del mismo directorio.

La raíz profunda es que los dos schemas nunca se documentaron como distintos. `registry/agents/`
es la fuente de bootstrap (incluye `model` porque bootstrap lo usa para generar el agente). Las
`.claude/agents/*.md` son el output final que Claude Code lee directamente. Un campo que tiene
sentido en la fuente no necesariamente debe copiarse al output.

**Fix aplicado**

Restaurar `task-planner.md` sin el campo `model`, consistente con los 3 agentes restantes
(task-executor, tech-detector, skill-generator). Decisión: **ningún native agent en
`.claude/agents/` incluye `model`** — se hereda del modelo activo en la sesión.

Esta decisión no está documentada formalmente. Ver deuda pendiente T-DT-007.

**Regla**

Cuando se trabaja con dos schemas paralelos para el mismo concepto (ej: YAML de registry vs
frontmatter nativo), documentar explícitamente qué campos pertenecen a cada schema y cuáles NO
se transfieren. La pregunta correcta es "¿este campo es para el bootstrap o para Claude Code?"
— no "¿es válido aquí?".

---

### L-032: "Claude Code lo infiere" — justificación post-hoc de una corrección

**Qué pasó**

La frase "Claude Code lo infiere" fue usada como justificación para restaurar el archivo. Es
correcta como hecho técnico, pero fue formulada *después* de decidir restaurar, no antes. El
orden real fue:
1. Ver inconsistencia (otros 3 agentes no tienen `model`)
2. Decidir restaurar
3. Justificar: "Claude Code lo infiere"

Esto es justificación post-hoc, no razonamiento causal. La razón real para restaurar fue la
*inconsistencia de formato* entre los 4 agentes del directorio, no el conocimiento de la
inferencia del modelo.

**Raíz**

Sin una decision registrada sobre si los native agents deben o no incluir `model`, cada sesión
puede tomar la decisión de forma distinta. La falta de un estándar explícito hace que la
coherencia dependa de que el mismo agente recuerde la decisión anterior.

**Fix aplicado**

Registrar la decisión como parte de este lessons-learned. Ver deuda T-DT-007 para formalización.

**Regla**

Cuando se toma una decisión de formato/schema (incluir o no un campo), registrarla en el momento,
no inferirla de la consistencia observada. "Los otros 3 no tienen `model`" es una observación;
la regla es "los native agents no incluyen `model` porque Claude Code lo infiere y la
consistencia del directorio es más importante que la explicitez del campo".

---

### L-033: Sesiones multi-sesión con contexto parcial requieren verificación de estado previo

**Qué pasó**

La tarea T-014..T-016 (skill templates) fueron creadas al final de la sesión anterior pero el
task-plan seguía marcando `[ ]` al inicio de esta sesión. El session-start hook reportó T-014
como "próxima tarea", causando confusión inicial hasta verificar que los archivos ya existían.

**Raíz**

El task-plan es el único estado de verdad para Phase 6: EXECUTE. Cuando un archivo es creado
pero el checkbox no se actualiza antes de cerrar la sesión, el estado diverge. El session-start
hook lee el task-plan, no el filesystem — correctamente, porque el task-plan es la fuente de
verdad — pero el divergencia era real.

**Fix aplicado**

Verificar con `ls` antes de ejecutar la tarea reportada como pendiente. Los archivos existían;
se actualizaron los checkboxes y se avanzó. Sin impacto en el trabajo final.

**Regla**

Al retomar un WP en una sesión nueva: verificar el filesystem contra el task-plan antes de
ejecutar la primera tarea. Si hay divergencia (archivo existe pero checkbox `[ ]`), actualizar
el checkbox primero y documentar en el execution-log el motivo.

---

### L-034: Validación E2E reveló discrepancia entre spec y comportamiento esperado

**Qué pasó**

El SPEC-012 (T-022) decía "bootstrap genera 7 agentes en `.claude/agents/`" pero la validación
con `--stack react,nodejs` generó 6 (4 core + 2 tech). El count de 7 asumía `--stack
react,nodejs,postgresql` (3 techs), no 2.

**Raíz**

El spec fue escrito con el stack completo en mente (react+nodejs+postgresql), pero el comando
de validación fue reducido a `--stack react,nodejs` para ser más rápido. La discrepancia no
fue detectada en Phase 4: STRUCTURE porque el número "7" se copió del diseño general sin
verificar con el comando específico del test.

**Fix aplicado**

Ejecutar el test con el comando documentado en el spec y anotar la discrepancia. El
comportamiento del bootstrap es correcto — genera exactamente los agentes correspondientes al
stack pedido. El error era en el número del spec, no en el código.

**Regla**

Los acceptance criteria de validación E2E deben incluir el comando exacto Y el output esperado
específico de ese comando, no el output del sistema completo. "7 agentes" es correcto para el
sistema completo; "6 agentes" es correcto para `--stack react,nodejs`. Especificar ambos o
elegir uno y ser consistente.

---

## Patrones identificados

| Patrón | Lecciones | Acción sistémica |
|--------|-----------|-----------------|
| Modificación post-cierre sin tarea | L-030 | Agregar gate explícito en SKILL.md Phase 6: "después del push final, no modificar archivos sin nueva tarea" |
| Dualidad de schemas sin documentar | L-031, L-032 | Documentar decisión de campos en native agents (T-DT-007) |
| Divergencia task-plan vs filesystem en sesiones multi-día | L-033 | Agregar paso de "verificar filesystem vs task-plan" en session-start o Phase 6 step 1 |
| Spec con valores absolutos en tests parametrizados | L-034 | En acceptance criteria E2E, incluir el comando exacto y el output específico de ese comando |

---

## Qué replicar

- **Commits convencionales agrupados por capa**: separar feat(mcp), feat(registry), feat(agents),
  feat(bootstrap) en commits distintos facilitó el review y el rollback por capas. Mantener este
  patrón en WPs con múltiples subsistemas.

- **Validación E2E como tarea explícita (T-022)**: incluir un checkpoint de validación end-to-end
  en el task-plan, no dejarlo implícito. Si falla, hay una tarea nombrada para diagnosticar.

- **Paralelismo explícito con `[P]`**: marcar tareas paralelas en el task-plan redujo el tiempo
  de ejecución. Las 7 YAML, los 3 templates y los 4 native agents se crearon en paralelo sin
  bloqueos.

- **Bootstrap idempotente por diseño**: el criterio de aceptación incluía idempotencia (skip
  sin --force). Diseñar para idempotencia desde el principio evita regresiones en setups parciales.

---

## Deuda pendiente

| ID | Descripción | Prioridad | Work package sugerido |
|----|-------------|-----------|----------------------|
| T-DT-007 | Documentar decisión: native agents en `.claude/agents/` NO incluyen campo `model` — Claude Code lo hereda de la sesión. Formalizar en conventions.md o en una nota en el README de `.claude/agents/` | media | ad-hoc o próximo WP de documentación |
| T-DT-008 | SKILL.md Phase 6: agregar gate explícito "después del push final, STOP — ninguna modificación sin nueva tarea en el task-plan" | media | próxima sesión de mejora de SKILL |
| T-DT-009 | postgresql-expert.md no se generó en la validación E2E (solo se probó --stack react,nodejs). Verificar que bootstrap genera el agente correctamente con --stack postgresql | baja | ad-hoc |

---

## Checklist de cierre

- [x] Cada lección tiene raíz identificada (no solo síntoma)
- [x] Cada lección tiene regla generalizable
- [x] Patrones sistémicos documentados si aplica
- [x] Deuda técnica registrada con prioridad
- [ ] Documento commiteado en `work/.../lessons-learned.md`
