```yml
type: Solution Strategy
work_package: 2026-04-08-03-51-36-skill-architecture-review
created_at: 2026-04-08 04:15:00
phase: Phase 2 — SOLUTION_STRATEGY
constraint_primario: La arquitectura NO debe invalidarse cuando PTC llegue a Claude Code
```

# Solution Strategy: Revisión Arquitectónica de pm-thyrox SKILL

## Key Idea central

**El insight que cambia todo:** PTC y los /workflow_* commands operan en capas diferentes
y son complementarios, no competidores.

```
PTC orquesta:        TOOL CALLS  (file reads, bash, search — machine-triggered)
/workflow_* orquesta: PHASES     (ANALYZE, PLAN, EXECUTE — human-triggered)
```

Una arquitectura que separa estos dos niveles es PTC-proof por diseño.
Cuando PTC llegue a Claude Code, los agentes pueden usar PTC **internamente dentro de una fase**
mientras las fases siguen siendo comandos determinísticos invocados por el usuario.
El interface no cambia — solo la eficiencia interna de ejecución mejora.

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

**Lógica:**
```bash
# Si hay WP activo con phase: Phase 1 → mostrar: "Ejecutar /workflow_analyze"
# Si phase: Phase 2 → mostrar: "Ejecutar /workflow_strategy"
# Si phase: Phase 6 → mostrar: "Ejecutar /workflow_execute (o próxima tarea T-NNN)"
# Si no hay WP → mostrar: "Empezar con /workflow_analyze para nuevo WP"
```

**Razón:** El hook es determinístico. Si el hook dice directamente qué command ejecutar,
elimina la dependencia de que Claude "recuerde" invocar pm-thyrox y luego derive qué hacer.

**PTC-proof:** El hook seguirá siendo un script shell. PTC no afecta los hooks.

---

### D-05: Cláusula de revisión PTC en ADR

**Decisión:** El ADR que documente esta arquitectura incluirá explícitamente:

> "Cuando PTC esté disponible en Claude Code, revisar la Capa de Agentes:
> task-executor y task-planner podrán usar PTC internamente para reducir round-trips.
> La capa de /workflow_* commands NO requiere cambio — PTC opera dentro de las fases,
> no entre ellas. pm-thyrox SKILL (catálogo) podría convertirse en un script PTC
> que invoque commands en batch si se identifica un caso de uso real."

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

---

## Arquitectura objetivo

```
CAPA 0 — Hooks (determinístico, siempre)
├─ SessionStart: session-start.sh (muestra qué /workflow_* ejecutar)
└─ Stop: stop-hook-git-check.sh (enforce push)

CAPA 1 — Siempre en contexto
└─ CLAUDE.md (~80 líneas: flujo de sesión, glosario, referencias)
    └─ Sin lógica de fase — solo: "para Phase N, ejecuta /workflow_N"

CAPA 2 — Catálogo on-demand (SKILL, ~40 líneas)
└─ pm-thyrox SKILL: descripción + tabla escalabilidad + tabla /workflow_*
    └─ NO contiene lógica de fase

CAPA 3 — Lógica de fase on-demand (determinístico)
├─ /workflow_analyze    → Phase 1 completa (actualizada con gates + manifest)
├─ /workflow_strategy   → Phase 2 completa
├─ /workflow_plan       → Phase 3 completa
├─ /workflow_structure  → Phase 4 completa
├─ /workflow_decompose  → Phase 5 completa
├─ /workflow_execute    → Phase 6 completa (con task-notification gate)
└─ /workflow_track      → Phase 7 completa (con cierre de estado)

CAPA 4 — Agentes (determinístico cuando Claude los lanza)
├─ task-executor: ejecuta T-NNN atómicamente
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
| R-03: CLAUDE.md sobrecargado | ✓ CLAUDE.md solo tiene referencias, no lógica |
| R-04: Sin evaluación empírica | ~ Pendiente — benchmark mínimo en Phase 4 |
| R-05: PTC invalida arquitectura | ✓ D-05 + separación de capas lo previene |
| R-06: Pérdida de contexto cross-fase | ✓ CLAUDE.md tiene referencias cross-phase |
