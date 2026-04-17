# Metadata Standards — WP Documents

> Cargado automáticamente. Aplica a TODO documento creado en context/work/.

## Regla principal

TODOS los documentos en `.thyrox/context/work/` usan bloques \`\`\`yml\`\`\` para metadata.
NUNCA usar `---` YAML frontmatter en artefactos WP.

## Templates por tipo de documento

### 1. Artefactos principales del WP (en raíz del WP)

```yml
project: THYROX
work_package: YYYY-MM-DD-HH-MM-SS-nombre
created_at: YYYY-MM-DD HH:MM:SS
current_phase: Phase N — PHASE_NAME
author: NestorMonroy
```

*Ejemplos: risk-register.md, exit-conditions.md*
*`updated_at` SOLO en documentos vivos (risk-register, exit-conditions)*

### 2. Síntesis de fase (`discover/{nombre}-analysis.md`)

```yml
created_at: YYYY-MM-DD HH:MM:SS
project: THYROX
author: NestorMonroy
status: Borrador
version: 1.0.0
```

### 3. Documentos en cajones (`{cajon}/{subdomain}/{nombre}.md`)

```yml
created_at: YYYY-MM-DD HH:MM:SS
project: THYROX
work_package: YYYY-MM-DD-HH-MM-SS-nombre
phase: Phase N — PHASE_NAME
author: NestorMonroy
status: Borrador
```

*Ejemplos: analyze/architecture-patterns/multi-flow-detection.md*
*constraints/technical-constraints.md*

## Reglas de campos

| Campo | Obligatorio | Formato |
|-------|-------------|---------|
| `created_at` | Siempre | `YYYY-MM-DD HH:MM:SS` (timestamp real del sistema) |
| `updated_at` | Solo en doc. vivos | `YYYY-MM-DD HH:MM:SS` — actualizar en cada Edit |
| `status` | Siempre | `Borrador` al crear → `Aprobado` cuando gate lo valida |
| `project` | Siempre | Nombre del proyecto (THYROX para este repo) |
| `phase` | En cajones | `Phase N — PHASE_NAME` (ej: `Phase 3 — ANALYZE`) |
| `author` | Siempre | Nombre del autor |
| `version` | En docs con revisiones | SemVer 2.0.0 (`MAJOR.MINOR.PATCH`) — ver regla abajo |

## Versionado de documentos — SemVer 2.0.0

Los documentos que evolucionan (deep-reviews, análisis iterativos, guías) usan `version:` con
Semantic Versioning 2.0.0. Los archivos nunca se duplican con sufijo `-v2`, `-old`, etc. (I-002):
el número vive en el metadata del archivo canónico.

| Incremento | Cuándo | Ejemplo |
|------------|--------|---------|
| **MAJOR** (X.0.0) | La premisa, estructura o conclusiones cambian incompatiblemente — el doc contradice su versión anterior | Corregir error arquitectónico fundamental: `1.0.0 → 2.0.0` |
| **MINOR** (x.Y.0) | Se agregan secciones o hallazgos nuevos sin contradecir los existentes | Agregar sección de artefactos: `2.0.0 → 2.1.0` |
| **PATCH** (x.y.Z) | Correcciones menores: typos, clarificaciones, links rotos | Fix de typo: `2.0.0 → 2.0.1` |

**Versión inicial:** `1.0.0` al crear. Omitir el campo si el documento no tiene revisiones previstas.

**Nombres de archivo:** NUNCA incluir el número de versión en el nombre. El nombre es
auto-descriptivo del contenido; la versión vive en el metadata.

```
PROHIBIDO: deep-review-use-cases-v2.md, analysis-v3.md
CORRECTO:  deep-review-use-cases-analysis.md  (con version: 2.0.0 en metadata)
```

## Cajones de fase y su código

| Cajón | Fase | Código phase |
|-------|------|-------------|
| `discover/` | Phase 1 | `Phase 1 — DISCOVER` |
| `measure/` | Phase 2 | `Phase 2 — MEASURE` |
| `analyze/` | Phase 3 | `Phase 3 — ANALYZE` |
| `constraints/` | Phase 4 | `Phase 4 — CONSTRAINTS` |
| `strategy/` | Phase 5 | `Phase 5 — STRATEGY` |
| `plan/` | Phase 6 | `Phase 6 — PLAN` |
| `design/` | Phase 7 | `Phase 7 — DESIGN/SPECIFY` |
| `plan-execution/` | Phase 8 | `Phase 8 — PLAN EXECUTION` |
| `pilot/` | Phase 9 | `Phase 9 — PILOT/VALIDATE` |
| `execute/` | Phase 10 | `Phase 10 — EXECUTE` |
| `track/` | Phase 11 | `Phase 11 — TRACK/EVALUATE` |
| `standardize/` | Phase 12 | `Phase 12 — STANDARDIZE` |

## Reglas de colocación de artefactos en cajones

Cuando se crea o solicita un documento para un WP activo, colocarlo en el cajón correspondiente
a su fase según la tabla anterior. Reglas críticas:

| Tipo de documento solicitado | Cajón correcto | Template |
|------------------------------|----------------|----------|
| Plan estratégico, solución, scope, roadmap | `plan/` | — |
| Task plan con T-NNN checkboxes | `plan-execution/` | `workflow-decompose/assets/plan-execution.md.template` |
| Análisis, causa raíz, diagnóstico | `analyze/` | — |
| Restricciones, constraints | `constraints/` | — |
| Artefactos de cierre (lessons, changelog) | `track/` | — |

**Regla para `plan-execution/`:** TODO task plan creado en este cajón DEBE usar
`plan-execution.md.template`. El nombre del archivo es descriptivo: `{iniciativa}-task-plan.md`
(ej: `skill-anatomy-task-plan.md`, no `task-plan.md`).

**Regla para `plan/`:** Documentos en `plan/` son planes estratégicos o de solución —
describen QUÉ y POR QUÉ, no T-NNN. Si el usuario pide "un plan para X" y el resultado
tiene checkboxes T-NNN → va en `plan-execution/`, no en `plan/`.

## Anti-patrones prohibidos

```markdown
<!-- PROHIBIDO: title inventado como campo metadata -->
---
title: "Mi análisis"
type: analysis
domain: architecture
---

<!-- CORRECTO: solo los campos estándar en bloque yml -->
\`\`\`yml
created_at: 2026-04-15 09:30:00
project: THYROX
work_package: 2026-04-15-08-29-58-plugin-distribution
phase: Phase 3 — ANALYZE
author: NestorMonroy
status: Borrador
\`\`\`
```
