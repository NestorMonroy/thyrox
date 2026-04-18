```yml
Tipo: Documentación Principal
Categoría: Arquitectura
Versión: 3.0
Propósito: Decisiones arquitectónicas del proyecto THYROX
Fecha actualización: 2026-04-17
```

# ARCHITECTURE — THYROX

## Visión General

THYROX es un sistema de Agentic AI para gestión de proyectos. No es una aplicación — es un **sistema agentic** con soporte nativo para 11 metodologías formales vía coordinators especializados. Implementado actualmente sobre Claude Code (Anthropic), empaquetado como Skills y agentes nativos.

---

## Estructura Arquitectónica

```
thyrox/                      ← El skill (el motor)
├── SKILL.md                 Instrucciones (~250 líneas, progressive disclosure)
├── scripts/                 Código ejecutable (detect/convert/validate)
├── references/              Documentación cargada en contexto bajo demanda
└── assets/                  Templates copiados para generar output
```

Sigue la anatomía oficial de Anthropic para skills:
- **SKILL.md**: Solo lo esencial + navegación a references
- **scripts/**: Token efficient, deterministic, ejecutable sin cargar en contexto
- **references/**: Documentación que Claude lee cuando la necesita
- **assets/**: Archivos que se copian al output, no se cargan en contexto

---

## Arquitectura de Coordinators

### Las 4 capas

```
Capa 1 — Intake
  Usuario invoca: @coordinator-name o contexto activa routing automático

Capa 2 — Routing
  .thyrox/registry/routing-rules.yml
  Define señales de contexto → coordinator asignado

Capa 3 — Coordinators (11)
  Cada coordinator gestiona su metodología, steps y artefactos
  Corre en worktree aislado (isolation: worktree)
  Actualiza now.md::flow + now.md::methodology_step en cada transición

Capa 4 — Artifact-ready signals
  Coordinator emite señal cuando completa un stage
  Orquestador recibe y puede activar siguiente coordinator o continuar
```

### Flujo de estado por coordinator

```
now.md::flow            → identifica la metodología activa
now.md::methodology_step → identifica el paso actual (namespace:paso)
now.md::coordinators    → tracking multi-coordinator (estado, artefactos)

Ejemplo: DMAIC en analyze
  flow: dmaic
  methodology_step: dmaic:analyze
  coordinators:
    dmaic-coordinator:
      status: active
      current_step: dmaic:analyze
      artifacts_produced: [dmaic-define.md, dmaic-measure.md]
```

### Los 11 coordinators

| Coordinator | Metodología | Tipo de flujo | Namespace |
|-------------|-------------|---------------|-----------|
| `dmaic-coordinator` | DMAIC Six Sigma | Secuencial | `dmaic` |
| `pdca-coordinator` | PDCA Deming | Cíclico | `pdca` |
| `pm-coordinator` | PMBOK PMI | Secuencial | `pm` |
| `ba-coordinator` | BABOK v3 | No-secuencial | `ba` |
| `rup-coordinator` | RUP iterativo | Iterativo | `rup` |
| `rm-coordinator` | Requirements Management | State-machine | `rm` |
| `lean-coordinator` | Lean Six Sigma | Secuencial | `lean` |
| `bpa-coordinator` | Business Process Analysis | Secuencial | `bpa` |
| `pps-coordinator` | Toyota PPS | State-machine | `pps` |
| `sp-coordinator` | Strategic Planning | Cíclico | `sp` |
| `cp-coordinator` | Consulting Process | Secuencial | `cp` |

**Behaviors no-lineales:**
- **BABOK**: 6 knowledge areas sin orden fijo — routing por contexto del WP
- **RM/PPS**: state machines con retornos condicionales (RM: validation→analysis si falla; PPS: evaluate→analyze si target no alcanzado)
- **RUP**: milestones formales LCO/LCA/IOC/PD como tollgates entre iteraciones
- **SP**: ciclo estratégico `sp:adjust → sp:analysis` para revisiones periódicas

---

## `.thyrox/registry/` — Fuente de verdad

El directorio `.thyrox/registry/` es la fuente de verdad del framework. Todo lo que aparece en `.claude/agents/` y `.thyrox/guidelines/` se genera a partir de él.

```
.thyrox/registry/
├── agents/               ← Definiciones YML de los 23 agentes nativos
│   └── {nombre}.yml      ← description, model, tools, system prompt
├── methodologies/        ← 11 YAMLs — uno por coordinator
│   └── {metodologia}.yml ← steps:, flow_type:, artifacts:, routing_signals:
├── routing-rules.yml     ← Señales de contexto → coordinator asignado
├── bootstrap.py          ← Genera .claude/agents/*.md desde agents/*.yml
└── _generator.sh         ← Genera .claude/skills/ + .thyrox/guidelines/ desde templates
```

**bootstrap.py** — Lee cada `agents/*.yml` y genera el archivo `.claude/agents/{nombre}.md` correspondiente. Ejecutar después de modificar cualquier definición de agente.

**_generator.sh** — Lee templates de metodología y genera los skills `workflow-*` en `.claude/skills/` y las directivas en `.thyrox/guidelines/`. Ejecutar después de modificar templates de metodología.

**routing-rules.yml** — Reglas declarativas para activación automática de coordinators según señales del contexto (palabras clave, tipo de WP, stack técnico).

---

## Hooks del framework

Los hooks están registrados en `.claude/settings.json`. THYROX usa 3 hooks:

| Evento hook | Script | Propósito |
|-------------|--------|-----------|
| `SessionStart` | `.claude/scripts/session-start.sh` | Inyecta contexto del WP activo al inicio de cada sesión. Muestra stage, próxima tarea y tech skills activos. |
| `PostCompact` | `.claude/scripts/session-resume.sh` | Re-inyecta contexto del WP activo después de compactación. Evita pérdida de contexto en sesiones largas. |
| `Stop` | `.claude/scripts/stop-hook-git-check.sh` | Verifica estado de git al detener Claude Code. Alerta sobre cambios sin commitear. |

**`close-wp.sh` NO es un hook.** Es un script de cierre manual del WP — se invoca explícitamente por el LLM o el usuario al completar un work package (Stage 11/12). No está registrado como hook en `settings.json`. Resetea `now.md` y llama a `update-state.sh`.

---

## Decisiones Arquitectónicas

### ADR-001: Markdown como formato único

**Decisión:** Toda documentación en Markdown versionado en Git.<br>
**Razón:** Universal, git-friendly, legible por humanos y AI, sin dependencias.<br>
**Consecuencia:** No hay queries complejos. El filesystem es la base de datos.

### ADR-002: ROADMAP.md como fuente de verdad

**Decisión:** Un solo archivo para estado de progreso del proyecto.<br>
**Razón:** Simple, versionado, sin herramientas externas.<br>
**Consecuencia:** No GitHub Issues, no Jira, no Notion.

### ADR-003: Conventional Commits

**Decisión:** Formato estandarizado para todos los commits.<br>
**Razón:** Changelog automático e historial legible.<br>
**Consecuencia:** `type(scope): description`

### ADR-004: Single Skill con Progressive Disclosure

**Decisión:** Un solo skill (`thyrox`) con 47 references, no 15 skills separados.<br>
**Razón:** Evita fragmentación, Claude solo carga lo que necesita.<br>
**Consecuencia:** SKILL.md ≤500 líneas. References on-demand vía sección de navegación.

### ADR-005: DISCOVER primero

**Decisión:** Stage 1 es DISCOVER, no PLAN.<br>
**Razón:** No se puede planificar lo que no se entiende.<br>
**Consecuencia:** Orden natural: DISCOVER → BASELINE → DIAGNOSE → CONSTRAINTS → STRATEGY → SCOPE → DESIGN → PLAN EXECUTION → PILOT → IMPLEMENT → TRACK → STANDARDIZE.

### ADR-006: Separación Motor / Trabajo

**Decisión:** `skills/thyrox/` (estático) separado de `.thyrox/context/` (dinámico).<br>
**Razón:** El skill es reutilizable, el trabajo es específico por proyecto.<br>
**Consecuencia:** Copiar `thyrox/` no arrastra trabajo anterior.

### ADR-007: Detect/Convert/Validate Pattern

**Decisión:** Cada herramienta tiene 3 scripts con responsabilidad única.<br>
**Razón:** Composable para CI/CD, cada uno sirve a una fase distinta.<br>
**Consecuencia:** Scripts bash (portable) + python (parsing).

### ADR-008: Git como única persistencia

**Decisión:** Zero archivos backup en el repo.<br>
**Razón:** Git ya versiona todo.<br>
**Consecuencia:** No hay `_backup_*.md` ni `SKILL.md.backup`.

---

## Technology Stack

```
Documentation:     Markdown (.md)
Version Control:   Git
AI Runtime:        Claude Code (Anthropic)
Scripts:           Bash (portable) + Python 3 (parsing)
Templates:         .template files
Registry:          YAML (.yml) — fuente de verdad para agentes y metodologías
```

**Zero dependencias externas** — Solo git + Claude Code.

---

## Convenciones

**Archivos:** `kebab-case.md`<br>
**Carpetas:** `lowercase/`<br>
**Commits:** `type(scope): description`<br>
**Work packages:** `YYYY-MM-DD-HH-MM-SS-nombre/`<br>
**ADRs:** `adr-{tema}.md` (sin números — temáticos)<br>
**Stage directories:** `discover/` `analyze/` `plan-execution/` etc.

---

**Última actualización:** 2026-04-17
