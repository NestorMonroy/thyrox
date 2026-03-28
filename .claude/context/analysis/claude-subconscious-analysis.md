```yml
Fecha: 2026-03-28
Proyecto: THYROX
Tipo: Análisis de referencia (Phase 1: ANALYZE)
Referencia: /tmp/thyrox-references/claude-subconscious/
```

# Análisis: claude-subconscious — Memoria persistente automática via hooks

## Qué es

Plugin de Claude Code que provee **memoria persistente cross-sesión sin intervención manual**. Un segundo agente (Letta) observa cada sesión, lee el codebase, aprende, y susurra guía de vuelta — todo vía hooks automáticos.

---

## El concepto clave: Zero disciplina

| Aspecto | claude-subconscious | THYROX actual |
|---------|-------------------|---------------|
| Persistencia | **Automática** (hooks en session start/stop) | Manual (work-logs que nadie escribe) |
| Aprendizaje | **Del transcript** (parsea lo que Claude hizo) | Del usuario (si escribe algo) |
| Enforcement | **Hooks se ejecutan siempre** | Documental (SKILL dice qué hacer) |
| Disciplina requerida | **ZERO** | Alta (ERR-021, ERR-022) |
| Disk pollution | **Ninguna** (stdout injection) | Sí (archivos en context/) |

---

## Cómo funciona (4 hooks)

```
SessionStart hook (5s)
├── Conecta con Letta, crea/reutiliza conversación
└── Inyecta memory blocks al primer prompt

UserPromptSubmit hook (10s)
├── Fetch memory blocks actualizados
├── Detecta cambios (diffs)
└── Inyecta nuevos mensajes + diffs via stdout

PreToolUse hook (5s)
├── Check ligero: ¿hay updates mid-workflow?
├── Si no → exit silencioso (zero overhead)
└── Si sí → inyecta via additionalContext

Stop hook (120s, async)
├── Parsea transcript JSONL de la sesión
├── Spawns background worker (no bloquea)
├── Worker envía a Letta para procesamiento
└── Letta actualiza memory blocks para próxima sesión
```

### El flujo completo

```
Sesión N:
  Claude trabaja → transcript JSONL se genera
  Stop hook → parsea transcript → envía a Letta (async)
  Letta agent → lee codebase (Read, Grep) → actualiza memory blocks

Sesión N+1:
  SessionStart → conecta con Letta
  UserPromptSubmit → inyecta memory blocks + mensajes nuevos
  Claude recibe contexto de sesión anterior SIN que nadie escribiera nada
```

---

## 8 memory blocks

| Block | Contenido | Equivalente THYROX |
|-------|-----------|-------------------|
| `core_directives` | Rol, guidelines de comportamiento | SKILL.md |
| `guidance` | Guía activa para próxima sesión | focus.md (si existiera) |
| `user_preferences` | Estilo de código aprendido | No existe |
| `project_context` | Conocimiento del codebase | CLAUDE.md (estático) |
| `session_patterns` | Patrones recurrentes | No existe |
| `pending_items` | Trabajo sin terminar, TODOs | ROADMAP.md (manual) |
| `self_improvement` | Evolución del sistema de memoria | No existe |
| `tool_guidelines` | Cómo usar herramientas | references/ |

---

## Subconscious vs Conscious

| Subconscious (automático) | Conscious (manual) |
|--------------------------|-------------------|
| Aprende del transcript sin intervención | Usuario escribe en CLAUDE.md |
| Patrones implícitos (el agente los encuentra) | Directivas explícitas (el usuario las dice) |
| Guía susurrada (no intrusiva) | Contexto explícito (usuario lo ve) |
| Evoluciona con el tiempo | Estático hasta que alguien lo edita |

**Ambas capas coexisten.** El subconscious aprende autónomamente; el usuario puede agregar contexto explícito si quiere.

---

## Lo que esto enseña a THYROX

### 1. La disciplina no escala

THYROX tiene 22 errores documentados. Al menos 5 (ERR-001, ERR-002, ERR-006, ERR-021, ERR-022) son "no seguí el proceso." La solución NO es más documentación — es **hooks que se ejecutan siempre.**

### 2. Memory via transcript parsing > work-logs manuales

claude-subconscious extrae contexto del transcript (lo que Claude hizo). No necesita que nadie escriba un resumen. Si THYROX pudiera parsear el git log + CHANGELOG en vez de requerir work-logs, el problema de ERR-021/ERR-022 desaparece.

### 3. Pre-tool sync para actualizaciones mid-workflow

El PreToolUse hook es brillante: chequea actualizaciones ANTES de que Claude use una herramienta. Si no hay cambios → silencioso. Si hay → inyecta contexto. Zero overhead cuando no se necesita.

### 4. Stdout injection > disk writes

claude-subconscious nunca escribe a CLAUDE.md ni a ningún archivo del proyecto. Todo va por stdout. Esto elimina el problema de "archivos que se acumulan" (18 archivos en analysis/).

---

## Comparación con los 8 proyectos

| Aspecto | spec-kit | claude-pipe | mlx-tts | oh-my-claude | conv-temp | clawpal | Cortex | subconscious | THYROX |
|---------|----------|-------------|---------|-------------|-----------|---------|--------|-------------|--------|
| **Memory** | Checkboxes | No | No | Save/load | 3-tier manual | Plans inmutables | 3-layer + brain-engine | **Auto via Letta** | Work-logs vacíos |
| **Disciplina** | Baja | Zero | Zero | Media | Alta | Baja | Alta | **ZERO** | Alta |
| **Hooks** | No | No | Stop+Perm | Stop+loops | No | No | Manual scribes | **4 hooks auto** | No |
| **Aprendizaje** | No | No | No | No | No | No | No | **Sí (transcripts)** | No |
| **Mid-workflow** | No | No | No | No | No | No | No | **PreToolUse** | No |

---

## La conclusión para THYROX

De los 8 proyectos analizados, claude-subconscious es el que más directamente resuelve los problemas que THYROX tiene con work-logs, disciplina, y persistencia.

**El patrón:** No pedir al usuario que documente → observar lo que hace y aprender de eso.

THYROX no puede implementar hooks de plugin (no es un plugin). Pero puede:
1. **Usar git log como "transcript"** — parsear commits para reconstruir contexto
2. **Usar ROADMAP checkboxes como "pending_items"** — en vez de work-logs
3. **Usar CLAUDE.md como "guidance block"** — actualizado automáticamente al cerrar sesión
4. **Eliminar work-logs manuales** — si el contexto se puede reconstruir de git + ROADMAP + CLAUDE.md

---

**Última actualización:** 2026-03-28
