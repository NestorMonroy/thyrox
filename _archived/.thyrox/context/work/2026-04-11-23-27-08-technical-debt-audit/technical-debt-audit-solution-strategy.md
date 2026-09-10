```yml
created_at: 2026-04-11 23:27:08
project: thyrox-framework
status: En revisión
fase: FASE 32
wp: 2026-04-11-23-27-08-technical-debt-audit
```

# Solution Strategy — technical-debt-audit (FASE 32)

## Key Ideas

### Idea 1: Auditoría-primero antes de implementar

El error histórico en el manejo de TDs fue ejecutar fixes sin primero auditar si ya estaban implementados. Este WP invierte el orden: Grupo A (status updates) se completa antes de tocar ningún código, eliminando falsos positivos del backlog.

### Idea 2: Distribución de [x] al WP implementador, no archivo central

Los TDs resueltos en `technical-debt.md` se distribuyen al `*-technical-debt-resolved.md` del WP que los implementó — no a un archivo de archivo global. Esto mantiene la trazabilidad: "¿dónde se resolvió TD-NNN?" tiene una respuesta exacta.

### Idea 3: Consolidación de cambios en workflow-*/SKILL.md por tipo de sección

Múltiples TDs (TD-029, TD-031, TD-033) requieren añadir secciones similares a los 7 `workflow-*/SKILL.md`. En lugar de tareas separadas por TD por SKILL (49 tareas), se consolidan por SKILL con una sección unificada "Validación pre-gate" que aborda varios TDs a la vez.

### Idea 4: Limpieza de technical-debt.md al final (Phase 7)

Una vez que todos los [x] están distribuidos a sus WPs, `technical-debt.md` queda con solo entradas `[ ]` — entradas activas. Esto lo reduce a < 25,000 bytes (REGLA-LONGEV-001) sin necesidad de un archivo de archive separado.

---

## Investigación de alternativas

### Unknowns al inicio de Phase 2

**Unknown-1:** ¿Dónde mover los TDs [x]? ¿Archivo único o WPs individuales?

| Opción | Descripción | Pros | Contras |
|--------|-------------|------|---------|
| A — `technical-debt-archive.md` global | Un archivo con todos los [x] históricos | Simple, un solo lugar | Rompe trazabilidad (¿en qué FASE se resolvió?) |
| **B — WP implementador** (elegida) | Cada [x] va al `*-technical-debt-resolved.md` del WP que lo implementó | Trazabilidad exacta, sigue patrón existente (FASE 29, 31) | Requiere identificar WP de cada TD |
| C — Mantener en technical-debt.md comprimido | Solo título + fecha, sin detalle | Sin migración | No resuelve el problema de tamaño |

**Decisión:** Opción B. Es la que establece REGLA-LONGEV-001 en el procedimiento de `technical-debt.md` y es coherente con los WPs de FASE 29 y FASE 31 que ya tienen `*-technical-debt-resolved.md`.

**Unknown-2:** ¿Combinar TD-029 + TD-031 + TD-033 en una sola sección por SKILL o tareas separadas?

Los tres TDs añaden instrucciones en el mismo lugar de cada SKILL (antes del gate humano). Separar en tareas atómicas por TD produciría solapamiento de edits en el mismo archivo. La solución es:
- Una tarea por SKILL que añade la sección unificada "Validaciones pre-gate" abordando TD-029 + TD-031 + TD-033
- Las secciones son compactas: checklists, no párrafos

**Unknown-3:** ¿Qué WP tiene los TDs que ya están marcados [x] con su resolved file?

| TD | Resuelto en | WP resolved file existe? |
|----|-------------|--------------------------|
| TD-002 | FASE 29 | Sí — FASE 29 WP tiene `*-technical-debt-resolved.md` |
| TD-004 | FASE 9/10 | No — WP de esa era no tiene el archivo |
| TD-011 | FASE 29 | Sí — FASE 29 WP |
| TD-016 | FASE 18/19 | No — WP de esa era no tiene el archivo |
| TD-017 | FASE 19 | No — WP de esa era no tiene el archivo |
| TD-021 | FASE 23/29 | Sí — FASE 29 WP |
| TD-036 | FASE 31 | Sí — FASE 31 WP tiene `*-technical-debt-resolved.md` |
| TD-037 | FASE 31 | Sí — FASE 31 WP |
| TD-006 | FASE 23/29/31 | Parcial — FASE 31 WP no lo incluye (no estaba marcado antes) |
| TD-007 | workflow-analyze FASE (SDLC) | No tiene WP propio identificado |
| TD-008 | FASE 31 (addendum) | FASE 31 WP no lo incluye |

**Estrategia para WPs sin resolved file:** Crear `*-technical-debt-resolved.md` en los WPs que no lo tienen y añadir ahí los TDs correspondientes.

---

## Decisiones fundamentales

### D-01: Destino de entradas [x] — Opción B (WP implementador)

Cada entrada `[x]` de `technical-debt.md` se mueve al `*-technical-debt-resolved.md` del WP que la implementó. Para WPs antiguos sin ese archivo, se crea en Phase 6.

**Implicaciones:**
- Phase 6 incluye tareas de creación/actualización de `*-technical-debt-resolved.md` en múltiples WPs
- `technical-debt.md` al final solo tendrá entradas `[ ]` (activas)
- Los TDs del Grupo A (TD-006, TD-007, TD-008) van al `*-technical-debt-resolved.md` de este WP (FASE 32), ya que es aquí donde se auditan y confirman

### D-02: Scope de implementación — Grupo A + Grupo B

**In-scope (este WP):**
- Grupo A: TD-006, TD-007, TD-008, TD-039 — actualizar status [x] + completar TD-039
- Grupo B: TD-038, TD-040, TD-029+TD-031+TD-033 (consolidados), TD-032 — implementar fixes

**Out-of-scope (futuras FASEs):**
- Grupo C: TD-028, TD-034, TD-035, TD-026, TD-001, TD-018, TD-025 — media prioridad, diferidos
- Grupo D: TD-005, TD-009, TD-010, TD-022, TD-030 — requieren WP propio o trigger específico

### D-03: Orden de ejecución en Phase 6

1. **Tareas Grupo A** (status updates en `technical-debt.md`) — sin riesgo, sin impacto en sesiones activas
2. **T-settings** (TD-038): eliminar 3 reglas Edit redundantes de `settings.json` — requiere prompt (ask)
3. **T-workflow-plan** (TD-040 específico): añadir `## Gate humano` a `workflow-plan/SKILL.md`
4. **T-SKILL-NNN** (TD-029+031+033+040 por SKILL): una tarea por workflow-*/SKILL.md
5. **T-execute** (TD-032): pre-flight checklist en `workflow-execute/SKILL.md`
6. **T-distribution**: crear/actualizar `*-technical-debt-resolved.md` en WPs afectados
7. **T-cleanup**: eliminar entradas movidas de `technical-debt.md`

### D-04: Formato de sección "Validaciones pre-gate" en workflow-*/SKILL.md

Se añade UNA sección consolidada antes del gate humano en cada SKILL, abordando TD-029 + TD-031 + TD-033:

```markdown
## Validaciones pre-gate (OBLIGATORIO)

Antes de presentar el gate al usuario:

1. **Deep review del documento producido** (TD-031):
   - Releer el artefacto de esta fase completo
   - Verificar que cubre todos los hallazgos de fases anteriores
   - Si hay gaps: corregir antes de proponer el gate

2. **Consistencia de fase** (TD-029):
   - Si WP es mediano/grande: confirmar que la siguiente fase es obligatoria
   - Verificar que el documento no tiene auto-contradicciones

3. **Commit de estado antes del gate** (TD-033):
   ```bash
   git add <artefactos> .claude/context/now.md
   git commit -m "type(scope): descripción"
   ```

Solo después de completar los 3 puntos → presentar gate humano.
```

---

## Adherencia a restricciones

| Restricción | Cómo se respeta |
|-------------|-----------------|
| `technical-debt.md` = 70,360 bytes (LONGEV) | Phase 6 redistribuye [x] → technical-debt.md queda solo con `[ ]` |
| workflow-*/SKILL.md requieren prompt (ask) | Tareas de SKILL presentan diff exacto antes de editar |
| Atomicidad (TD-011) | Una tarea = un archivo; TD-029+031+033 consolidados en una sección, no en tres edits al mismo archivo |
| Contexto finito de sesión | Grupo A ejecuta primero; si contexto se agota, commitear progreso y diferir Grupo B |

---

## Trazabilidad al análisis

| Hallazgo Phase 1 | Decisión estratégica |
|-----------------|---------------------|
| 4 TDs con status desactualizado | D-01: mover [x] al WP implementador + confirmar en Phase 1 |
| 6 TDs alta prioridad en workflow-*/SKILL.md | D-03: orden de ejecución; D-04: sección unificada |
| REGLA-LONGEV-001 activa (70,360 bytes) | D-01: redistribución al final elimina el tamaño sin necesidad de archivo global |
| R-03 (scope creep crítico) | D-02: scope explícito Grupo A+B únicamente |
| workflow-plan/SKILL.md sin Gate humano (TD-040) | D-03: T-workflow-plan es tarea separada antes del batch de SKILLs |
