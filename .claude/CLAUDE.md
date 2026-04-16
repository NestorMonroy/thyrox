```yml
type: Contexto Persistente
version: 3.5
updated_at: 2026-04-16 00:00:00
```

# CLAUDE.md — THYROX

**Level 2 — Puente entre [SKILL](skills/thyrox/SKILL.md) (Level 1) y proyecto.**

## Locked Decisions (no revisitar)

Estas son reglas del framework de metodologia — NO son ADRs del proyecto.
Los ADRs del proyecto viven en el path declarado por `adr_path` en este archivo (ver sección Configuración del Proyecto).

1. **ANALYZE first** — No planificar sin entender primero
2. **Anatomía oficial** — SKILL.md + scripts/ + references/ + assets/
3. **Git as persistence** — Zero archivos backup, historial en git
4. **Markdown only** — Sin bases de datos, sin formatos propietarios
5. **Single skill** — Un `thyrox` con references, no 15 skills separados
   *Addendum FASE 22:* Los 7 `workflow-*` skills (workflow-discover, …, workflow-track) son la excepción intencional: son herramientas de ejecución por fase, no skills de dominio tecnológico. Esta excepción está documentada en ADR-016. La regla original sigue vigente para tech skills (python, react, etc.).
   *Addendum FASE 23:* Nomenclatura resuelta a kebab-case hyphens — `workflow-*/SKILL.md`. TD-019 cerrado (FASE 23).
   *Addendum FASE 29:* Skill renombrado → `thyrox` (prefijo `pm-` eliminado — no es PM de PMI, es la metodología THYROX misma). TD-020 cerrado (FASE 29).
   *Addendum FASE 31:* Interfaz pública del framework → `/thyrox:*` (plugin namespace via `.claude-plugin/plugin.json`). Los 12 `workflow-*` skills permanecen como implementación interna. Capa de presentación complementa ADR-016. Ver ADR-019. TD-036 cerrado (FASE 31).
   *Addendum FASE 35:* Estado de sesión y work packages migrados a `.thyrox/context/` — fuera de `.claude/` (zona de configuración de Claude Code). Ver ADR en `.thyrox/context/decisions/`.
   *Addendum FASE 39:* 12 fases THYROX propias (DISCOVER → STANDARDIZE). `workflow-analyze` renombrado a `workflow-discover`. Nuevos skills: workflow-measure, workflow-analyze (Phase 3), workflow-constraints, workflow-pilot, workflow-standardize. Sistema `.claude/rules/` creado para invariantes globales.
6. **Work packages with timestamp** — `.thyrox/context/work/YYYY-MM-DD-HH-MM-SS-nombre/`
7. **Conventional Commits** — `type(scope): description`

## SKILL vs ADR — Regla de uso

|                  | SKILL.md                                     | ADR en {adr_path}                              |
|------------------|----------------------------------------------|--------------------------------------------------------|
| Que es           | Instrucciones de metodologia (como trabajar) | Registro de decision tomada (por que se eligio X)      |
| Quien lo escribe | Mantenedor del framework                     | Claude en Phase 1-2, cuando hay decision permanente    |
| Cuando modificar | Solo si cambia la metodologia de gestion     | Al tomar una decision arquitectonica del proyecto      |
| Duracion         | Vive con el framework                        | Inmutable una vez aprobado                             |

REGLA: Si la duda es "documento esto en SKILL.md o en un ADR?":
- Cambia COMO se trabaja en general -> SKILL.md
- Registra POR QUE se eligio algo en este proyecto -> ADR en {adr_path}

## Estructura

```
.claude/                       ← Configuración y extensiones de Claude Code (solo esto)
├── CLAUDE.md                  ← Este archivo (Level 2)
├── agents/                    ← Agentes nativos Claude Code (ver references/agent-spec.md)
├── commands/                  ← Comandos slash disponibles (sin frontmatter, sin disparo automático)
├── memory/                    ← Memoria persistente entre sesiones
├── references/                ← Documentación global de plataforma Claude Code (on-demand)
├── scripts/                   ← Scripts de infraestructura Claude Code (hooks, utilidades)
└── skills/                    ← Skills del framework (thyrox + workflow-*)
    └── thyrox/                ← El SKILL (Level 1): SKILL.md + references/ + scripts/ + assets/

.thyrox/                       ← Estado de trabajo + tooling del proyecto
├── context/                   ← Estado de sesión y artefactos de trabajo
│   ├── project-state.md       ← Metadata del proyecto
│   ├── focus.md               ← Dirección actual
│   ├── now.md                 ← Estado de sesión single-agent
│   ├── now-{agent-id}.md      ← Estado por agente (ejecución paralela)
│   ├── decisions/             ← ADRs (adr-{tema}.md — sin números)
│   ├── errors/                ← Registros de errores ({descripcion}.md — sin números)
│   ├── research/              ← Investigaciones y sandboxes
│   ├── technical-debt.md      ← Backlog de deuda técnica
│   └── work/                  ← Paquetes de trabajo (YYYY-MM-DD-HH-MM-SS-nombre/)
├── guidelines/                ← Directivas tech-stack (generadas por registry/_generator.sh)
│   └── {layer}-{framework}.instructions.md  ← cargadas vía @imports abajo
└── registry/                  ← Fuente de verdad y generadores
    ├── agents/                ← Definiciones YML de agentes (Flujo A)
    ├── {layer}/               ← Templates de metodología (Flujo B)
    ├── mcp/                   ← Servidores MCP de runtime (Flujo C)
    ├── bootstrap.py           ← Genera .claude/agents/ desde agents/*.yml
    └── _generator.sh          ← Genera .claude/skills/ + .thyrox/guidelines/ desde templates
```

## Tech-stack guidelines — @imports

Directivas siempre activas para el stack del proyecto. Generadas por `registry/_generator.sh`.

@.thyrox/guidelines/backend-nodejs.instructions.md
@.thyrox/guidelines/db-mysql.instructions.md
@.thyrox/guidelines/db-postgresql.instructions.md
@.thyrox/guidelines/frontend-react.instructions.md
@.thyrox/guidelines/frontend-webpack.instructions.md
@.thyrox/guidelines/python-mcp.instructions.md

**Por qué `.thyrox/` y no `.claude/context/`:**
`.claude/` está protegido por una safety invariant del binario de Claude Code — genera un prompt
de confirmación en cada escritura, incluso con `acceptEdits`. El estado de sesión (now.md, work packages)
se escribe frecuentemente: la solución correcta es moverlo fuera de `.claude/`. Ver FASE 35 y ADR al respecto.

## Reglas de edición — OBLIGATORIO

Aplicar en TODA edición de archivo, sin excepción:

1. **`updated_at` es automático** — Si el archivo que se está editando tiene `updated_at` en su frontmatter, actualizarlo al timestamp actual (`date '+%Y-%m-%d %H:%M:%S'`) en el mismo Edit. No es un paso separado, no requiere que el usuario lo pida, no requiere GATE OPERACIÓN. Es una edición consecuencia — ocurre siempre.

2. **Un solo Edit por archivo** — Nunca hacer dos Edits separados al mismo archivo: uno para el contenido y otro para `updated_at`. Ambos cambios van en la misma llamada.

3. **`updated_at` no aplica a artefactos WP** — Los archivos en `.thyrox/context/work/` tienen `created_at` en su frontmatter y no se actualizan como documentos vivos. No agregar `updated_at` donde no existía.

## Flujo de sesión — OBLIGATORIO

SIEMPRE seguir este flujo. NO omitir pasos.

1. **Inicio** — Leer `.thyrox/context/focus.md` + `.thyrox/context/now.md` + ROADMAP.md.
2. **Activar SKILL** — ANTES de responder cualquier tarea: invocar Skill tool → thyrox.
   Si el Skill tool no está disponible: leer [SKILL.md](skills/thyrox/SKILL.md) completo y seguirlo paso a paso.
3. **Identificar fase activa** — Revisar `.thyrox/context/work/`:
   - Hay work package activo → continuar en la fase donde quedó.
   - No hay work package → empezar Phase 1: DISCOVER.
4. **Trabajar** — Seguir cada fase hasta su exit criteria. NO saltarse fases. Commits convencionales. Actualizar ROADMAP.md.
5. **Cierre** — Actualizar `.thyrox/context/focus.md` + `.thyrox/context/now.md`.

## Multi-skill orchestration

Reglas cuando hay más de un skill activo en la misma sesión.

- **Máximo simultáneos:** 2-3 skills. Por encima de ese límite, el budget de context window para descripciones se satura y el triggering de todos se degrada.
- **Cuándo secuenciar:** Si skill B necesita output de skill A (e.g. tech-detector → python-mcp), ejecutar A hasta completar y commitear antes de activar B.
- **Section owners disjuntos:** Cada skill escribe en archivos distintos. Si dos skills necesitan tocar el mismo archivo, uno lo hace y el otro espera (o usa una sección marcada con `<!-- SECTION OWNER: {skill} -->`).
- **Naming de state files por skill:**
  - Orquestador / estado compartido → `.thyrox/context/now.md`
  - Agente nativo en ejecución → `.thyrox/context/now-{agent-name}.md` (e.g. `now-task-executor.md`)
  - Skill especializado → `.thyrox/context/now-{skill-name}-{wp-id}.md` (e.g. `now-security-audit-wp-auth.md`)

## Convenciones de escritura — OBLIGATORIO

Estas convenciones aplican a TODO el código y texto generado por Claude en esta sesión
y en sesiones de agentes hijos. CLAUDE.md es el único artefacto cargado automáticamente
en todas las sesiones y heredado por agentes — por eso las convenciones universales viven aquí,
no en references/ (on-demand) ni en guidelines/ (on-demand).

### Parámetro `description` del Agent tool

**Convención:** minúscula consistente (sentence case — primera palabra y nombres propios).

```python
# Correcto
Agent(description="deep-review de permisos en claude-howto", ...)
Agent(description="análisis de cobertura Phase 3 → Phase 4", ...)

# Incorrecto
Agent(description="Deep-review de permisos...", ...)
Agent(description="ANÁLISIS DE COBERTURA...", ...)
```

**Respaldo documental:**
- claude-howto `STYLE_GUIDE.md:144` — P3.1: sentence case para todos los encabezados y labels
- claude-code-ultimate-guide — ningún repo documenta explícitamente este parámetro,
  pero el ecosistema usa minúsculas para todos los valores de configuración
  (model names: `sonnet`, effort values: `low/medium/high`, kebab-case names)
- Fuente: `conventions-review-claude-howto.md` y `conventions-review-ultimate-guide.md`
  en WP `2026-04-14-09-13-51-context-migration/`

## Configuración del Proyecto

adr_path: .thyrox/context/decisions/   # THYROX: retrocompat. Nuevos proyectos: usar subdirectorios por capa (global/, api/, db/, ui/, deploy/, framework/)

## Glosario

| Término | Significado | Ejemplo |
|---------|-------------|---------|
| **FASE N** | Unidad de trabajo del proyecto — número secuencial global. Cada WP ocupa una FASE. | FASE 19: async-gates · FASE 20: context-hygiene |
| **Phase N** | Etapa del ciclo THYROX dentro de un WP (1-DISCOVER … 12-STANDARDIZE). Se reinicia en cada FASE. | FASE 20 está en Phase 10: EXECUTE |
| **WP** | Work package — directorio `.thyrox/context/work/YYYY-MM-DD-HH-MM-SS-nombre/` que contiene todos los artefactos de una FASE | `.thyrox/context/work/2026-04-08-02-05-03-context-hygiene/` |
| **SP-NNN** | Stopping Point — punto de parada explícito definido en el Stopping Point Manifest de Phase 1 | SP-06: gate 6→7, esperar aprobación humana |

**Regla mnemotécnica:** FASE es el "qué proyecto", Phase es el "en qué paso del proyecto".
Un proyecto con 20 FASEs tiene 20 WPs; cada WP recorre hasta 12 Phases internamente (escalabilidad: micro usa 5, grande usa las 12).

## Para más contexto

- Metodología completa: [SKILL](skills/thyrox/SKILL.md)
- Estado del proyecto: [project-state](../.thyrox/context/project-state.md)
- Decisiones: [decisions](../.thyrox/context/decisions.md)
- Convenciones: [conventions](references/conventions.md)
