```yml
created_at: 2026-04-18 01:58:20
project: THYROX
work_package: 2026-04-17-17-58-13-goto-problem-fix
phase: Phase 12 — STANDARDIZE
author: NestorMonroy
status: Aprobado
```

# Patrones adoptados — goto-problem-fix (ÉPICA 41)

---

## Patrones adoptados

### PAT-041-A: Domain subdirectories preventivos en stage directories

**Descripción:** Cuando un stage directory va a recibir más de 2 documentos de dominios distintos, crear domain subdirectories ANTES del primer artefacto.

**Estructura:**
```
{stage-dir}/{domain}/{content}-{subtype}.md
```

**Cuándo aplicar:** Inicio de Stage 3 ANALYZE o Stage 11 TRACK si hay múltiples ejes de análisis previstos.

**Codificado en:** `metadata-standards.md` sección "Taxonomía de 3 niveles".

---

### PAT-041-B: Audit como gate obligatorio Stage 11→12

**Descripción:** `/thyrox:audit` se ejecuta al inicio de Stage 11 TRACK/EVALUATE, no al final. Los hallazgos FAIL/PARTIAL se resuelven antes de avanzar a Stage 12.

**Flujo:**
```
Stage 10 EXECUTE → Stage 11 TRACK → /thyrox:audit → remediation (si hay FAILs) → Stage 12
```

**Codificado en:** `thyrox/SKILL.md` sección "Herramientas de calidad".

---

### PAT-041-C: WP multi-análisis como contenedor deliberado

**Descripción:** Un WP puede contener N task plans, N análisis de dominios distintos, N perspectivas relacionadas. No cerrar por inercia cuando la tarea original termina.

**Cuándo aplicar:** Cuando emerge trabajo relacionado durante Stage 10 o Stage 11 — continuar en el mismo WP si el tema es coherente.

**Codificado en:** I-011 (THYROX Core Invariants) — explicitado como patrón en L-128.

---

### PAT-041-D: Validación de referencias antes de git rm

**Descripción:** Antes de `git rm {archivo}`, verificar qué archivos lo referencian.

**Comando:**
```bash
grep -r "{nombre-archivo}" . --include="*.md" | grep -v ".git"
```

**Si hay referencias:** actualizarlas en el mismo commit que el `git rm`.

---

## Updates a guidelines

| Archivo | Cambio |
|---------|--------|
| `.claude/references/conventions.md` | REGLA-LONGEV-001 revisada — historial → git, no a `-archive`. CHANGELOG policy con tabla cuándo/cuándo-no. |
| `.claude/rules/metadata-standards.md` | Taxonomía domain subdirectories documentada con ejemplos del problema (flat namespace collapse). |
| `.claude/skills/thyrox/SKILL.md` | Sección "Herramientas de calidad" — `/thyrox:audit` como pre-gate Stage 12. |

---

## Updates a skills

| Skill | Cambio |
|-------|--------|
| `workflow-audit` | **Creado** — auditor crítico de WPs con 5 dimensiones y scoring PASS/FAIL/PARTIAL/SKIP. |
| `thyrox/SKILL.md` | PAT-004 explicitado, `/thyrox:audit` en Phase 11, herramientas de calidad. |
| `workflow-execute/SKILL.md` | PAT-004 enforcement — checkbox en mismo commit que implementación. |

---

### PAT-041-E: Reposicionamiento de identidad del sistema mediante deep-review + ADR formal

**Descripción:** Cuando la identidad pública de un sistema está mal categorizada (ej: "framework" cuando el comportamiento real es "sistema agentic"), el proceso correcto es: (1) deep-review exhaustivo de todos los archivos afectados con clasificación de impacto, (2) aplicar cambios por prioridad en commits atómicos, (3) documentar la decisión en un ADR permanente.

**Flujo:**
```
deep-review exhaustivo → inventario priorizado → commits P1→P4 →
deep-review v2 (residuos) → ADR de identidad → addendum ADRs existentes
```

**Cuándo aplicar:** Cuando una terminología de identidad es imprecisa o crea coupling no deseado con detalles de implementación (plataforma, versión, vendor).

**Codificado en:** `adr-thyrox-agentic-ai-identity.md` y addendum de `adr-arquitectura-orquestacion-thyrox.md`.

---

## ADRs creados

| ADR | Descripción |
|-----|-------------|
| `adr-thyrox-agentic-ai-identity.md` | Identidad canónica THYROX como sistema de Agentic AI, independiente de plataforma (D-01..D-04) |
| Addendum `adr-arquitectura-orquestacion-thyrox.md` | Actualización 1: pm-thyrox→thyrox (ÉPICA 29); Actualización 2: 7 fases→12 stages (ÉPICA 39); Actualización 3: Agentic AI platform-independent (ÉPICA 41) |

---

## Próximos WPs sugeridos

| Prioridad | Tema | Justificación |
|-----------|------|---------------|
| Media | R-6 de use-cases-analysis: detalle fases/artefactos lean/bpa/pps/cp en ARCHITECTURE.md | Quedó PARTIAL en coverage analysis |
| Baja | Release formal v2.7.0 + actualización CHANGELOG.md raíz | Aplicar la nueva política de releases |
| Baja | `technical-debt.md` audit — verificar si hay TDs que violan la nueva REGLA-LONGEV-001 | Limpieza estructural |
