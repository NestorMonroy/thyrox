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
analysis_version: 1.0
author: NestorMonroy
status: Borrador
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
