```yml
type: Contexto Persistente
version: 3.1
updated_at: 2026-04-07 05:56:49
```

# CLAUDE.md — THYROX

**Level 2 — Puente entre [SKILL](skills/pm-thyrox/SKILL.md) (Level 1) y proyecto.**

## Locked Decisions (no revisitar)

Estas son reglas del framework de metodologia — NO son ADRs del proyecto.
Los ADRs del proyecto viven en el path declarado por `adr_path` en este archivo (ver sección Configuración del Proyecto).

1. **ANALYZE first** — No planificar sin entender primero
2. **Anatomía oficial** — SKILL.md + scripts/ + references/ + assets/
3. **Git as persistence** — Zero archivos backup, historial en git
4. **Markdown only** — Sin bases de datos, sin formatos propietarios
5. **Single skill** — Un pm-thyrox con references, no 15 skills separados
   *Addendum FASE 22:* Los 7 `workflow-*` skills (workflow-analyze, …, workflow-track) son la excepción intencional: son herramientas de ejecución por fase, no skills de dominio tecnológico. Esta excepción está documentada en ADR-016. La regla original sigue vigente para tech skills (python, react, etc.).
   *Addendum FASE 23:* Nomenclatura resuelta a kebab-case hyphens — `workflow-*/SKILL.md`. TD-019 cerrado (FASE 23).
6. **Work packages with timestamp** — context/work/YYYY-MM-DD-HH-MM-SS-nombre/
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
.claude/
├── CLAUDE.md              ← Este archivo (Level 2)
├── agents/                ← Agentes nativos Claude Code (ver references/agent-spec.md)
├── commands/              ← Comandos slash disponibles (sin frontmatter, sin disparo automático)
├── context/
│   ├── project-state.md   ← Metadata del proyecto
│   ├── focus.md           ← Dirección actual
│   ├── now.md             ← Estado de sesión single-agent
│   ├── now-{agent-id}.md  ← Estado por agente (ejecución paralela)
│   ├── decisions/         ← ADRs (global/ api/ db/ ui/ deploy/ framework/ + raíz legacy)
│   └── work/              ← Paquetes de trabajo (YYYY-MM-DD-HH-MM-SS-nombre/)
├── guidelines/            ← Directivas siempre cargadas (generadas por registry, no on-demand)
├── memory/                ← Memoria persistente entre sesiones
├── references/            ← Documentación global de plataforma Claude Code (on-demand)
├── registry/              ← Registro de tech skills y agentes
├── scripts/               ← Scripts de infraestructura Claude Code (hooks, utilidades)
└── skills/                ← Skills del framework (pm-thyrox + workflow-*)
    └── pm-thyrox/         ← El SKILL (Level 1): SKILL.md + references/ + scripts/ + assets/
```

## Flujo de sesión — OBLIGATORIO

SIEMPRE seguir este flujo. NO omitir pasos.

1. **Inicio** — Leer focus.md + now.md + ROADMAP.md.
2. **Activar SKILL** — ANTES de responder cualquier tarea: invocar Skill tool → pm-thyrox.
   Si el Skill tool no está disponible: leer [SKILL.md](skills/pm-thyrox/SKILL.md) completo y seguirlo paso a paso.
3. **Identificar fase activa** — Revisar `context/work/`:
   - Hay work package activo → continuar en la fase donde quedó.
   - No hay work package → empezar Phase 1: ANALYZE.
4. **Trabajar** — Seguir cada fase hasta su exit criteria. NO saltarse fases. Commits convencionales. Actualizar ROADMAP.md.
5. **Cierre** — Actualizar focus.md + now.md.

## Multi-skill orchestration

Reglas cuando hay más de un skill activo en la misma sesión.

- **Máximo simultáneos:** 2-3 skills. Por encima de ese límite, el budget de context window para descripciones se satura y el triggering de todos se degrada.
- **Cuándo secuenciar:** Si skill B necesita output de skill A (e.g. tech-detector → python-mcp), ejecutar A hasta completar y commitear antes de activar B.
- **Section owners disjuntos:** Cada skill escribe en archivos distintos. Si dos skills necesitan tocar el mismo archivo, uno lo hace y el otro espera (o usa una sección marcada con `<!-- SECTION OWNER: {skill} -->`).
- **Naming de state files por skill:**
  - Orquestador / estado compartido → `context/now.md`
  - Agente nativo en ejecución → `context/now-{agent-name}.md` (e.g. `now-task-executor.md`)
  - Skill especializado → `context/now-{skill-name}-{wp-id}.md` (e.g. `now-security-audit-wp-auth.md`)

## Configuración del Proyecto

adr_path: .claude/context/decisions/   # THYROX: retrocompat. Nuevos proyectos: usar subdirectorios por capa (global/, api/, db/, ui/, deploy/, framework/)

## Glosario

| Término | Significado | Ejemplo |
|---------|-------------|---------|
| **FASE N** | Unidad de trabajo del proyecto — número secuencial global. Cada WP ocupa una FASE. | FASE 19: async-gates · FASE 20: context-hygiene |
| **Phase N** | Etapa del ciclo SDLC dentro de un WP (1-ANALYZE … 7-TRACK). Se reinicia en cada FASE. | FASE 20 está en Phase 6: EXECUTE |
| **WP** | Work package — directorio `context/work/YYYY-MM-DD-HH-MM-SS-nombre/` que contiene todos los artefactos de una FASE | `context/work/2026-04-08-02-05-03-context-hygiene/` |
| **SP-NNN** | Stopping Point — punto de parada explícito definido en el Stopping Point Manifest de Phase 1 | SP-06: gate 6→7, esperar aprobación humana |

**Regla mnemotécnica:** FASE es el "qué proyecto", Phase es el "en qué paso del proyecto".
Un proyecto con 20 FASEs tiene 20 WPs; cada WP recorre hasta 7 Phases internamente.

## Para más contexto

- Metodología completa: [SKILL](skills/pm-thyrox/SKILL.md)
- Estado del proyecto: [project-state](context/project-state.md)
- Decisiones: [decisions](context/decisions.md)
- Convenciones: [conventions](references/conventions.md)
