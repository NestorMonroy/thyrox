```yml
Fecha: 2026-03-28
Proyecto: THYROX
Tipo: Análisis de referencia (Phase 1: ANALYZE)
Referencia: /tmp/thyrox-references/ClaudeViewer/
```

# Análisis: ClaudeViewer — .serena memories y spec pipeline

## Qué es

App de Electron para visualizar conversaciones de Claude Code. Proyecto pequeño pero con organización ejemplar: spec → implPlan → ui pipeline, y un sistema `.serena/memories/` para contexto modular por demanda.

---

## El concepto más importante: .serena/memories/

En vez de un CLAUDE.md monolítico o un README gigante, el conocimiento del proyecto está en **módulos pequeños de propósito único** que se cargan bajo demanda:

```
.serena/memories/
├── project_overview.md       ← ¿Qué es este proyecto? (big picture)
├── project_structure.md      ← ¿Cómo está organizado? (navegación)
├── tech_stack.md             ← ¿Qué tecnologías usa? (dependencias)
├── code_style_conventions.md ← ¿Cómo se escribe código? (reglas)
├── suggested_commands.md     ← ¿Qué comandos existen? (workflow)
└── task_completion_checklist.md ← ¿Cuándo está "listo"? (QA)
```

**Cómo funciona:**
- `project.yml` configura el entorno (idioma, paths ignorados, modo read-only)
- Cada memory se carga cuando es relevante (no todo de una vez)
- Operaciones: `read_memory`, `write_memory`, `list_memories`

**La diferencia fundamental:**
```
Enfoque tradicional: Cargar TODO el contexto al inicio → Gastar tokens
Enfoque memories:    Cargar SOLO lo relevante cuando se necesita → Eficiente
```

### Comparación con THYROX

| Aspecto | .serena/memories/ | THYROX references/ |
|---------|------------------|-------------------|
| **Tamaño por archivo** | 20-50 líneas (denso) | 200-400 líneas (extenso) |
| **Propósito** | UN concepto por archivo | Múltiples conceptos mezclados |
| **Cuándo se carga** | Bajo demanda | Cuando Claude decide leer |
| **Naming** | Descriptivo (project_overview) | Temático (solution-strategy) |
| **Audiencia** | Explícitamente para AI | Mixto (AI + humanos) |

---

## Spec → implPlan → ui pipeline

3 documentos, 3 propósitos:

| Documento | Pregunta que responde | Inmutable? |
|-----------|----------------------|------------|
| spec.md | ¿QUÉ features tiene? | Sí (requirements no cambian) |
| implPlan.md | ¿CÓMO se construye? (10 fases) | No (se actualiza con progreso) |
| ui.md | ¿CÓMO se ve? (screens, interacciones) | No (evoluciona con diseño) |

**Lo único:** Cada fase tiene fecha de aprobación (承認日):
```
Phase 1: 承認日: 2025-09-07
Phase 2: 承認日: 2025-09-08
```

Esto crea un **audit trail de entregas** — puedes ver exactamente cuándo se aprobó cada fase.

---

## CLAUDE.md como capa de reglas

CLAUDE.md aquí es corto y prescriptivo:

```markdown
"Do not prepare fallbacks. Make errors instead."
"If unintended behavior occurs, you must throw errors."
```

No es un README disfrazado. Son REGLAS que el AI debe seguir. Todo lo demás está en memories/.

**Esto confirma el patrón de agentic-framework (L-0002):** Las instructions primarias deben ser CORTAS y PRESCRIPTIVAS. El contexto detallado va en otro lado.

---

## task_completion_checklist como definición de "done"

```
✅ Code Quality: npm run lint (0 errors) + npm run format
✅ Build: npm run build (compila limpio)
✅ Runtime: npm run dev (funciona)
✅ Errors: No fallbacks, proper error messages
✅ Git: git status (sin archivos inesperados)
✅ Process: Follow CLAUDE.md, no .md files innecesarios
```

**Es testable** — cada item es verificable mecánicamente. No "la calidad es buena" sino "npm run lint retorna 0 errores."

---

## Arquitectura de contexto de 2 capas

```
Capa 1: CLAUDE.md (siempre cargado)
├── Reglas de error handling
├── Comandos de desarrollo
└── Overview de arquitectura

Capa 2: .serena/memories/ (bajo demanda)
├── project_overview    → cuando necesitas big picture
├── project_structure   → cuando navegas el codebase
├── tech_stack          → cuando entiendes dependencias
├── code_style          → cuando escribes código
├── commands            → cuando necesitas ejecutar algo
└── checklist           → cuando terminas una tarea
```

**THYROX tiene algo similar pero no tan limpio:**
```
Capa 1: CLAUDE.md + SKILL.md (siempre cargado, ~488 líneas)
Capa 2: references/ (bajo demanda, 21 archivos de 200+ líneas cada uno)
```

El problema: nuestra Capa 1 es demasiado grande (L-0002) y nuestra Capa 2 tiene archivos muy largos.

---

## Meta-patrones actualizados con 12 proyectos

### Patrón nuevo: Contexto modular bajo demanda

| Proyecto | Cómo organiza contexto |
|----------|----------------------|
| ClaudeViewer | .serena/memories/ (6 módulos, 20-50 líneas c/u) |
| Cortex-Template | L0-L3 layers (constitution→session→workspace→on-demand) |
| agentic-framework | 3 capas (Constitution→Playbooks→State) |
| conv-temp | 3 tiers (essential→contextual→archive) |
| **THYROX** | 2 capas (SKILL+CLAUDE → references/) pero mal dimensionadas |

**Convergencia:** TODOS los proyectos maduros separan contexto en capas. La Capa 1 debe ser CORTA. Lo demás bajo demanda.

### Patrón confirmado: Spec como pipeline (no monolito)

| Proyecto | Pipeline |
|----------|----------|
| claude-pipe | PRD → BUILD_SPEC |
| clawpal | design → impl-plan |
| spec-kit | spec → plan → tasks |
| ClaudeViewer | spec → implPlan → ui |
| **THYROX** | 8 subsecciones → strategy → plan → structure → tasks |

**Convergencia:** 2-3 documentos max. THYROX tiene demasiados pasos.

### Patrón confirmado: Definition of Done operacional

| Proyecto | Cómo define "done" |
|----------|-------------------|
| ClaudeViewer | task_completion_checklist (npm commands verificables) |
| agentic-framework | 16 pre-commit gates + acceptance criteria |
| spec-kit | spec-quality-checklist |
| trae-agent | task_done tool + verificación |
| **THYROX** | EXIT_CONDITIONS (documental, no ejecutable) |

**Convergencia:** "Done" debe ser verificable mecánicamente, no un checklist que alguien lee.

---

## Lecciones para THYROX

### Adoptar

1. **Memories como módulos pequeños** — Nuestras references/ de 200+ líneas son demasiado largas. Dividir en módulos de 20-50 líneas enfocados en UN concepto.

2. **CLAUDE.md como reglas puras** (<50 líneas) — No mezclar contexto de proyecto con reglas de comportamiento. Reglas van en CLAUDE.md. Contexto va en memories/references.

3. **Checklist de completion verificable** — Cada item debe ser ejecutable (script o comando), no descriptivo.

### La reflexión

ClaudeViewer es el proyecto más PEQUEÑO de los 12 que analizamos. Pero tiene la organización de contexto más LIMPIA. Demuestra que **la calidad de la organización no depende del tamaño del proyecto.**

Un proyecto de 10 archivos con 6 memories bien enfocados es más navegable que THYROX con 100+ archivos dispersos.

---

**Última actualización:** 2026-03-28
