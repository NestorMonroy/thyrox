```yml
type: Solution Strategy
work_package: 2026-04-08-17-04-20-framework-evolution
created_at: 2026-04-08 18:30:00
updated_at: 2026-04-08 19:00:00
phase: Phase 2 — SOLUTION_STRATEGY
status: Draft — awaiting user approval
changelog:
  - v1.1 (2026-04-08): 6 gaps materiales corregidos post-análisis de cobertura
```

# Solution Strategy: Framework Evolution — FASE 22

## 1. Key Ideas

### KI-01: Risk-first sequencing (E→B→A→C→D)

R-05 es un riesgo **activo** hoy: `stop-hook-git-check.sh` puede entrar en loop infinito porque no verifica `stop_hook_active`. Esto hace que el Bloque E (TD-013 + TD-012) sea no-negociable como primer paso.

El resto del orden fluye naturalmente:
- B (TD-011) antes que A: mejora independiente que beneficia todos los WPs siguientes
- A (correcciones ADR-015) antes que C: el addendum de ADR-015 informa qué va en ADR-016
- D (TD-007) al final: independiente y de menor urgencia que C

### KI-02: PostCompact como hook de re-inyección (no SessionStart compact)

La documentación oficial distingue dos eventos post-compactación. `PostCompact` recibe `compact_summary` (texto del resumen generado), lo que permite verificar si el WP activo ya fue retenido antes de re-inyectarlo — evitando duplicación. `SessionStart` con matcher `compact` es más simple pero no tiene acceso al summary.

**Idea central:** el hook de contexto post-compactación debe ser inteligente, no ciego.

### KI-03: Commands → Skills hidden (unificación de Capa 2 y Capa 3)

La nueva documentación oficial muestra que Anthropic implementa sus propios comandos (`/loop`) como skills con `disable-model-invocation: true`, no como commands separados. La UX es idéntica para el usuario (`/<name>`), pero:

- Elimina una categoría arquitectónica (Capa 3 desaparece)
- Cero overhead de contexto (hidden = invisible al modelo)
- Habilitita hooks en frontmatter del skill (state management automático)
- Namespacing futuro vía plugins

**Idea central:** la distinción commands vs skills-hidden no existe en la arquitectura real de Claude Code.

### KI-04: Addendum sobre ADR (no reemplazar ADR-015)

ADR-015 sigue siendo correcto en sus decisiones fundamentales (D-01 a D-09). Los hallazgos de FASE 22 lo refinan en 4 puntos específicos. La estrategia es añadir un Addendum datado en el mismo ADR, sin cambiar su Status ni sus decisiones.

**Idea central:** ADRs son inmutables en su decisión original — los refinamientos son addenda, no reescrituras.

---

## 2. Research

### R-01: TD-012 — ¿SessionStart compact o PostCompact?

**Unknown:** ¿Cuál evento de hook ofrece mejor mecanismo de re-inyección post-compactación?

| Opción | Cuándo dispara | Input disponible | Ventaja | Contra |
|--------|---------------|-----------------|---------|--------|
| `SessionStart` + matcher `compact` | Después de compactar, como inicio de sesión | `source: "compact"` | Patrón conocido, simple | No sabe qué se retuvo |
| `PostCompact` | Directamente después de compactar | `compact_summary` (texto del resumen) | Puede verificar qué se retuvo | Feature más nueva |

**Decisión:** `PostCompact` — la capacidad de leer `compact_summary` permite lógica condicional:
si el resumen ya menciona el WP activo, no re-inyectar. Si no lo menciona, re-inyectar.
Esto elimina ruido duplicado en contextos donde la compactación preservó correctamente el estado.

**Justificación adicional:** Semánticamente `PostCompact` es más correcto — reacciona exactamente al evento de compactación. `SessionStart compact` mezcla "inicio de sesión" con "post-compactación", dos eventos conceptualmente distintos.

---

### R-02: TD-008 — ¿Mantener commands/ o migrar a skills hidden?

**Unknown:** ¿La estrategia original (sync contenido in-place en commands/) o la nueva (migrar a skills con `disable-model-invocation: true`)?

| Dimensión | commands/ (original) | skills hidden (nueva) |
|-----------|---------------------|----------------------|
| Invocación `/<name>` | ✓ (nativa) | ✓ (via skill name) |
| Context overhead | 0 (no cargan) | 0 (disable-model-invocation) |
| Arquitectura | Capa 3 separada | Unifica en Capa 2 |
| Hooks en frontmatter | ✗ No disponible | ✓ Disponible (H-HOOK-5) |
| Namespacing futuro | ✗ No disponible | ✓ Vía plugins |
| Evidencia de Anthropic | - | ✓ `/loop` es un bundled skill |
| Complejidad de migración | Menor (editar in-place) | Baja (mover + 1 línea frontmatter) |

**Decisión:** Skills hidden. Las ventajas son claras y la evidencia de que Anthropic usa este patrón internamente es definitiva. La complejidad adicional es mínima (un `mv` + una línea de frontmatter por archivo).

**Riesgo residual R-01:** Spike antes de migrar los 7 archivos — verificar que `/<name>` desde skills funciona igual que desde commands en Claude Code Web. Mitiga R-01 del risk register.

---

### R-03: H-NEW-3 — ¿Incluir TD-009 scope ampliado en FASE 22?

**Unknown:** H-NEW-3 descubrió que los subagents no heredan skills del padre — los agentes de THYROX (task-executor, task-planner, etc.) necesitan `skills: [pm-thyrox]` explícito en su frontmatter. ¿Esto va en FASE 22?

**Análisis:**
- TD-009 ya existía como "implementar `now-{agent-name}.md` en definiciones de agentes"
- H-NEW-3 amplía ese scope: además del state file, cada agente necesita `skills:` declarado
- Las dos mejoras son cohesivas — pertenecen al mismo WP

**Decisión:** Diferir a TD-009. No entra en FASE 22.

**Justificación:** FASE 22 ya tiene 5 Bloques. Incluir TD-009 rompería la cohesión del WP (framework evolution = documentación + hooks + TD-008). TD-009 es un WP propio sobre agent definitions. Se registra el scope ampliado en TRACK (Phase 7) para que TD-009 no se planifique incompleto.

---

### R-04: H-HOOK-6 / PreCompact — ¿Cuáles eventos nuevos entran en FASE 22?

**Unknown:** El análisis identificó dos items como "relevantes para THYROX" pero sin Bloque asignado:
- `PreCompact`: guardar estado crítico antes de compactar
- H-HOOK-6 campo `if`: proteger archivos críticos con `Edit(.claude/CLAUDE.md)` y ADRs

**Análisis:**

| Item | Urgencia | Dependencia | Veredicto |
|------|----------|-------------|-----------|
| `PreCompact` | Media | Independiente del Bloque E | Diferir — no hay riesgo activo hoy |
| Campo `if` (v2.1.85+) | Baja | Requiere conocer versión mínima | Diferir — protección valiosa pero no crítica |

**Decisión:** Ambos quedan fuera de FASE 22. Se registran como TDs nuevos en Phase 7 TRACK:
- **TD-014 (propuesto):** Hook `PreCompact` para persistir WP activo + fase antes de compactar
- **TD-015 (propuesto):** Hook `PreToolUse` con campo `if` para proteger CLAUDE.md y ADRs de edición directa

---

### R-05: ADR-015 — ¿Addendum o ADR-016 para correcciones?

**Unknown:** ¿Las correcciones a ADR-015 (H1, Capa 0, rules/, agent teams) van en el mismo ADR o requieren un nuevo ADR?

**Criterio del framework:** "ADR en `adr_path` = registro de decisión tomada (por qué se eligió X). Inmutable una vez aprobado."

- H1, Capa 0, rules/, agent teams son **refinamientos de conocimiento** sobre el mismo diseño — no decisiones nuevas.
- ADR-016 está reservado para la decisión nueva de commands → skills hidden (TD-008).

**Decisión:** Addendum datado en ADR-015. Status permanece "Accepted". ADR-016 es para TD-008.

**Scope completo del Addendum (corregido post gap-analysis):**
- H1 matizado: 3 modos de triggering (model-invocable, user-invocable, hidden)
- Capa 0 corregida: 4 tipos de hook (command, prompt, agent, http) — no "100% determinístico"
- Tabla 5 capas: añadir `.claude/rules/` como sublayer path-scoped de Capa 1
- Tabla 5 capas: actualizar Capa 3 → skills hidden (post-D-FE-03)
- **Tabla de mecanismos en ADR-015**: añadir "Agent teams" como 4ta categoría (peer-to-peer, experimental)
- skill-vs-agent.md: añadir agent teams + **actualizar tabla de triggering** (3 modos) + **actualizar sección de hooks** (4 tipos)

*Nota: Plugins (H-NEW-5) se omite del Addendum — "no relevante en lo inmediato" según el análisis. Puede incluirse como nota marginal pero no requiere corrección de diseño.*

---

## 3. Pre-design Check

### Verificación contra ADR-015

| Decisión ADR-015 | ¿Conflicto con esta estrategia? |
|------------------|---------------------------------|
| D-01: Cada capa tiene un único nivel de triggering | ✓ Compatible. Mover commands a skills-hidden consolida, no mezcla |
| D-02: pm-thyrox SKILL → catálogo post-TD-008 | ✓ Compatible. TD-008 sigue siendo prerequisito de D-02 |
| D-03: /workflow_* = única fuente de verdad | ✓ Compatible. Migrar a skills no cambia que son la fuente de verdad de lógica de fase |
| D-04: SessionStart hook muestra dos rutas | ✓ Compatible. Post-TD-008 se elimina etiqueta [outdated] |
| D-06: La arquitectura no oculta sus gaps | ✓ Compatible. El addendum documenta explícitamente los gaps del ADR-015 original |
| D-07: Capa 2 soporta N skills | ✓ Compatible. Añadir workflow_* skills no supera el límite de 2-3 simultáneos (son hidden) |

**Conclusión pre-design:** Ninguna decisión de ADR-015 entra en conflicto. La estrategia los extiende consistentemente.

### Verificación Locked Decisions (CLAUDE.md)

| Locked Decision | ¿Respetada? |
|----------------|-------------|
| ANALYZE first | ✓ Phase 1 completada con 5 sesiones de análisis |
| Git as persistence | ✓ Ningún archivo backup propuesto |
| Markdown only | ✓ Todos los artefactos son .md |
| Single skill | ✓ pm-thyrox permanece el único PM skill |
| Conventional commits | ✓ Todos los commits siguen `type(scope): description` |

---

## 4. Decisions

### D-FE-01: Secuencia de implementación E→B→A→C→D

**Decisión:** Implementar en el orden: Bloque E → B → A → C → D.

**Alternativas consideradas:**
- A→C→D→E→B: priorizaría la arquitectura sobre el riesgo operacional → R-05 permanece activo durante toda la fase
- E→C→A→B→D: C antes que A → ADR-016 se crearía sin el contexto del addendum de ADR-015

**Justificación:** R-05 (loop infinito en stop-hook) es riesgo activo. Los 5 minutos que toma Bloque E mitigan ese riesgo antes de cualquier otra tarea. B es independiente y mejora calidad para el resto de la sesión.

**Implicaciones:** Bloque E puede ejecutarse en la misma sesión que B. C es la tarea más grande (~6-9 subtareas) y ocupará probablemente 2-3 sesiones separadas.

---

### D-FE-02: TD-012 implementado como hook PostCompact

**Decisión:** Crear `session-resume.sh` (o añadir lógica en `session-start.sh`) usando el evento `PostCompact` con acceso a `compact_summary`.

**Lógica del hook:**
1. Leer `compact_summary` del input JSON
2. Si el summary menciona el WP activo (check `grep` del WP path) → no re-inyectar
3. Si no lo menciona → imprimir: WP activo + fase + próxima tarea (sin el banner completo)

**Alternativa descartada:** `SessionStart` con matcher `compact` — más simple pero sin lógica condicional.

**Implicaciones:** Requiere actualizar `settings.json` para añadir el hook `PostCompact`. No modifica el `SessionStart` hook existente.

---

### D-FE-03: TD-008 implementado como migración commands → skills hidden (requiere ADR-016)

**Decisión:** Migrar los 7 archivos `/workflow_*` de `.claude/commands/` a `.claude/skills/` con `disable-model-invocation: true` en frontmatter. Cada skill también recibe un hook en frontmatter para auto-actualizar `now.md::phase`.

**Detalle de implementación de hooks en frontmatter (H-REF-3):**
Cada hook de workflow_* skill debe usar `once: true` para garantizar que la actualización de `now.md::phase` solo dispara una vez por sesión, aunque el usuario invoque el mismo skill múltiples veces (e.g., `/workflow_execute` → `/workflow_execute` → segunda invocación no sobreescribe innecesariamente).

**Precondición:** Spike de verificación (R-01) antes de migrar. 1 skill de prueba primero.

**Implicaciones en ADR-015:**
- Tabla de 5 capas cambia: Capa 3 pasa de "commands/" a "skills hidden" o desaparece (se unifica con Capa 2)
- Esta implicación se documenta en ADR-016 (la decisión de migrar) y como Addendum en ADR-015

**Nuevo artefacto necesario:** ADR-016 que documenta la decisión de commands → skills hidden.

---

### D-FE-04: ADR-015 recibe Addendum (Status permanece Accepted)

**Decisión:** Añadir sección "Addendum 2026-04-08" al final de ADR-015 con las siguientes correcciones (scope completo derivado del análisis):

**En ADR-015:**
1. H1 matizado: 3 modos de triggering (model-invocable / user-invocable / hidden `disable-model-invocation:true`)
2. Capa 0 corregida: 4 tipos de hook (command, prompt, agent, http) — "determinístico" aplica solo a `type:command`
3. Tabla 5 capas: añadir `.claude/rules/` como sublayer path-scoped en Capa 1
4. Tabla 5 capas: Capa 3 actualizada → skills hidden (refleja D-FE-03)
5. **Tabla de mecanismos**: añadir "Agent teams" como categoría peer-to-peer (experimental, disabled by default)

**En skill-vs-agent.md** (artefacto de referencia vinculado a ADR-015):
6. Añadir "Agent teams" como 4ta categoría en tabla de mecanismos
7. **Actualizar tabla de triggering**: incluir los 3 modos (no solo probabilístico vs determinístico)
8. **Actualizar sección de hooks**: documentar los 4 tipos (command / prompt / agent / http)

**Nota:** H-REF-1 enhancement (`last_assistant_message` en TD-013) no entra en FASE 22 — solo la verificación básica de `stop_hook_active`. Se documenta como mejora futura en la descripción de TD-013.

**Alternativa descartada:** ADR nuevo — las correcciones refinan conocimiento, no toman una decisión nueva sobre la arquitectura.

---

## 5. Post-design Re-check

### ¿Las decisiones son coherentes entre sí?

| Check | Resultado |
|-------|-----------|
| D-FE-01 (secuencia) depende de D-FE-02, D-FE-03, D-FE-04 | ✓ Independientes en contenido, relacionadas en orden |
| D-FE-03 (commands→skills) invalida alguna decisión de ADR-015 | ✓ No. D-FE-03 requiere ADR-016 como registro, el Addendum de ADR-015 lo referencia |
| D-FE-02 (PostCompact) crea conflicto con SessionStart existente | ✓ No. Son eventos distintos — `PostCompact` y `SessionStart` coexisten sin interferencia |
| La migración D-FE-03 cumple D-03 de ADR-015 (única fuente de verdad) | ✓ Skills migrados siguen siendo la fuente de verdad de lógica de fase |

### ¿Hay riesgos nuevos introducidos por esta estrategia?

| Riesgo | Severidad | Mitigación |
|--------|-----------|-----------|
| Spike R-01: skills hidden no se invoca con `/<name>` | Medio | Spike es la primera subtarea del Bloque C — si falla, fallback a commands/ |
| PostCompact + `compact_summary` parsing frágil | Bajo | Check permisivo: si falla el parse → re-inyectar siempre |
| **R-02 (del análisis): Context overflow en TD-008** — 7 archivos a sincronizar | Alto (probabilidad) | **Batch de 2-3 subtareas/sesión** (L-085 aplicada). Phase 3 PLAN debe respetar este constraint al definir la granularidad de las subtareas de Bloque C |
| **R-04 (del análisis): Bloque C desplaza a D indefinidamente** | Media | Bloque B (TD-011) se ejecuta antes y es independiente de C. Si C se extiende, D puede ejecutarse en paralelo o en WP separado |

### ¿Queda algo sin decidir antes de Phase 3 PLAN?

- [ ] **Usuario:** ¿Aprobación de la estrategia?
- [ ] **Usuario:** ¿Alguna objeción a commands→skills hidden o prefiere mantener Capa 3 separada?
- [ ] **Para Phase 3:** Definir subtareas exactas de Bloque C (estimado 6-9 tasks) incluyendo el spike

---

## Resumen ejecutivo

| Bloque | TDs | Estrategia | Artefactos nuevos |
|--------|-----|-----------|-------------------|
| **E** (primero) | TD-013, TD-012 | `stop_hook_active` check + `PostCompact` hook (condicional con `compact_summary`) | `session-resume.sh` o lógica en session-start.sh |
| **B** | TD-011 | Añadir checklist atomicidad en SKILL.md Phase 5 | — |
| **A** | ADR-015 correcciones | Addendum ADR-015 (5 correcciones) + skill-vs-agent.md (3 actualizaciones) | Addendum en ADR-015 |
| **C** | TD-008 | commands → skills hidden + `once:true` en hooks de frontmatter + spike (R-01) + batch 2-3/sesión (R-02) | ADR-016 + 7 skills migrados |
| **D** | TD-007 | Step 0 en Phase 1 de SKILL.md + template `*-context.md` | Template `*-context.md` |

### TDs diferidos identificados en FASE 22 (registrar en Phase 7 TRACK)

| TD propuesto | Origen | Descripción |
|--------------|--------|-------------|
| TD-009 (scope ampliado) | H-NEW-3 | Agentes THYROX necesitan `skills: [pm-thyrox]` en frontmatter (no solo `now-{agent}.md`) |
| TD-014 (nuevo) | H-HOOK-2 | Hook `PreCompact` para persistir WP activo + fase antes de compactar |
| TD-015 (nuevo) | H-HOOK-6 | Hook `PreToolUse` con campo `if` para proteger CLAUDE.md y ADRs de edición directa |
