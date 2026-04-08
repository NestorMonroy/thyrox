```yml
type: Solution Strategy
work_package: 2026-04-08-03-51-36-skill-architecture-review
created_at: 2026-04-08 04:15:00
phase: Phase 2 — SOLUTION_STRATEGY
constraint_primario: La arquitectura NO debe invalidarse cuando PTC llegue a Claude Code
```

# Solution Strategy: Revisión Arquitectónica de pm-thyrox SKILL

## Correcciones al análisis inicial (incorporadas tras clarificaciones)

### Corrección 1: CLAUDE.md es Capa 1, no "compensatoria"

CLAUDE.md no es una capa compensatoria — es la **capa base siempre presente** (Capa 1).
"Compensatorio" describe su *función actual* (suple la probabilística del SKILL), no su naturaleza.
Su naturaleza es: guía de comportamiento declarativa, idéntica a un system prompt. No ejecuta, no tiene estado.

El orden correcto de las 5 capas:
```
Capa 0: HOOKS           — shell scripts, 100% determinístico, ejecutado por harness
Capa 1: CLAUDE.md       — siempre en contexto, declarativo, base de comportamiento
Capa 2: pm-thyrox SKILL — probabilístico on-demand
Capa 3: /workflow_* commands — determinístico si usuario los invoca
Capa 4: AGENTES nativos — determinístico una vez lanzados
```

"Repository/git barriers" **no es una capa** — es el mecanismo de coordinación *dentro* de Capa 4
entre agentes paralelos (via `now-{agent-id}.md`, commits). Infraestructura de sincronización.

### Corrección 2: Las 3 rutas tienen calidades distintas HOY

Ejecutar "Phase 1: ANALYZE" por 3 rutas produce resultados con distinta calidad:

| Ruta | Triggering | Calidad HOY | Calidad post-migración |
|------|-----------|-------------|----------------------|
| SKILL (pm-thyrox) | Probabilístico | Alta (instrucciones actualizadas) | Alta |
| /workflow_analyze | Determinístico (usuario) | **Baja** (outdated — sin gates, sin manifest) | Alta |
| Hooks + /workflow_analyze | Determinístico (hook informa, usuario ejecuta) | **Baja** (mismo problema) | Alta |

**Consecuencia práctica:** hoy, usar `/workflow_analyze` directamente produce **regresión** vs usar
pm-thyrox SKILL. Los commands son confiables pero desactualizados. El objetivo de este WP es
eliminar esa diferencia de calidad sincronizando los commands.

**¿Quién decide la ruta?** El usuario, siempre. CLAUDE.md *instruye* a Claude a invocar pm-thyrox,
pero si el usuario escribe `/workflow_analyze`, Claude lo sigue directamente. CLAUDE.md persuade, no decide.

### Corrección 3: PTC es ortogonal a los hooks

PTC no elimina los hooks — hooks son procesos shell del OS, PTC es orquestación de tool calls
dentro del contexto de Claude. Capas completamente ortogonales.

Lo que PTC cambia cuando llegue: eficiencia interna de los agentes (N tool calls → 1 script).
Lo que PTC NO cambia: /workflow_* commands, hooks, CLAUDE.md, estructura de fases.

Para documentación externa (case studies): diseñar para HOY (hooks + commands) con nota al final:
"Cuando PTC llegue a Claude Code, los agentes lo adoptan internamente — la arquitectura de fases no cambia."

---

## Key Ideas

### Key Idea 1: PTC y /workflow_* son capas complementarias, no competidoras

```
PTC orquesta:        TOOL CALLS  (file reads, bash, search — machine-triggered)
/workflow_* orquesta: PHASES     (ANALYZE, PLAN, EXECUTE — human-triggered)
```

Una arquitectura que separa estos dos niveles es PTC-proof por diseño.
Cuando PTC llegue a Claude Code, los agentes pueden usar PTC **internamente dentro de una fase**
mientras las fases siguen siendo comandos determinísticos invocados por el usuario.
El interface no cambia — solo la eficiencia interna de ejecución mejora.

### Key Idea 2: "Humano en el loop" es un feature de diseño, no un gap

La arquitectura actual requiere que el usuario decida activamente qué ruta ejecutar
(SKILL vs /workflow_*). Doc 09 clarifica que esto es correcto: **el usuario es el guardián final**.

```
Modelo idealista (Docs 03-08): CSP solver toma decisiones → orquesta agentes
Modelo realista (Doc 09 / esta arquitectura): Usuario decide → CLAUDE.md persuade → agentes ejecutan
```

La diferencia no es un defecto — es una decisión arquitectónica deliberada.
"Autoridad distribuida" = Hooks + CLAUDE.md + Usuario + Agentes, no un único orchestrator.

**Implicación para D-04:** el hook no debe solo mostrar "ejecuta /workflow_execute".
Debe mostrar el estado y las **opciones disponibles** para que el usuario pueda decidir con información.
El hook facilita la decisión humana — no la reemplaza.

### Key Idea 3: Esta arquitectura ES el caso realista de los blueprints teóricos

```
Docs 03-08 (blueprint idealista):  CSP Model como autoridad única, 3 capas limpias
Esta arquitectura (realista HOY):   5 capas con compensación, usuario como guardián final
Post-migración (objetivo):          Convergencia — /workflow_* actualizados + hooks = determinístico + calidad alta
```

Los blueprints teóricos son válidos como referencia de diseño.
La arquitectura que construimos es la implementación realista que respeta los gaps reales de Claude Code.

---

## Research: alternativas evaluadas

### Alt-A — Status quo (SKILL monolítica)
- **PTC-compatible:** No — la orquestación probabilística es lo opuesto de PTC
- **Descartada:** Viola el constraint principal

### Alt-B — CLAUDE.md como orquestador total
- **PTC-compatible:** Sí (CLAUDE.md no tiene relación con PTC)
- **Problema:** 430+ líneas en contexto siempre — overhead en sesiones no-PM
- **Descartada:** Overhead inaceptable

### Alt-C — Hooks + /workflow_* commands como capa primaria ← **ELEGIDA**
- **PTC-compatible:** ✓ Sí. Los commands son text injection independiente de PTC.
  Cuando PTC llegue, los agentes internos de cada phase pueden adoptarlo; el /workflow_* command no cambia.
- **Hooks:** 100% determinísticos, PTC-agnostic, ya funcionan
- **Commands:** determinísticos cuando el usuario los invoca, atómicos por fase
- **Agentes:** cuando PTC llegue, pueden adoptarlo internamente sin cambiar su interface
- **Seleccionada** — cumple el constraint, ya está 70% implementada

### Alt-D — Sin SKILL central + workflow_* autónomos
- **PTC-compatible:** Sí
- **Problema:** duplicación entre commands (cada uno necesita principios, nomenclatura, etc.)
- **No seleccionada:** Alt-C cubre esto con CLAUDE.md como referencia mínima compartida

---

## Decisiones

### D-01: Separación de capas por nivel de triggering

**Decisión:** Cada capa tiene un único nivel de triggering. No mezclar.

| Capa | Nivel | Triggering | Quién escribe la lógica |
|------|-------|-----------|------------------------|
| Hooks (SessionStart/Stop) | Sistema | 100% determinístico | Shell scripts en `scripts/` |
| CLAUDE.md | Sesión | Siempre cargado | Instrucciones mínimas de flujo |
| /workflow_* commands | Fase | Determinístico (usuario) | Phase-specific markdown |
| pm-thyrox SKILL | Catálogo | Probabilístico (aceptable para catalog) | Solo descripción + tabla de commands |
| Agentes nativos | Tarea | Determinístico (Claude lanza) | Definiciones en `.claude/agents/` |

**Razón:** Mezclar capas (e.g., lógica de fase en SKILL + en commands) produce las 3 rutas
con calidad distinta que identificamos en el análisis. Una regla clara por capa elimina el bug.

**PTC-proof:** Cuando PTC llegue, actúa dentro de la Capa de Agentes — no toca las capas
superiores. La separación de capas es estable.

---

### D-02: pm-thyrox SKILL se convierte en catálogo, no en ejecutor

**Decisión:** pm-thyrox SKILL se reduce a ~30-50 líneas con 3 responsabilidades únicamente:
1. Descripción de activación (para que el Skill tool lo detecte si el usuario lo invoca)
2. Tabla de escalabilidad (micro/pequeño/mediano/grande)
3. Tabla de /workflow_* commands con descripción de cuándo usar cada uno

La lógica de cada fase se elimina de pm-thyrox SKILL y **vive únicamente en el /workflow_* command correspondiente**.

**Razón:**
- SKILL corta = descripción no truncada = mejor tasa de disparo cuando se usa como catálogo
- Elimina la duplicación (lógica en SKILL.md Y en commands)
- pm-thyrox como catálogo es PTC-compatible: un script PTC podría invocar commands programáticamente
- Cuando PTC llegue: pm-thyrox podría convertirse en un script PTC que llama `/workflow_*` en batch

**Qué NO se mueve:**
- Naming conventions y glosario FASE/Phase → quedan en CLAUDE.md (cross-phase, siempre necesarios)
- Dónde viven los artefactos → referencia en CLAUDE.md o en references/

---

### D-03: /workflow_* commands como única fuente de verdad de la lógica de fase

**Decisión:** Cada /workflow_* command contiene la lógica completa y actualizada de su fase.
pm-thyrox SKILL no duplica esa lógica.

**Sincronización:** Al migrar, se copian las instrucciones actuales de SKILL.md a cada command.
workflow_* commands pasan a ser el artefacto principal; SKILL.md se regenera desde ellos.

**PTC-proof:** Los commands son markdown estático. PTC los puede "llamar" inyectándolos en un
prompt programáticamente. El formato no cambia con PTC.

**Versionado:** Cada command tiene su propio frontmatter con `updated_at`. Si una fase se actualiza,
solo ese command cambia — sin tocar SKILL.md ni los otros commands.

---

### D-04: SessionStart hook actualizado para /workflow_* como acción primaria

**Decisión:** session-start.sh pasa de "invocar pm-thyrox SKILL" como primera instrucción a
mostrar directamente qué /workflow_* command ejecutar según el estado del WP activo.

**Lógica (100% dinámica — lee el repo en cada ejecución):**
```bash
# Lee now.md::phase        → determina fase activa del WP
# Lee now.md::current_work → determina el WP activo
# Lee *-task-plan.md       → extrae primer checkbox [ ] como próxima tarea
# Lee .claude/skills/      → lista tech skills activos (excluye pm-thyrox)

# Output por fase: estado + DOS opciones (SKILL route vs command route)

# Si phase: Phase 6 → muestra:
#   "WP activo: context-hygiene · Phase 6 · Próxima tarea: T-007"
#   "  Opción A (calidad alta, hoy): Invocar pm-thyrox SKILL → Phase 6: EXECUTE"
#   "  Opción B (determinístico):    /workflow_execute  [outdated hasta post-migración]"

# Si null/sin WP → muestra:
#   "Sin WP activo"
#   "  Para nuevo WP: invocar pm-thyrox SKILL → Phase 1: ANALYZE"
#   "  Alternativa:   /workflow_analyze        [outdated hasta post-migración]"
```

**Razón:** El hook facilita la **decisión del usuario** — no la reemplaza.
"Humano en el loop" es un feature: el hook da información, el usuario elige la ruta.
Post-migración (commands sincronizados), la advertencia "outdated" desaparece y ambas opciones son equivalentes.

**PTC-proof:** El hook seguirá siendo un script shell. PTC no afecta los hooks.

**Stop hook:** se dispara en el evento `stop` del harness (cierre de sesión), no periódicamente.
Verifica `git log origin/branch..HEAD` — bloquea si hay commits locales sin push.

---

### D-06: La arquitectura no oculta sus gaps — los hace visibles

**Decisión:** Mientras /workflow_* commands estén desactualizados, la arquitectura debe
**anunciar ese gap explícitamente** en lugar de silenciarlo.

- El hook muestra "[outdated hasta post-migración]" junto a la opción /workflow_*
- CLAUDE.md mantiene "invocar pm-thyrox" como instrucción primaria (no como workaround)
- El ADR documenta el estado actual vs el estado objetivo con fechas o triggers claros

**Razón:** Ocultar el gap (mostrar solo la opción A, o solo la opción B) produce resultados
peores que hacer la elección explícita. El usuario informado elige mejor que el sistema que
intenta tomar la decisión por él.

**Referencia:** Doc 09, Sección 5 — "Realista vs Idealista": la arquitectura realista reconoce
la brecha entre blueprint y producción como información, no como fracaso.

---

### D-05: Cláusula de revisión PTC en ADR

**Decisión:** El ADR que documente esta arquitectura incluirá explícitamente:

> "Cuando PTC esté disponible en Claude Code, revisar la Capa de Agentes:
> task-executor y task-planner podrán usar PTC internamente para reducir round-trips.
> La capa de /workflow_* commands NO requiere cambio — PTC opera dentro de las fases,
> no entre ellas. pm-thyrox SKILL (catálogo) podría convertirse en un script PTC
> que invoque commands en batch si se identifica un caso de uso real."

---

### D-07: Capa 2 soporta N skills, no solo pm-thyrox

**Decisión:** La arquitectura debe tratar pm-thyrox como una skill más en Capa 2, no como el
orquestador único. Otros skills (security-audit, payment-flow, domain-specific) coexisten
en la misma capa con sus propias responsabilidades.

**Regla de coexistencia:**
- Cada skill escribe solo en sus propios archivos (section owner a nivel de skill)
- pm-thyrox escribe: `now.md` (orchestration decisions) + artefactos de WP
- Skills especializados escriben: `now-{skill-name}-{wp-id}.md` (sus checkpoints propios)
- Git commits serializan las escrituras sin bloquear la ejecución paralela

**Límite recomendado:**
- HOY (SKILL probabilístico): máximo 2 skills simultáneos — más contamina el context window
- Post-migración (/workflow_* determinístico): hasta 3-4 skills con ordering explícito

**Razón:** Doc 09 Extensión — la pregunta "¿qué pasa con las otras skills que muestra el hook?"
revela que la arquitectura debe diseñarse para N skills desde el inicio, no como un caso especial.

---

### D-08: Naming convention para checkpoints multi-skill

**Decisión:** Extender el patrón `now-{agent-id}.md` para incluir el contexto de skill:

| Contexto | Archivo | Escribe | Contiene |
|---------|---------|---------|---------|
| Agente nativo en ejecución | `now-{agent-name}.md` | El agente | Progreso de la tarea (e.g., `now-task-executor.md`) |
| Checkpoint de skill especializado | `now-{skill-name}-{wp-id}.md` | El skill | Estado de evaluación del skill |
| Estado compartido de sesión | `now.md` | pm-thyrox / orquestador | Fase activa, WPs, agentes |

**Ejemplo:**
```
now.md                        ← pm-thyrox: orchestration decisions (estado compartido)
now-task-executor.md          ← task-executor: tarea T-007 en progreso
now-task-planner.md           ← task-planner: descomposición T-008 en progreso
now-security-audit-wp-auth.md ← security-audit skill: evaluación de WP-auth
now-payment-flow-wp-pay.md    ← payment-flow skill: verificación de WP-payment
```

**Patrón:** `now-{agent-name}.md` — donde `agent-name` es el nombre del agente nativo
(e.g., `task-executor`, `task-planner`, `tech-detector`, `Explore`), no un ID numérico.
El nombre del agente es estable y descriptivo; un ID numérico (`agent1`) no indica qué hace.

**PTC-proof:** El patrón de archivos no cambia con PTC. Los agentes seguirán usando `now-{agent-id}.md`
aunque internamente usen PTC para sus tool calls.

---

### D-09: CLAUDE.md incluye guía de orquestación multi-skill

**Decisión:** CLAUDE.md debe incluir una sección de advertencia sobre múltiples skills:

```markdown
## Multi-skill orchestration

- Máximo 2-3 skills simultáneos (context window).
- Antes de lanzar N skills en paralelo: verificar que sus section owners son disjuntos.
- Si un skill necesita el output de otro: lanzarlos en secuencia, no en paralelo.
- Si hay duda sobre conflictos: usar /workflow_* commands para ordenar explícitamente.
```

**Razón:** Sin esta guía, el usuario puede lanzar 5 skills simultáneamente degradando la calidad.
La guía en CLAUDE.md garantiza que siempre esté visible (siempre cargada) — sin depender de que
el usuario recuerde un documento de referencia.

---

## Pre-design check

| Principio | ¿Se respeta? |
|-----------|-------------|
| Determinismo como base | ✓ Hooks (shell) + commands (user-triggered) como capa primaria |
| On-demand para lógica específica | ✓ /workflow_* solo en contexto cuando se usan |
| Separación de responsabilidades | ✓ Una capa = un nivel de triggering |
| PTC-proof | ✓ PTC actúa en capa de agentes — no invalida commands ni hooks |
| Sin duplicación | ✓ Lógica de fase en commands únicamente — SKILL es catálogo |
| Migración gradual | ✓ SKILL puede coexistir durante sincronización de commands |
| Multi-skill support | ✓ Capa 2 diseñada para N skills con section owners disjuntos |
| Coordinación multi-skill | ✓ `now-{skill}-{wp}.md` como checkpoint por skill — sin conflictos |
| Límite explícito | ✓ CLAUDE.md advierte: máx 2-3 skills simultáneos (context budget) |

---

## Arquitectura objetivo

```
CAPA 0 — Hooks (determinístico, siempre)
├─ SessionStart: session-start.sh (muestra qué /workflow_* ejecutar)
└─ Stop: stop-hook-git-check.sh (enforce push)

CAPA 1 — Siempre en contexto
└─ CLAUDE.md (~80 líneas: flujo de sesión, glosario, referencias)
    └─ Sin lógica de fase — solo: "para Phase N, ejecuta /workflow_N"

CAPA 2 — Skills on-demand (N skills, probabilístico)
├─ pm-thyrox SKILL (~40 líneas): catálogo → tabla /workflow_* — SIN lógica de fase
├─ security-audit SKILL: evaluación de seguridad por WP (si aplica)
├─ payment-flow SKILL: lógica de dominio de pagos (si aplica)
└─ [otros domain-specific skills] — cada uno con section owner propio
    Límite: máximo 2-3 simultáneos (context window budget)

CAPA 3 — Lógica de fase on-demand (determinístico)
├─ /workflow_analyze    → Phase 1 completa (actualizada con gates + manifest)
├─ /workflow_strategy   → Phase 2 completa
├─ /workflow_plan       → Phase 3 completa
├─ /workflow_structure  → Phase 4 completa
├─ /workflow_decompose  → Phase 5 completa
├─ /workflow_execute    → Phase 6 completa (con task-notification gate)
└─ /workflow_track      → Phase 7 completa (con cierre de estado)

CAPA 4 — Agentes + coordinación git (determinístico cuando Claude los lanza)
├─ task-executor: ejecuta T-NNN atómicamente
├─ [otros agentes nativos]
├─ Coordinación: now.md (shared) + now-{agent-name}.md + now-{skill-name}-{wp-id}.md
└─ Git commits = barriers de sincronización (serializados, no bloquean ejecución paralela)
├─ task-planner: descompone trabajo
├─ tech-detector: detecta stack
└─ Explore: investiga codebase
    └─ [Cuando llegue PTC: agentes pueden usar PTC internamente — interface no cambia]
```

**El flujo de una sesión en esta arquitectura:**
1. Hook imprime → "WP activo: context-hygiene / Phase 6 → ejecuta /workflow_execute"
2. Usuario escribe `/workflow_execute` → lógica Phase 6 en contexto
3. Claude ejecuta tarea, lanza agents si necesario
4. Al completar → `/workflow_track` cierra el WP

---

## Post-design re-check

| Riesgo identificado en Phase 1 | ¿Mitigado? |
|-------------------------------|-----------|
| R-01: Migración rompe flujo actual | ✓ SKILL y commands coexisten durante migración |
| R-02: workflow_* desactualizados | ✓ Sincronización es tarea explícita del WP |
| R-03: CLAUDE.md sobrecargado | ✓ CLAUDE.md solo tiene referencias + guía multi-skill (~80 líneas) |
| R-04: Sin evaluación empírica | ~ Pendiente — benchmark mínimo en Phase 4 |
| R-05: PTC invalida arquitectura | ✓ D-05 + separación de capas lo previene |
| R-06: Pérdida de contexto cross-fase | ✓ CLAUDE.md tiene referencias cross-phase |
| R-nuevo: N skills degradan context window | ✓ D-09 — límite 2-3 en CLAUDE.md + D-07 section owners disjuntos |
| R-nuevo: Race condition entre skills | ✓ D-08 — `now-{skill}-{wp}.md` por skill, git serializa escrituras |
