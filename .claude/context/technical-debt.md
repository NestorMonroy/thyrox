```yml
Tipo: Registro de Deuda Técnica
Fecha creación: 2026-04-03
Última actualización: 2026-04-03
```

# Deuda Técnica — THYROX

Registro de problemas conocidos que no se corrigen inmediatamente pero deben
ser atendidos. Cada ítem tiene un ID, descripción, impacto, y criterio de resolución.

## Convenciones

- `[ ]` = Pendiente
- `[-]` = En progreso
- `[x]` = Resuelto (YYYY-MM-DD)
- Severidad: alta | media | baja
- Origen: error registrado (ERR-NNN) o identificado en revisión

---

## TD-001: Timestamps incompletos en metadatos de artefactos

```
Severidad: media
Origen: Revisión 2026-04-03
Fase afectada: Todas (al crear artefactos desde templates)
Estado: [ ] Pendiente
```

**Problema:**
Los templates definen `Fecha: [YYYY-MM-DD-HH-mm-ss]` pero al instanciar artefactos
se usa con frecuencia solo la fecha (`YYYY-MM-DD`) sin el componente de hora.

Ejemplo detectado:
- `voltfactory-adaptation-analysis.md` → `Fecha: 2026-04-03-00-49-34` (correcto)
- `voltfactory-adaptation-solution-strategy.md` → `Fecha: 2026-04-03` (incompleto)

**Impacto:**
Sin el timestamp completo no es posible ordenar artefactos creados el mismo día ni
reconstruir el orden de creación dentro de una sesión. Rompe la trazabilidad temporal.

**Resolución:**
- Corregir todos los artefactos existentes con fecha incompleta
- Agregar regla explícita en `conventions.md`: el campo `Fecha:` en artefactos WP
  debe usar siempre `YYYY-MM-DD-HH-MM-SS` (timestamp real, no estimado)
- Agregar validación en `validate-session-close.sh`: detectar `Fecha: \d{4}-\d{2}-\d{2}$`
  (fecha sin hora) en archivos dentro de `context/work/`

**Criterio de cierre:**
Todos los artefactos en WPs activos tienen timestamp completo. Validación automática
en place.

---

## TD-003: Templates huérfanos en assets/ no referenciados en ningún flujo

```
Severidad: baja
Origen: Auditoría 2026-04-03
Fase afectada: Cross-phase (confusión al buscar templates)
Estado: [ ] Pendiente
```

**Problema:**
Seis templates en `.claude/skills/pm-thyrox/assets/` no están referenciados en
SKILL.md ni en ningún reference activo del flujo. Generan ruido y confusión:
- `ad-hoc-tasks.md.template` — tracking de tareas ad-hoc sin WP formal
- `analysis-phase.md.template` — duplica funcionalidad de `introduction.md.template`
- `categorization-plan.md.template` — no corresponde a ninguna fase del SKILL
- `document.md.template` — template genérico sin fase asignada
- `project.json.template` — metadata de proyecto en JSON (no Markdown)
- `refactors.md.template` — tracking de refactors (podría ser útil en Phase 6)

Nota: `bugfix`, `feature`, `refactor`, `documentation`, `multiple-files`,
`task-completion`, `commit-message-main` son templates de commit — sí están
referenciados en `references/commit-helper.md`.

**Impacto:**
Cuando alguien busca "qué template usar para X", encuentra templates huérfanos
que no tienen instrucciones de uso. Aumenta la fricción y la incertidumbre.

**Resolución:**
Para cada template huérfano, decidir uno de:
1. Mapear a una fase en SKILL.md (si tiene uso legítimo)
2. Mover a `assets/legacy/` con un README explicando que están deprecados
3. Eliminar si no tienen valor (ADR-008: Git as persistence, el historial preserva)

Candidato a mapear: `ad-hoc-tasks.md.template` → Phase 6 para tareas fuera del
task-plan. Candidato a eliminar: `analysis-phase.md.template` (duplica introduction),
`categorization-plan.md.template`, `document.md.template`.

**Criterio de cierre:**
Cero templates en `assets/` sin referencia en SKILL.md o en un reference activo.
Cada template tiene una fase asignada o está en `assets/legacy/`.

---

## TD-002: Phase 3 (PLAN) no produce artefacto en el WP

```
Severidad: alta
Origen: Revisión 2026-04-03
Fase afectada: Phase 3 (PLAN)
Estado: [ ] Pendiente
```

**Problema:**
Phase 3 solo actualiza `ROADMAP.md` (archivo global) pero no crea ningún artefacto
dentro del WP. Esto rompe la trazabilidad: al revisar el WP en el futuro no hay
registro de qué scope fue decidido en Phase 3, qué quedó dentro, qué quedó fuera,
ni por qué.

Ejemplo concreto: el WP `voltfactory-adaptation` tiene `analysis/`, `risk-register.md`
y `solution-strategy.md`, pero no hay ningún documento que capture el scope
aprobado en Phase 3.

**Impacto:**
- Un PM que revisa el WP meses después no puede reconstruir qué scope fue aprobado
- No hay forma de detectar scope creep durante Phase 4-6 (no hay baseline documentado)
- El ROADMAP.md agrega items pero no explica el razonamiento detrás de qué quedó fuera

**Resolución:**
1. Crear template `assets/plan.md.template` con:
   - Scope statement (qué problema, quiénes son usuarios, qué es éxito)
   - In-scope: lista de features/componentes aprobados
   - Out-of-scope: lista explícita de lo que NO se hace y por qué
   - Criterios de éxito medibles
   - Link a ROADMAP.md para tracking
2. Actualizar SKILL.md Phase 3: agregar paso para crear `{nombre-wp}-plan.md`
3. Actualizar tabla de artefactos en SKILL.md: agregar Phase 3 → `{nombre-wp}-plan.md`
4. Actualizar estructura de WP en SKILL.md: agregar `{nombre}-plan.md`
5. Crear artefacto retroactivo en WP `voltfactory-adaptation`

**Criterio de cierre:**
SKILL.md Phase 3 produce `{nombre-wp}-plan.md`. Template existe. WP activo tiene el
artefacto. validate-phase-readiness.sh Phase 3 verifica que el archivo existe.

---
