```yml
project: thyrox-framework
work_package: 2026-04-11-23-27-08-technical-debt-audit
created_at: 2026-04-11 23:27:08
current_phase: Phase 7 — TRACK (cerrado)
open_risks: 0
mitigated_risks: 0
closed_risks: 5
```

# Risk Register — technical-debt-audit (FASE 32)

## Matriz de riesgos

| ID | Descripción | Probabilidad | Impacto | Severidad | Estado |
|----|-------------|:------------:|:-------:|:---------:|--------|
| R-01 | Split de technical-debt.md rompe referencias existentes | baja | alto | alta | cerrado |
| R-02 | Cambios en workflow-*/SKILL.md causan regresiones en nuevas sesiones | media | alto | alta | cerrado |
| R-03 | Scope creep — 24 TDs intentados en una sesión = ninguno bien hecho | alta | alto | crítica | cerrado |
| R-04 | TDs marcados [x] que en realidad no estaban implementados | media | medio | media | cerrado (parcialmente materializado) |
| R-05 | settings.json edición requiere prompt (ask) — puede interrumpir flujo | media | bajo | baja | cerrado (materializado, manejado) |

---

## Detalle de riesgos

### R-01: Split de technical-debt.md rompe referencias existentes

**Descripción:** Al crear `technical-debt-archive.md` y mover entradas `[x]` antiguas, puede haber referencias (en lecciones aprendidas, WP changelogs, ADRs) que apunten a secciones de `technical-debt.md` que ya no estarán en el archivo principal.

**Probabilidad:** baja
**Impacto:** alto (pérdida de trazabilidad si no se gestiona)
**Severidad:** alta
**Estado:** cerrado — 2026-04-12
**Fase de identificación:** Phase 1
**Cierre:** No materializado. Se eligió mover TDs `[x]` a `technical-debt-resolved.md` por WP (no a un único archive), lo que preserva trazabilidad por FASE. Referencias a TDs específicos usan IDs (TD-NNN), no anclas de sección.

**Señales de alerta**
- Una referencia tipo `context/technical-debt.md#TD-00X` apunta a una entrada que fue movida
- `git grep "technical-debt.md"` muestra referencias en múltiples archivos

**Mitigación**
- Solo mover entradas `[x]` — las pendientes `[ ]` permanecen en el archivo original
- El archivo de archive tiene header claro que indica que es historial, no índice activo
- Mantener anclas `<!-- TD-NNN -->` en el archivo de archive para referencias externas

**Plan de contingencia**
- Si una referencia queda rota: añadir nota en el punto de entrada del archive indicando la nueva ubicación

---

### R-02: Cambios en workflow-*/SKILL.md causan regresiones en nuevas sesiones

**Descripción:** Añadir secciones de validación pre-gate, deep review, y commit patterns a los 7 workflow-*/SKILL.md puede introducir instrucciones contradictorias o demasiado verbosas que Claude ignore en contextos compactos.

**Probabilidad:** media
**Impacto:** alto (afecta todas las sesiones futuras)
**Severidad:** alta
**Estado:** cerrado — 2026-04-12
**Fase de identificación:** Phase 1
**Cierre:** No materializado. Solo 3 SKILL.md modificados (workflow-plan, workflow-strategy, workflow-structure). Cambios añadidos fueron concretos y cortos (2-3 líneas por gate). Ninguno superó el umbral de 150 líneas.

**Señales de alerta**
- Un SKILL.md supera 150 líneas tras los cambios (riesgo de TD-004 regresión)
- Las nuevas secciones duplican instrucciones ya existentes

**Mitigación**
- Medir líneas actuales de cada SKILL antes de editar
- Añadir instrucciones concretas y cortas — no bloques explicativos
- Las validaciones pre-gate deben ser checklists compactos, no párrafos
- Priorizar los 7 SKILL por severidad del TD, no intentar los 7 en una tarea

**Plan de contingencia**
- Si un SKILL supera 150 líneas: mover contenido a references/ bajo demanda

---

### R-03: Scope creep — 24 TDs en una sesión = ninguno bien hecho

**Descripción:** El backlog tiene 24 TDs activos. Intentar todos en una sesión diluye la calidad de cada fix y aumenta la probabilidad de errores no detectados.

**Probabilidad:** alta (el impulso natural es "hacer todo")
**Impacto:** alto (trabajo incorrecto genera más deuda)
**Severidad:** crítica
**Estado:** cerrado — 2026-04-12
**Fase de identificación:** Phase 1
**Cierre:** Mitigado exitosamente. Phase 3 PLAN limitó scope a Grupos A+B (10 TDs). Groups C/D diferidos a FASE 33. 15 tareas atómicas ejecutadas, todas completadas. Ningún TD de Grupo C/D fue tocado.

**Señales de alerta**
- El task-plan tiene más de 30 tareas
- Se empieza a ejecutar sin haber completado spec de todos los TDs

**Mitigación**
- **Grupos A+B = scope de este WP.** Grupos C y D = WPs futuros o diferidos
- El Phase 3 PLAN debe documentar explícitamente qué queda fuera
- Gate SP-05 incluye revisión de número de tareas como condición de aprobación

**Plan de contingencia**
- Si context window se aproxima al límite durante Phase 6: commitear progreso, cerrar las tareas completadas, diferir el resto a FASE 33

---

### R-04: TDs marcados [x] que en realidad no estaban implementados

**Descripción:** La auditoría detectó que TD-007 tiene estado `[ ] Pendiente` pero el código ya lo implementa. El caso inverso también puede existir: TDs con `[x]` que en realidad solo están parcialmente implementados.

**Probabilidad:** media
**Impacto:** medio (falsa sensación de cierre)
**Severidad:** media
**Estado:** cerrado — 2026-04-12 (parcialmente materializado)
**Fase de identificación:** Phase 1
**Cierre:** Parcialmente materializado. TD-029, TD-031, TD-032, TD-033 tenían estado `[ ] Pendiente` pero la implementación ya existía. Corrección: T-001 los marcó `[x]` con verificación grep. El riesgo inverso (TD `[x]` pero no implementado) no se observó.

**Señales de alerta**
- Un TD marcado `[x]` no tiene criterio de cierre documentado
- El "implementado en FASE N" no se puede verificar con grep

**Mitigación**
- Antes de marcar cualquier TD como `[x]`, verificar con grep/read que el código esperado existe
- Criterio de cierre debe ser verificable, no declarativo

**Plan de contingencia**
- Si se descubre un TD mal marcado: reabrir en `technical-debt.md` con nota "reabierto FASE 32 — implementación incompleta"

---

### R-05: settings.json edición requiere prompt (ask) — puede interrumpir flujo

**Descripción:** `settings.json` está en la categoría "Configuración del framework" que requiere `ask` según el modelo de permisos. Al ejecutar TD-038 (eliminar reglas redundantes), el usuario necesitará aprobar la edición.

**Probabilidad:** media
**Impacto:** bajo (interrupción menor, no bloqueo)
**Severidad:** baja
**Estado:** cerrado — 2026-04-12 (materializado, manejado)
**Fase de identificación:** Phase 1
**Cierre:** Materializado. Claude solicitó aprobación para editar `settings.json`. El usuario aprobó (GATE OPERACIÓN manejado correctamente). Interrupción fue menor y esperada.

**Señales de alerta**
- Claude pide confirmación al intentar editar settings.json

**Mitigación**
- Presentar el diff exacto al usuario antes de solicitar la edición
- La tarea T-NNN de settings.json debe ser la primera tarea de su grupo para evitar interrupciones en medio de una secuencia

**Plan de contingencia**
- Si el usuario deniega: documentar en execution-log como "requiere edición manual" y proveer instrucción exacta de qué cambiar
