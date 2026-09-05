```yml
created_at: 2026-04-16 18:54:38
project: THYROX
analysis_version: 1.0
author: NestorMonroy
status: Aprobado
```

# Phase 1 DISCOVER — multi-methodology

## Problema central

THYROX implementa únicamente el flujo SDLC (12 fases propias). Existen ~73 metodologías
adicionales (PDCA, DMAIC, Lean Six Sigma, PMBOK, BABOK, Consulting, Business Analysis, etc.)
que el framework no soporta. El objetivo es extender THYROX para ser un meta-framework
multi-metodología sin romper la infraestructura existente.

---

## Contexto acumulado (de análisis previos en FASE 39)

Este WP parte de análisis ya completados. No hay fase de investigación desde cero.

### Análisis de referencia (plugin-distribution/analyze/)

| Artefacto | Contenido clave |
|-----------|----------------|
| `architecture-patterns/multi-methodology-patterns-analysis.md` | 5 patrones evaluados, tabla de impacto en contexto, recomendación v2.0 |
| `architecture-patterns/pattern-decision-deep-review.md` | Deep-review de patrones, veredicto final |
| `architecture-patterns/markov-probabilistic-registry-design.md` | Fundamento teórico State Machine + Markov chains |
| `methodology-landscape/universal-pattern-methodology-landscape.md` | Patrón universal de 9 pasos presente en todos los marcos |
| `methodology-landscape/frameworks-cat1-cat3-software-quality-problems.md` | Cat 1-3: SDLC, PDCA, DMAIC, Lean Six Sigma, Problem Solving 8-step |
| `methodology-landscape/frameworks-cat4-cat6-strategy-consulting-ba.md` | Cat 4-6: Strategic Planning, Consulting, Business Analysis |
| `methodology-landscape/frameworks-techniques-rca-fa-nasa.md` | Técnicas transversales: RCA, Framework Analysis, NASA decomposition |
| `platform/jsonl-worktrees-analysis.md` | JSONL observabilidad + worktrees isolation en coordinators |

### Validación adicional (deep-review v2.1.111 — 2026-04-16)

El deep-review del repositorio oficial `anthropics/claude-code` realizado en esta sesión confirmó:

| Hallazgo | Veredicto |
|----------|-----------|
| `isolation: worktree` en agentes | ✅ Confirmado (v2.1.49-50) |
| `WorktreeCreate`/`WorktreeRemove` hooks | ✅ Confirmado (v2.1.50), bug "silently ignored" corregido |
| Skills 3-level lazy loading | ✅ Confirmado — Level 1 ~100 tokens startup |
| `monitors:` en plugin.json | ✅ Nuevo enabler Patrón 5 (v2.1.105) |
| `background: true` en agentes | ✅ Nuevo campo (v2.1.49) |
| `context: fork` en skills | ✅ Nuevo campo para routing aislado |
| GAP-010 `.gitignore` worktrees | ⚠️ Sin resolución automática — tarea manual |

---

## Scope del problema

### Metodologías a implementar (~73 skills totales)

| Bloque | Metodologías | Skills |
|--------|-------------|--------|
| Cat 1 — Software Dev | SDLC | 12 ya existentes |
| Cat 2 — Mejora Calidad | PDCA (4) + DMAIC (5) + Lean Six Sigma (5) | 14 nuevos |
| Cat 3 — Resolución Problemas | Problem Solving 8-step (8) | 8 nuevos |
| Cat 4 — Planeación Estratégica | Strategic Planning (5) + Strategic Management (4) | 9 nuevos |
| Cat 5 — Consultoría | Consulting General (5) + Consulting Thoucentric (7) | 12 nuevos |
| Cat 6 — Análisis de Negocios | Business Analysis (7) + BPA (6) | 13 nuevos |
| BA/BABOK | 6 knowledge areas (flujo no-secuencial) | 6 skills |
| PMBOK / RUP / RM | Del análisis multi-flow previo | ~17 skills |

**Total: ~79 skills nuevos** (79 nuevos + 12 SDLC existentes = ~91 total en registry)

### 5 tipos de flujo identificados

| Tipo | Ejemplo | Patron Markov |
|------|---------|---------------|
| Secuencial | SDLC, DMAIC, LSS, PMBOK | Cadena lineal con estado absorbente |
| Cíclico | PDCA, Strategic Management | Cadena recurrente sin estado absorbente |
| Iterativo | BPA, RUP | Estados recurrentes + loops hacia atrás |
| No-secuencial | BA/BABOK | Grafo completo |
| Condicional | Problem Solving 8-step | Transiciones con condición de guardia |

---

## Arquitectura elegida

### Corto plazo: Patrón 3 — Un coordinator por metodología

```
.claude/agents/
├── sdlc-coordinator.md      ← ya existe implícitamente (thyrox)
├── pdca-coordinator.md      ← nuevo
├── dmaic-coordinator.md     ← nuevo
├── pmbok-coordinator.md     ← nuevo
└── babok-coordinator.md     ← nuevo (flujo no-secuencial especial)
```

**Criterio de selección:** 4-5 metodologías prioritarias primero.
Cada coordinator tiene `isolation: worktree` + sus skills declarados.

### Largo plazo: Patrón 5 — State Machine con Registry YAML

```
.thyrox/registry/methodologies/
├── sdlc.yml
├── pdca.yml
├── dmaic.yml
└── ...

.claude/agents/
└── thyrox-coordinator.md    ← UN coordinator genérico que lee YAMLs
```

**Enabler nuevo:** `monitors:` en plugin.json (v2.1.105) permite que el coordinator genérico
se auto-arme como monitor de background al inicio de sesión.

**Contrato de compatibilidad:** `now.md::phase = "{metodologia}-{step}"` es la interfaz
que hace compatible la transición Patrón 3 → Patrón 5 sin cambios en los skills.

---

## GAPs a resolver en este WP

| GAP | Descripción | Prioridad |
|-----|-------------|-----------|
| GAP-001 | `plugin.json` no lista dinámicamente 73+ skills | Alta |
| GAP-002 | No hay coordinators para PMBOK/RUP/DMAIC/BABOK | Alta |
| GAP-003 | `_phase_to_display()` no tiene display names para ~73 skills nuevos | Media |
| GAP-004 | `now.md` no tiene campo `flow:` para metodologías no-SDLC | Media |
| GAP-005 | No existe `.thyrox/registry/methodologies/` | Media (largo plazo) |
| GAP-007 | `WorktreeCreate`/`WorktreeRemove` no en hooks.json | Alta (bloquea testing) |
| GAP-009 | `isolation: worktree` no configurado en coordinators | Media |
| GAP-010 | `.claude/worktrees/` no en `.gitignore` | Alta (riesgo de repo) |

---

## Stakeholders

| Rol | Interés |
|-----|---------|
| NestorMonroy (usuario) | Usar THYROX con cualquier metodología — no solo SDLC |
| Claude Code (ejecutor) | Skills e infraestructura correctamente configurados |
| Equipos de proyecto (futuros usuarios) | Elegir metodología según contexto sin re-aprender el framework |

---

## Riesgos iniciales

| ID | Riesgo | Probabilidad | Impacto |
|----|--------|-------------|---------|
| R-001 | `skills:` en frontmatter de agente no está documentado en plugin-dev docs | Alta | Medio — campo existe en runtime pero sin ejemplos canónicos |
| R-002 | 79 skills nuevos en registry → descripción suficientemente diferenciada para auto-triggering | Media | Alto — sin descripción precisa el routing falla |
| R-003 | Patrón 3 → Patrón 5 sin contrato explícito rompe coordinators | Media | Alto — requiere diseño upfront del contrato |
| R-004 | BA/BABOK no-secuencial rompe el modelo `phase == skill name` de now.md | Alta | Medio — requiere campo `flow:` nuevo |

---

## Exit criteria Phase 1

- [x] WP creado con timestamp real
- [x] Análisis de referencia documentado y localizado
- [x] Arquitectura elegida con justificación
- [x] GAPs enumerados y priorizados
- [x] Riesgos identificados

⏸ **STOP — gate Phase 1 → Phase 2/3**

Validar antes de continuar:
1. ¿El scope (79 skills nuevos) es correcto o se limita a las 4-5 metodologías prioritarias?
2. ¿Se omite Phase 2 MEASURE (no hay baseline cuantitativo relevante para este WP)?
3. ¿Arrancar directamente en Phase 5 STRATEGY dado que el análisis ya está hecho?
