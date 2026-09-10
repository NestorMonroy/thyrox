```yml
Fecha: 2026-03-28
Proyecto: THYROX
Tipo: Análisis (Phase 1: ANALYZE)
Tema: Naming de work directories + ubicación de project-state
```

# Análisis: Naming de work directories y ubicación de project-state

## Cómo nombran el trabajo los proyectos de referencia

### valet (.beans/)

```
.beans/agent-ops-mj3a--memory-journal-and-autoload.md
.beans/agent-ops-pg9a--policy-gated-actions.md
.beans/valet-rv4w--pr-review-sessions.md
```

**Patrón:** `{area}-{code}--{slug}.md`
- area = proyecto o dominio (agent-ops, valet)
- code = ID único corto (mj3a, pg9a, rv4w)
- slug = nombre descriptivo en kebab-case
- Sin timestamp en el nombre (el timestamp está en YAML frontmatter: `created_at`)

**Cuándo se crea un bean:** Cuando se identifica un trabajo — puede ser un epic, feature, chore, o refactor. No está atado a sesión ni a tiempo.

### agentic-framework (journal/plans/)

```
journal/plans/2026-01-04-self-application-plan.md
journal/plans/2026-02-05-F-0120-pr-review-loop-plan.md
journal/plans/2026-03-01-F-0143-skills-primary-plan.md
```

**Patrón:** `YYYY-MM-DD-{feature-id}-{slug}-plan.md`
- Fecha del día (no hora)
- Feature ID opcional (F-NNNN)
- Slug descriptivo
- Sufijo -plan

**Cuándo se crea un plan:** Cuando se va a implementar algo. El plan es un documento de ejecución. Si el mismo feature necesita replanning, se crea nuevo archivo con nueva fecha (inmutabilidad).

### clawpal (docs/plans/)

```
docs/plans/2026-02-15-clawpal-mvp-design.md
docs/plans/2026-02-17-recipe-engine-redesign.md
docs/plans/2026-02-22-doctor-2x2-matrix-design.md
```

**Patrón:** `YYYY-MM-DD-{slug}.md`
- Solo fecha del día
- Slug descriptivo
- Cuando cambia el diseño → nuevo archivo con nueva fecha (2026-02-15 → 2026-02-17 para recipe-engine)

### Tu .mywork/ (el original)

```
changes/2026-01-29-plan-fix-sphinx-warnings/
changes/2026-01-30-correccion-manual-issues/
changes/20260131-061552-correccion-582-warnings/
```

**Patrón mixto:**
- Algunos con `YYYY-MM-DD-slug/`
- Algunos con `YYYYMMDD-HHMMSS-slug/` (timestamp completo)
- Directorios (no archivos) — cada uno con sus propios docs dentro

---

## ¿Por qué timestamp completo? (YYYY-MM-DD-HH-MM-SS)

El timestamp completo `YYYY-MM-DD-HH-MM-SS-nombre/` resuelve problemas que el date-only no resuelve:

1. **Múltiples trabajos el mismo día** — Con solo fecha, si haces 3 trabajos el 2026-03-28, tienes conflicto de nombres. Con timestamp completo, cada uno es único.

2. **Ordenamiento cronológico exacto** — `ls` ordena correctamente sin ambigüedad.

3. **Trazabilidad precisa** — "¿Cuándo exactamente empezó este trabajo?" → el timestamp LO DICE sin abrir el archivo.

4. **No necesitas IDs artificiales** — valet usa codes (mj3a, rv4w) para unicidad. El timestamp es un ID natural.

Tu intuición con `.mywork/` ya lo usaba: `20260131-061552-correccion-582-warnings/`

---

## Sobre project-state.md — ¿Dónde pertenece?

### Qué dice cada proyecto de referencia

| Proyecto | Equivalente de project-state | Dónde vive |
|----------|------------------------------|-----------|
| Cortex-Template | now.md (YAML session bridge) | Raíz del brain |
| agentic-framework | STATUS.md (living truth) | .agentic/ raíz |
| valet | No tiene (estado en .beans/ status) | Distribuido |
| cc-warp | foco_atual.md | Raíz del proyecto |
| ClaudeViewer | .serena/project.yml | .serena/ raíz |

### Qué ES project-state.md

No es un análisis. No es un epic. No es un plan. Es **metadatos del proyecto** — qué fase estamos, qué referencias existen, cuántos templates hay, métricas generales.

Es más parecido a:
- agentic-framework `STATUS.md` (current state)
- Cortex `now.md` (session bridge)
- ClaudeViewer `.serena/project.yml` (project config)

### Dónde debería estar

`project-state.md` es parte del **estado persistente** del proyecto, no del trabajo producido. Debería estar en la raíz de `context/`, no dentro de `work/` ni de `analysis/`.

Pero su contenido actual mezcla:
- Estado del proyecto (OK — pertenece aquí)
- Estructura de directorios (duplica SKILL.md — no pertenece aquí)
- Métricas de referencias/templates (snapshots que caducan — problemático)

**Solución:** Mantener project-state.md en `context/` pero como **metadata viva** que se actualiza por sesión (como agentic STATUS.md), no como snapshot estático que caduca.

---

## "Trabajo largo" no "sesión" — La pregunta correcta

La pregunta original era "¿qué es una sesión?" La investigación (covariancia, 14 proyectos) reveló que la pregunta correcta era "¿qué es un trabajo?"

Un **trabajo** (work package) es:
- Tiene inicio y fin
- Produce artefactos (spec, plan, código, lessons)
- Puede durar minutos o semanas
- Puede abarcar múltiples sesiones de Claude
- Se identifica por su timestamp de INICIO + nombre

Una **sesión** es solo un periodo de interacción con Claude. Es un detalle técnico, no una unidad de trabajo. Los work-logs por sesión son como documentar "abrí VS Code a las 10:00" — nadie lo necesita.

Lo que SÍ necesitas documentar es el TRABAJO:
```
work/2026-03-28-14-30-00-covariance-corrections/
├── spec.md       ← Qué problema resolvemos
├── plan.md       ← Cómo lo resolvemos (tasks)
├── lessons.md    ← Qué aprendimos
└── outputs/      ← Logs, reportes
```

No importa si este trabajo tomó 1 sesión o 5. El directorio documenta el TRABAJO, no las sesiones.

### La conexión con covariancia

El principio de covariancia dice: las leyes deben tener la misma forma en todos los marcos de referencia.

Aplicado: "sesión" es un marco de referencia (una instancia de Claude). "Trabajo" es otro (el objetivo del humano). Las LEYES del proyecto (decisiones, specs, plans) deben ser las mismas sin importar en cuántas sesiones se distribuya el trabajo.

La investigación de covariancia NO fue un error. Fue el camino correcto que nos llevó a la pregunta correcta: **el trabajo es la unidad, no la sesión.**

---

## Estructura propuesta actualizada

```
context/
├── project-state.md          ← Mantener (metadata viva del proyecto)
├── focus.md                  ← Dirección actual (humano)
├── now.md                    ← Estado sesión (YAML bridge)
├── constitution.md           ← Principios inmutables
├── LOG.md                    ← Append-only (acciones con timestamp)
├── decisions/                ← ADRs (mantener)
│   └── adr-NNN.md
└── work/                     ← UN directorio por TRABAJO
    └── YYYY-MM-DD-HH-MM-SS-nombre/
        ├── spec.md
        ├── plan.md
        ├── lessons.md
        └── outputs/
```

**project-state.md se mantiene** porque es metadata del proyecto, no del trabajo. Responde "¿qué ES este proyecto?" no "¿qué estamos haciendo ahora?" (eso es focus.md).

**Timestamp completo YYYY-MM-DD-HH-MM-SS** porque:
- Unicidad natural (no necesitas IDs artificiales)
- Ordenamiento cronológico exacto
- Múltiples trabajos por día sin conflicto
- Trazabilidad precisa

---

**Última actualización:** 2026-03-28
