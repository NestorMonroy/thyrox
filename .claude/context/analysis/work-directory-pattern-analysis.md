```yml
Fecha: 2026-03-28
Proyecto: THYROX
Tipo: Análisis comparativo (Phase 1: ANALYZE)
Tema: Directorio de trabajo — patrón convergente en 14 proyectos + .mywork/ original
```

# Análisis: El directorio de trabajo — Patrón convergente

## El patrón

Cada proyecto maduro tiene UN directorio donde vive el trabajo del framework:

| Proyecto | Directorio | Contenido |
|----------|-----------|-----------|
| agentic-framework | `.agentic/` | journal/, lessons/, plans/, manifests/, hooks/, STATUS, TODO, BACKLOG |
| ClaudeViewer | `.serena/memories/` | 6 módulos de contexto (overview, structure, tech, style, commands, checklist) |
| valet | `.beans/` | Work items con YAML frontmatter |
| spec-kit | `.specify/` | templates/, extensions/, presets/, scripts/ |
| Cortex-Template | Raíz del repo | agents/, contexts/, modes/, workflows/, brain-engine/, metabolism/ |
| oh-my-claude | `plugins/oh-my-claude/` | commands/, agents/, prompts/ |
| clawpal | `docs/plans/` | 48 planes con fecha + design+impl pairs |
| build-ledger | Raíz del repo | handoffs/, audits/, research/, conflicts/, votes/ |
| **Tu .mywork/ (ADT)** | `.mywork/` | adr/, build-logs/, changes/, work-logs/ |
| **THYROX actual** | `.claude/` | context/, skills/pm-thyrox/ |

## Tu .mywork/ — Lo que ya funcionaba

```
.mywork/
├── adr/                    ← Decisiones arquitectónicas (2 ADRs)
├── build-logs/             ← Output de builds (42 archivos)
├── changes/                ← Paquetes de trabajo con timestamp
│   ├── 2026-01-29-plan-fix-sphinx-warnings/
│   │   └── implementation/
│   ├── 2026-01-29-plan-pendientes-work-logs/
│   │   ├── requirements.md
│   │   ├── design.md
│   │   └── tasks.md
│   ├── 2026-01-30-correccion-manual-issues/
│   │   ├── PLAN-CORRECCION-MANUAL.md
│   │   ├── RESULTADOS-FINALES.md
│   │   └── RESUMEN-EJECUTIVO.md
│   └── 20260131-061552-correccion-582-warnings/
│       ├── build-logs/
│       ├── PLAN.md
│       ├── TRACKING.md
│       ├── DECISIONES.md
│       └── LECCIONES-APRENDIDAS.md
├── work-logs/              ← Bitácora por sesión (26 archivos con timestamp)
└── REPORTE-EJECUTIVO-FINAL.md
```

### Lo que .mywork/ hacía bien

1. **changes/ como paquetes de trabajo con fecha** — Cada change tiene su directorio con timestamp. Dentro: requirements, design, tasks, tracking. ES EL PATRÓN DE VALET (.beans/) Y CLAWPAL (dated plans).

2. **work-logs/ granulares con timestamp** — 26 work-logs con `YYYY-MM-DD-HH-MM-descripcion.md`. Más granulares que los narrative work-logs que intentamos en THYROX.

3. **build-logs/ como output determinístico** — 42 archivos de output de builds. Esto es trajectory recording (trae-agent) en su forma más simple.

4. **adr/ separado** — Decisiones arquitectónicas aisladas del resto.

5. **LECCIONES-APRENDIDAS.md dentro del change** — Cada paquete de trabajo tiene sus lecciones. ES el patrón L-NNNN de agentic-framework pero POR FEATURE.

6. **Spec-driven dentro de changes/** — `requirements.md → design.md → tasks.md` dentro de cada change. ES el patrón de spec-kit y valet.

### Lo que .mywork/ NO tenía

- Constitution / principios
- YAML frontmatter en work items
- Enforcement automático (hooks, gates)
- Locked decisions
- focus.md / now.md como estado de sesión
- Boundary rules en documentos

---

## Lo que THYROX tiene ahora

```
.claude/
├── CLAUDE.md                    ← Contexto persistente (~200 líneas)
├── context/
│   ├── project-state.md         ← Estado del proyecto (desactualizado)
│   ├── decisions/               ← 12 ADRs
│   ├── decisions.md             ← Índice
│   ├── analysis/                ← 25+ archivos sueltos (analyses, strategies, tasks, errors)
│   │   └── errors/              ← ERR-001 a ERR-023
│   ├── epics/                   ← 1 epic (thyrox-documentation)
│   └── work-logs/               ← 1 work-log (incompleto)
└── skills/pm-thyrox/
    ├── SKILL.md                 ← Motor (~288 líneas)
    ├── references/              ← 21 archivos
    ├── scripts/                 ← 7 scripts
    └── assets/                  ← 32 templates
```

### Problemas de THYROX vs .mywork/

| Lo que .mywork/ tenía | Lo que THYROX hizo | Problema |
|----------------------|-------------------|---------|
| changes/ con timestamp | analysis/ suelto | Perdimos la organización por paquete de trabajo |
| Spec-driven por change (req→design→tasks) | Todo mezclado en analysis/ | 25+ archivos sin estructura por feature |
| work-logs/ granulares (26 archivos) | 1 work-log narrativo (incompleto) | Menos granularidad, más overhead |
| build-logs/ (output real) | Nada equivalente | Sin trajectory/output recording |
| LECCIONES-APRENDIDAS por change | errors/ centralizado | Lecciones separadas de su contexto |
| 2 niveles (changes + work-logs) | 5 directorios (analysis, epics, decisions, work-logs, errors) | Demasiada fragmentación |

**El diagnóstico:** THYROX es más COMPLEJO que .mywork/ pero menos ORGANIZADO.

---

## La estructura objetivo

Combinando lo mejor de .mywork/ + los 14 proyectos + lo que THYROX ya tiene:

```
.claude/
├── CLAUDE.md                    ← <50 líneas. Reglas + locked decisions + links
│
├── context/
│   ├── focus.md                 ← Dirección actual (humano, 10-20 líneas)
│   ├── now.md                   ← Estado sesión (YAML, cold_boot, última sesión)
│   ├── constitution.md          ← 5-7 principios inmutables
│   ├── LOG.md                   ← Append-only (timestamp + acción)
│   │
│   ├── decisions/               ← ADRs (mantener como está)
│   │   └── adr-NNN.md
│   │
│   └── work/                    ← Reemplaza analysis/ + epics/ + work-logs/
│       └── YYYY-MM-DD-nombre/   ← UN directorio por paquete de trabajo
│           ├── spec.md          ← QUÉ y POR QUÉ (design)
│           ├── plan.md          ← CÓMO paso a paso (tasks con checkboxes)
│           ├── lessons.md       ← Lecciones aprendidas de este trabajo
│           └── outputs/         ← Logs, reportes, artefactos generados
│
└── skills/pm-thyrox/            ← Mantener como está (anatomía oficial)
    ├── SKILL.md                 ← <100 líneas (flujo esencial)
    ├── references/              ← Bajo demanda (mantener)
    ├── scripts/                 ← Ejecutables (mantener)
    └── assets/                  ← Templates (mantener)
```

### Por qué esta estructura

| Directorio | Inspirado por | Reemplaza |
|-----------|--------------|-----------|
| `focus.md` | Cortex focus.md | project-state.md |
| `now.md` | Cortex now.md | work-logs narrativos |
| `constitution.md` | spec-kit, valet locked decisions | constitution.md.template (instanciado) |
| `LOG.md` | build-ledger LOG.md | work-logs/ (append-only vs narrativo) |
| `work/YYYY-MM-DD/` | .mywork/changes/, valet .beans/, clawpal plans/ | analysis/ + epics/ (unificado) |
| `work/.../spec.md` | spec-kit, valet, claude-pipe PRD | analysis sueltos |
| `work/.../plan.md` | valet, clawpal impl-plan | tasks sueltos |
| `work/.../lessons.md` | agentic-framework L-NNNN, .mywork/LECCIONES | errors/ centralizado |
| `work/.../outputs/` | .mywork/build-logs/, trae-agent trajectory | Nada equivalente |
| `decisions/` | .mywork/adr/, build-ledger truths | Mantener como está |

### Lo que desaparece

| Eliminado | Por qué |
|-----------|---------|
| `analysis/` (25+ archivos) | Contenido migra a `work/` por paquete |
| `epics/` | Unificado en `work/` |
| `work-logs/` | Reemplazado por LOG.md (append-only) + now.md (estado) |
| `project-state.md` | Reemplazado por focus.md + now.md |
| `errors/` | Reemplazado por lessons.md dentro de cada work/ |

### Lo que se mantiene

| Mantenido | Por qué |
|-----------|---------|
| `decisions/` | Funciona bien, 12 ADRs útiles |
| `skills/pm-thyrox/` | Anatomía oficial, bien organizada |
| `CLAUDE.md` | Necesita reducción pero el concepto es correcto |

---

## Comparación: .mywork/ → THYROX actual → Estructura objetivo

| Aspecto | .mywork/ | THYROX actual | Objetivo |
|---------|----------|---------------|---------|
| **Work packages** | changes/YYYY-MM-DD/ | analysis/ suelto | work/YYYY-MM-DD/ |
| **Spec pipeline** | req→design→tasks por change | Mezclado en analysis/ | spec.md + plan.md por work |
| **Sesión tracking** | work-logs/ granulares | 1 work-log incompleto | LOG.md append-only + now.md |
| **Decisiones** | adr/ | decisions/ | decisions/ (mantener) |
| **Lecciones** | LECCIONES-APRENDIDAS por change | errors/ centralizado | lessons.md por work |
| **Output logs** | build-logs/ | Nada | outputs/ por work |
| **Estado actual** | Implícito | project-state.md | focus.md + now.md |
| **Principios** | No existían | constitution template sin instanciar | constitution.md instanciado |
| **Enforcement** | Ninguno | Documental ("debería") | Al menos 1 hook |

---

**Última actualización:** 2026-03-28
