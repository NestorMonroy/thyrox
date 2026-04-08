```yml
created_at: 2026-04-08-17-04-20
wp: 2026-04-08-17-04-20-framework-evolution
phase: 3 - PLAN
status: Aprobado — 2026-04-08
```

# Plan — FASE 22: Framework Evolution

## Scope Statement

**Problema:** Nueva documentación oficial de Claude Code (Extend Claude Code, Hooks, Schedule) revela 4 inaccuraccias en ADR-015 y habilita estrategias de implementación superiores para TDs pendientes. Además, R-05 (loop infinito en stop-hook) es un riesgo activo que debe mitigarse antes de cualquier otro trabajo.

**Usuarios:** Cualquier sesión de Claude Code que use el framework pm-thyrox — directamente afectados por la confiabilidad de los hooks, la precisión de ADR-015 como referencia de arquitectura, y el estado de los `/workflow_*` commands.

**Criterios de éxito:**

1. `stop-hook-git-check.sh` verifica `stop_hook_active` — R-05 eliminado
2. Hook `PostCompact` existe y re-inyecta WP activo condicionalmente (no duplica si ya está en `compact_summary`)
3. ADR-015 tiene Addendum 2026-04-08 con 5 correcciones + `skill-vs-agent.md` actualizado (3 items)
4. ADR-016 documenta la decisión commands → skills hidden
5. Los 7 `/workflow_*` migrados a `.claude/skills/` con `disable-model-invocation: true` + hooks `once:true`
6. Contenido de los 7 skills sincronizado con la lógica actual de SKILL.md (gates, manifest, calibración)
7. `pm-thyrox SKILL` reducido a ~40 líneas (catálogo + tabla de referencia)
8. SKILL.md Phase 5 tiene checklist de atomicidad (TD-011)
9. SKILL.md Phase 1 tiene Step 0 END USER CONTEXT + template `*-context.md` (TD-007)

---

## In-Scope

### Bloque E — Correcciones de hooks urgentes (riesgo activo)

- **TD-013:** Añadir verificación `stop_hook_active` en `stop-hook-git-check.sh`
- **TD-012:** Crear hook `PostCompact` (`session-resume.sh`) con lógica condicional sobre `compact_summary`
- **TD-012:** Registrar el nuevo hook `PostCompact` en `settings.json` (sin esto el hook nunca dispara)

### Bloque B — Mejora de SKILL.md (micro, independiente)

- **TD-011:** Añadir checklist de atomicidad en SKILL.md Phase 5 DECOMPOSE

### Bloque A — Correcciones a documentación arquitectónica

- **ADR-015 Addendum:** 5 correcciones en el ADR existente (H1 triggering, Capa 0 tipos, `.claude/rules/`, Agent teams, Capa 3 actualizada)
- **skill-vs-agent.md:** 3 actualizaciones (tabla de triggering con 3 modos, hooks con 4 tipos, Agent teams como categoría)
- **ADR-016:** Nuevo ADR para decisión commands → skills hidden

### Bloque C — TD-008 completo con estrategia ampliada

- Spike: verificar invocación `/<name>` desde skills en Claude Code Web (1 skill de prueba)
- Migrar los 7 archivos `/workflow_*` de `.claude/commands/` a `.claude/skills/`
- Añadir `disable-model-invocation: true` en frontmatter de cada uno
- Añadir hook con `once: true` en frontmatter de cada skill para auto-actualizar `now.md::phase`
- Sincronizar contenido de los 7 skills con lógica actual de SKILL.md (gates, stopping point manifest, calibración L-085)
- Reducir `pm-thyrox SKILL` a ~40 líneas (catálogo + tabla `/workflow_*`)
- Eliminar `.claude/commands/` (o dejar redirect si aplica)
- **Actualizar `session-start.sh`:** cambiar `COMMANDS_SYNCED=false → true` para eliminar etiqueta `[outdated]` de Ruta 2 (ADR-015 D-04)
- Documentar sinergia `/loop` + `/workflow_*` en el contenido del skill migrado (nota de diseño — H-SCHED-3)

### Bloque D — TD-007: END USER CONTEXT en Phase 1

- Añadir Step 0 en Phase 1 de SKILL.md
- Crear template `[nombre]-context.md` en `assets/`

---

## Out-of-Scope

| Excluido | Razón |
|----------|-------|
| TD-009: `skills: [pm-thyrox]` en frontmatter de agentes | WP propio — agentes son un dominio separado de los hooks y commands |
| TD-014: Hook `PreCompact` para guardar estado antes de compactar | Identificado como relevante pero sin riesgo activo hoy — FASE futura |
| TD-015: Hook `PreToolUse` con campo `if` para proteger CLAUDE.md y ADRs | Útil pero no crítico — requiere verificar versión mínima (v2.1.85+) |
| Enhancement `last_assistant_message` en TD-013 | v2 de TD-013 — la verificación básica de `stop_hook_active` es suficiente para FASE 22 |
| Plugins packaging de pm-thyrox | No relevante en lo inmediato — posible FASE futura si hay caso de uso real |
| Channels feature | Nueva feature experimental de Claude Code — no tiene caso de uso en THYROX hoy |
| `SessionEnd` cleanup de `now.md` | Timeout 1.5s hace esto arriesgado sin investigación adicional |
| SubagentStart/Stop hooks para logging | Útil pero no urgente — FASE futura |

---

## Estimación de esfuerzo

| Bloque / Componente | Tareas estimadas |
|---------------------|-----------------|
| E — TD-013 (stop_hook_active) | 1 |
| E — TD-012 (session-resume.sh + settings.json) | 3 |
| B — TD-011 (checklist Phase 5) | 1 |
| A — ADR-015 Addendum (5 correcciones) | 2 |
| A — skill-vs-agent.md (3 actualizaciones) | 1 |
| A — ADR-016 (nuevo ADR) | 2 |
| C — Spike verificación `/<name>` desde skills | 1 |
| C — Migrar 7 skills + frontmatter + hooks once:true | 3 |
| C — Sincronizar contenido de los 7 skills con SKILL.md | 7 |
| C — Reducir pm-thyrox SKILL + eliminar commands/ | 2 |
| C — Actualizar session-start.sh (COMMANDS_SYNCED flag) | 1 |
| D — Step 0 en SKILL.md Phase 1 | 1 |
| D — Template `*-context.md` | 1 |
| **Total** | **26 tareas** |

**Clasificación:** Grande (Bloque C domina con 15 tareas)
**Constraint de ejecución:** Bloque C se ejecuta en batches de 2-3 tareas/sesión (L-085, R-02)
**Fases activas:** 1-ANALYZE ✓ · 2-STRATEGY ✓ · 3-PLAN ← · 4-STRUCTURE · 5-DECOMPOSE · 6-EXECUTE · 7-TRACK

---

## Trazabilidad Hallazgos → Bloque

| Hallazgo | Bloque | Tarea principal |
|----------|--------|----------------|
| H-HOOK-4: `stop_hook_active` loop infinito | E | TD-013 |
| H-REF-2: PostCompact recibe `compact_summary` | E | TD-012 |
| H-NEW-2: `disable-model-invocation` (3 modos triggering) | A + C | ADR-015 H1 + TD-008 |
| H-HOOK-1: 4 tipos de hook | A | ADR-015 Capa 0 |
| H-NEW-1: `.claude/rules/` como sublayer | A | ADR-015 tabla 5 capas |
| H-NEW-4: Agent teams peer-to-peer | A | ADR-015 + skill-vs-agent.md |
| H-HOOK-5 + H-REF-3: hooks `once:true` en frontmatter | C | TD-008 hooks por skill |
| H-SCHED-1: `/loop` es bundled skill (evidencia Anthropic) | C | ADR-016 justificación |
| H-SCHED-3: sinergia `/loop` + `/workflow_*` | C | Nota de diseño en contenido del skill |
| ADR-015 D-04: `COMMANDS_SYNCED` flag para eliminar [outdated] | C | `session-start.sh` actualización |
| TD-011 (sin hallazgo externo, deuda preexistente) | B | SKILL.md Phase 5 |
| TD-007 (sin hallazgo externo, deuda preexistente) | D | SKILL.md Phase 1 |

---

## Link ROADMAP

Ver tracking: [ROADMAP.md — FASE 22](../../../../../ROADMAP.md#fase-22-framework-evolution--integraci%C3%B3n-documentaci%C3%B3n-oficial--tds-prioritarios-2026-04-08)

---

## Estado de aprobación

- [x] Scope aprobado por usuario — 2026-04-08
