```yml
Fecha: 2026-03-28
Proyecto: THYROX
Tipo: Análisis de referencia (Phase 1: ANALYZE)
Referencia: /tmp/thyrox-references/oh-my-claude/
```

# Análisis: oh-my-claude — Autonomous loops, STV, y decision gates

## Qué es

Plugin de Claude Code que implementa **loops autónomos de desarrollo** (Ralph loops) con multi-agente (Oracle, Explore, Librarian, Reviewer, Orchestrator), sistema save/load cross-sesión, y un plugin STV (Spec-Trace-Verify) para desarrollo documentado.

---

## Conceptos clave

### 1. STV: Spec → Trace → Verify

El concepto más importante del proyecto:

```
Phase 1 SPEC:   QUÉ y CÓMO → docs/{feature}/spec.md
Phase 2 TRACE:  Blueprint + Contract → docs/{feature}/trace.md + RED tests
Phase 3 VERIFY: Implementación + Conformance → GREEN code + trace alignment
```

**4 Invariantes:**
1. **Trace primero** — El documento viene antes que el código
2. **Contract Tests** — Tests en RED derivados del trace
3. **Conformance Gate** — La cadena specs→tests→conformance es obligatoria
4. **Feedback Loop** — Trace y código se mantienen sincronizados

**Vertical Trace (7 secciones mínimas):**
1. API Entry (HTTP method, path, auth)
2. Input (request + validación)
3. Layer Flow (Controller→Service→DB con flechas de transformación)
4. Side Effects (DB INSERT/UPDATE, eventos, cache)
5. Error Paths (validación, auth, conflictos)
6. Output (response schema)
7. Observability (logs, spans, métricas)

**Lo revolucionario: Parameter Transformation Arrows**
```
Request.FieldA → Command.PropertyA → Entity.AttributeA → table.column_a
```

Esto documenta exactamente cómo fluyen los datos desde la request hasta la base de datos. No hay ambigüedad.

### 2. Decision Gate (Switching Cost)

Cuándo decidir autónomamente vs cuándo preguntar al usuario:

| Tier | Líneas a revertir | Acción |
|------|-------------------|--------|
| tiny | ~5 | Autónomo, sin reportar |
| small | ~20 | Autónomo + reportar decisión |
| medium | ~50 | **Preguntar al usuario** |
| large | ~100+ | **Preguntar al usuario** |

**Regla:** "Maximize autonomous judgment. Only ask about things that are hard to change later."

**THYROX no tiene esto.** Claude pregunta todo o decide todo sin criterio explícito.

### 3. Multi-Agent System

5 agentes especializados:

| Agente | Rol | Ejecución | Tools |
|--------|-----|-----------|-------|
| **Oracle** | Advisor estratégico (GPT-5.2) | BLOCKING | Read-only |
| **Reviewer** | Crítico de código (estilo Linus) | BLOCKING | Read-only |
| **Librarian** | Docs externos + GitHub | BACKGROUND | Read-only |
| **Explore** | Codebase interno (Gemini) | BACKGROUND | Read-only |
| **Orchestrator** | Coordinador delegador | AUTÓNOMO | Full tools |

**Principio:** Los consultores (Oracle, Librarian) son READ-ONLY. Solo el Orchestrator ejecuta.

### 4. Save/Load System

```
.claude/omc/tasks/
├── {save-id}/
│   ├── context.md
│   ├── plan.md
│   └── todos.json
└── archives/
    └── {completed}/
```

Persistencia cross-sesión, cross-tool (funciona con Gemini CLI y Codex también).

### 5. Session Logs (claude-and-me plugin)

```
.claude/
├── raw_logs/YYYY-MM-DD/{session_id}.jsonl    ← Backup original
└── chat_logs/YYYY-MM-DD/{session_id}.md      ← Readable, con dedup
```

Logs automáticos vía hook SessionEnd. No manuales.

---

## Comparación con los 4 proyectos de referencia

| Aspecto | spec-kit | claude-pipe | claude-mlx-tts | oh-my-claude | THYROX |
|---------|----------|-------------|----------------|-------------|--------|
| **Metodología** | Specify→Plan→Tasks→Implement | PRD→BUILD_SPEC→Code | N/A (plugin) | STV: Spec→Trace→Verify | 7 fases SDLC |
| **Decision gates** | Constitution gates | No | No | Switching cost tiers | EXIT_CONDITIONS (no usados) |
| **Multi-agent** | No | No | No | 5 agentes especializados | No |
| **Save/load** | No (checkboxes) | Sessions API | No | Save/load cross-sesión | Work-logs (manuales, vacíos) |
| **Session logs** | No | No | Hook automático | Hook automático (claude-and-me) | Manuales (ERR-021) |
| **Enforcement** | Templates | Manual | Hooks | Hooks + loops autónomos | Documental (no funciona) |

---

## Lecciones para THYROX

### Adoptar

1. **Decision Gate por switching cost** — No preguntar todo. Criterio explícito: ¿cuántas líneas para revertir?

2. **Trace antes que código** — El concepto de "vertical trace" con parameter transformation arrows es más preciso que un "plan" genérico.

3. **Session logs automáticos** — claude-and-me resuelve ERR-021 (work-logs vacíos) con un hook SessionEnd. No depende de disciplina.

4. **Save/load para persistencia** — Más útil que work-logs narrativos. Guardar estado actual, restaurar después.

### Evaluar

5. **Multi-agent system** — Oracle/Librarian/Explore son poderosos pero complejos. ¿THYROX los necesita?

6. **Ralph loops** (deepwork/ultrawork) — Loops autónomos con review gates. Interesante pero requiere MCP servers.

### No adoptar ahora

7. **MCP servers para multi-modelo** — Overhead de infraestructura alto.
8. **claude-and-me plugin** — Requiere hooks de SessionEnd que THYROX no tiene como plugin.

---

## La reflexión central

oh-my-claude demuestra que **los conceptos de spec-kit pueden implementarse como enforcement automático:**

- spec-kit tiene constitution → oh-my-claude tiene decision-gate (más práctico)
- spec-kit tiene checklists → oh-my-claude tiene Reviewer agent (automático)
- spec-kit tiene tasks checkboxes → oh-my-claude tiene save/load (cross-sesión)
- spec-kit no tiene logs → oh-my-claude tiene claude-and-me hooks (automático)

**La diferencia:** spec-kit es framework documental. oh-my-claude es framework ejecutable.

THYROX está más cerca de spec-kit (documental) pero debería moverse hacia enforcement ejecutable como oh-my-claude.

---

**Última actualización:** 2026-03-28
