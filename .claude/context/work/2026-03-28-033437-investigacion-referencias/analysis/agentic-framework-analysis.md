```yml
Fecha: 2026-03-28
Proyecto: THYROX
Tipo: Análisis de referencia profundo (Phase 1: ANALYZE)
Referencia: /tmp/thyrox-references/agentic-framework/
Nota: Este es el proyecto más similar a THYROX de los 10 analizados
```

# Análisis: agentic-framework — El espejo de THYROX

## Qué es

Un framework portátil para gestión de desarrollo asistido por AI. Se instala como `.agentic/` en cualquier repo. Tiene specs, journal con lessons y plans, hooks de enforcement, HUMAN_NEEDED, feedback routing, manifests, y workflows autónomos probados (626 tests, 4 agentes paralelos, 9 PRs sin intervención humana).

**Es lo que THYROX quiere ser cuando crezca.**

---

## Los conceptos que cambian todo

### 1. L-0002: "Instruction bloat kills compliance"

El hallazgo más importante de todo el análisis de 10 proyectos:

> CLAUDE.md creció de 50 → 300 líneas. El protocolo de inicio de sesión dejó de funcionar. Cuando TODO es "MANDATORY", NADA destaca. El presupuesto de atención del LLM se agota.

**Implicación para THYROX:** Nuestro SKILL.md (288 líneas) + CLAUDE.md (~200 líneas) = ~488 líneas que Claude debe procesar. ¿Cuánto realmente cumple? No lo sabemos porque no medimos compliance.

**La regla descubierta:** <100 líneas para instructions primarias. Todo lo demás en references cargadas bajo demanda.

### 2. Tres capas de instrucciones (no mezclar)

```
Layer 1: CONSTITUTION (reglas, principios, patrones obligatorios)
  → CLAUDE.md, conventions.md
  → Cargado SIEMPRE, no negociable, <100 líneas

Layer 2: PLAYBOOKS (guías por tarea, just-in-time)
  → Skills, prompts por rol
  → Cargado cuando se necesita

Layer 3: STATE (documentación viva, audit trail)
  → FEATURES.md, acceptance/, STATUS.md, JOURNAL.md
  → Leído por agentes en puntos de decisión
```

**THYROX mezcla las 3 capas.** SKILL.md tiene reglas (L1) + fases detalladas (L2) + convenciones (L1) + troubleshooting (L2). CLAUDE.md tiene identidad (L1) + estructura (L3) + flujo de sesión (L2).

### 3. HUMAN_NEEDED.md — Handoff explícito AI→humano

```markdown
### HN-0070: Review PR #207
- **Type**: pr-review
- **Added**: 2026-03-27
- **Why human needed**: Requires human judgment
- **Impact**: Blocking: next feature can't start
```

Numerado (HN-NNNN), tipado (pr-review/planning/decision/escalation), con impacto explícito.

**THYROX no tiene esto.** Cuando Claude necesita una decisión humana, lo dice en el chat y se pierde. No hay registro persistente de "qué necesita el humano."

### 4. Lessons (L-NNNN) — Errores como aprendizaje estructurado

```markdown
# L-0002: Instruction bloat breaks compliance
**Date**: 2026-02-XX

## What happened
CLAUDE.md grew from 50→300 lines; protocol stopped triggering.

## Why it happened
When everything is MANDATORY, nothing stands out.

## What to do next time
Keep CLAUDE.md under 100 lines. Test compliance after every change.

## Key insight
LLMs have an effective attention budget — doubling length
destroys compliance, not halves it.
```

**vs THYROX errors/:**
- Nuestros ERR-NNN son descripciones libres del error
- L-NNNN tiene estructura obligatoria: What/Why/Action/Insight
- La sección "What to do next time" es lo que hace útil un lesson — convierte el error en guía futura

### 5. Graduated enforcement (hard vs soft)

| Tipo | Ejemplo | Comportamiento |
|------|---------|---------------|
| **HARD (bloquea)** | WIP.md existe → no commit | Pre-commit rechaza |
| **HARD (bloquea)** | Feature sin spec → no implementar | Gate rechaza |
| **SOFT (advierte)** | Batch >10 archivos | Warning, no bloquea |
| **SOFT (advierte)** | Spec >14 días sin actualizar | Warning, no bloquea |

**THYROX tiene todo como "debería."** Nada bloquea. Las exit conditions dicen "PARAR" pero nada para realmente.

### 6. Token-efficient scripts (no hacer leer archivos completos)

En vez de que Claude lea JOURNAL.md (5KB), ejecuta:
```bash
bash .agentic/lib/tools/journal.sh recent
```
Output: solo las últimas 5 entradas (200 tokens vs 5000).

**THYROX no tiene esto.** Claude lee archivos completos cada vez.

### 7. Workflow autónomo probado (4 agentes, 9 PRs, 0 humanos)

Lo que permitió que funcionara:
1. Acceptance criteria ANTES del código (F-XXXX.md con ACs numerados)
2. Worktree isolation (cada agente en su copia)
3. 16 pre-commit gates (errores detectados mecánicamente)
4. Token-efficient scripts (estado actualizado sin leer archivos)
5. Integration tests (626 tests como safety net)
6. Review agents con checklists (encontraron 3 bugs reales)

**THYROX no tiene ninguno de estos** excepto los scripts de validación.

### 8. Manifests automáticos desde git

```bash
bash .agentic/tools/manifest.sh F-0116
```

Genera automáticamente: qué commits, qué archivos cambiaron, cuántas líneas, separado por tipo (code/tests/docs).

**Para THYROX:** Nuestro git log es el audit trail, pero no está procesado. Un manifest por feature haría el historial navegable.

---

## STATUS.md vs TODO.md vs BACKLOG.json

Tres niveles de tracking, cada uno con propósito claro:

| Archivo | Propósito | Audiencia | Frecuencia de cambio |
|---------|-----------|-----------|---------------------|
| STATUS.md | ¿Qué pasa AHORA? | Inicio de sesión | Cada sesión |
| TODO.md | Inbox de ideas/tareas | Triage periódico | Cuando surgen ideas |
| BACKLOG.json | Cola priorizada (máquina) | Agente buscando trabajo | Cuando se prioriza |

```
BACKLOG.json → item actual → STATUS.md (foco)
TODO.md → triage → FEATURES.md o BACKLOG.json
```

**THYROX tiene:** ROADMAP.md (mezcla STATUS + BACKLOG) + work-logs (vacíos) + project-state.md (desactualizado).

---

## Comparación directa THYROX vs agentic-framework

| Aspecto | agentic-framework | THYROX | Gap |
|---------|-------------------|--------|-----|
| **Instructions** | <100 líneas (L-0002 lesson) | ~488 líneas (SKILL+CLAUDE) | CRÍTICO |
| **Capas** | 3 capas separadas (Constitution/Playbooks/State) | Todo mezclado | ALTO |
| **Lessons** | L-NNNN estructurado (What/Why/Action/Insight) | ERR-NNN libre | MEDIO |
| **Human handoff** | HUMAN_NEEDED.md (HN-NNNN tipado) | Nada | ALTO |
| **Enforcement** | Graduated (hard blocks + soft warns) | Todo soft ("debería") | ALTO |
| **Token efficiency** | Scripts que outputean solo lo relevante | Leer archivos completos | MEDIO |
| **Feedback routing** | FEEDBACK_LOG → bug/feature/ac/unclear | No existe | MEDIO |
| **Plans** | Dialectical review (Critic+Advocate) | Sin review formal | MEDIO |
| **Manifests** | Automáticos desde git | Manual (git log) | BAJO |
| **Autonomous workflow** | Probado (4 agents, 9 PRs, 626 tests) | No | FUTURO |
| **Cross-tool** | Claude, Cursor, Copilot, Codex | Solo Claude Code | FUTURO |

---

## Meta-patrones de los 10 proyectos

Ahora con 10 proyectos analizados, los patrones que se repiten son claros:

### Patrón 1: Instructions cortas, references largas
- agentic-framework: <100 líneas CLAUDE.md (L-0002)
- spec-kit: SKILL.md <500 líneas
- Cortex: L0+L1 <2000 líneas (KPI)
- **Convergencia:** Las instrucciones primarias deben ser CORTAS. Todo lo demás es on-demand.

### Patrón 2: Plans inmutables con fecha
- clawpal: 48 planes con YYYY-MM-DD
- agentic-framework: plans/ con YYYY-MM-DD-name-plan.md
- conv-temp: transcripts inmutables
- **Convergencia:** No editar planes. Crear nuevo archivo si hay cambio.

### Patrón 3: Errors → Lessons → Institutional memory
- agentic-framework: L-NNNN con What/Why/Action/Insight
- THYROX: ERR-NNN (más simple)
- build-ledger: Research "truths"
- **Convergencia:** Los errores deben producir guía futura, no solo registro.

### Patrón 4: Human handoff como artefacto estructurado
- agentic-framework: HUMAN_NEEDED.md (HN-NNNN)
- build-ledger: Tiered authority + voting
- oh-my-claude: Decision gate (switching cost)
- **Convergencia:** Saber cuándo parar y pedir ayuda humana.

### Patrón 5: Enforcement automático > documental
- agentic-framework: 16 pre-commit gates
- claude-mlx-tts: hooks automáticos
- oh-my-claude: Ralph loops + decision gates
- **Convergencia:** Si depende de disciplina, no funciona. Hooks, gates, scripts.

### Patrón 6: Tracking en 3 niveles
- agentic-framework: STATUS / TODO / BACKLOG
- Cortex: focus.md / now.md / todo/
- spec-kit: spec / plan / tasks
- **Convergencia:** Separar "ahora" de "próximo" de "algún día."

### Patrón 7: Todo en UN lugar por feature
- spec-kit: specs/{feature}/
- agentic-framework: .agentic/work/F-XXXX/
- clawpal: docs/plans/YYYY-MM-DD-feature/
- **Convergencia:** No dispersar artefactos de un feature en 5 directorios.

---

## Errores de THYROX confirmados por los 10 proyectos

| Error THYROX | Cuántos proyectos lo confirman | Solución convergente |
|---|---|---|
| Instructions demasiado largas | 3/10 (agentic, spec-kit, Cortex) | <100 líneas primarias |
| Work-logs manuales | 8/10 no los tienen | Trajectory automático o append-only log |
| Archivos dispersos por feature | 4/10 (spec-kit, agentic, clawpal, Cortex) | 1 directorio por feature |
| Sin human handoff mechanism | 2/10 tienen (agentic, build-ledger) | HUMAN_NEEDED.md con HN-NNNN |
| Sin enforcement real | 4/10 tienen (agentic, mlx-tts, oh-my-claude, build-ledger) | Hooks + pre-commit gates |
| Errors sin estructura | 1/10 tiene lessons (agentic) | L-NNNN con What/Why/Action/Insight |
| Sin feedback routing | 1/10 tiene (agentic) | FEEDBACK_LOG → routing |
| Sin token efficiency | 2/10 tienen (agentic, Cortex) | Scripts que outputean solo lo relevante |

---

**Última actualización:** 2026-03-28
