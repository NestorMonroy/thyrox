```yml
Fecha: 2026-03-28
Proyecto: THYROX
Tipo: Análisis de referencia (Phase 1: ANALYZE)
Referencia: /tmp/thyrox-references/claude-mlx-tts/
```

# Análisis: claude-mlx-tts — Plugin con documentación por audiencia

## Qué es

Plugin de Claude Code que agrega text-to-speech cuando Claude termina "trabajo profundo." No es un framework de PM — es un **plugin real que usa Claude Code features (commands, hooks, CLAUDE.md) de forma ejemplar.**

---

## Lo relevante para THYROX

### 1. Documentación por audiencia (6 capas)

| Archivo | Audiencia | Qué contiene |
|---------|-----------|-------------|
| README.md | Usuarios | Features, quick start, comandos |
| DEV.md | Developers | Setup local, debugging, iteración |
| CLAUDE.md | Claude Code (AI) | Arquitectura, constraints, gotchas, release process |
| AGENTS.md | Agentes AI | Workflow de issues, checklist de cierre de sesión |
| ARCHITECTURE.md | Contributors | Diagramas de flujo, backends, hooks |
| TROUBLESHOOTING.md | Usuarios con problemas | Issues comunes y soluciones |

**Cada archivo habla a UNA audiencia.** No mezclan.

THYROX mezcla todo: CLAUDE.md habla al AI pero también tiene estructura del proyecto. README habla a humanos pero también tiene metodología. SKILL.md habla al AI pero también tiene convenciones.

### 2. CLAUDE.md como contrato para el AI

claude-mlx-tts usa CLAUDE.md para decirle a Claude:
- Qué NO hacer (no agregar minClaudeVersion a plugin.json)
- Dónde están los archivos clave
- Cómo hacer releases (sync 3 archivos)
- Gotchas específicos del codebase

**No es documentación general** — es instrucciones específicas para que el AI no rompa cosas.

### 3. AGENTS.md como workflow de sesión

AGENTS.md define qué hacer al terminar una sesión:
- Usar Beads (issue tracking AI-native, git-based)
- Checklist de "landing the plane": tests, linters, git push
- Obligatorio, no opcional

**Esto es lo que THYROX intenta hacer con work-logs pero de forma más simple:** un checklist de cierre, no un documento narrativo.

### 4. Commands como archivos Markdown

7 comandos como archivos `.md` con YAML frontmatter:
```yaml
---
allowed-tools: Bash(*)
description: "Install MLX dependencies"
---
```

**Pre-autorización** con `allowed-tools` — el comando ejecuta scripts sin pedir permiso.

### 5. Hooks como enforcement automático

2 tipos de hooks:
- **Stop hook:** Se ejecuta cuando Claude termina de responder
- **PermissionRequest hook:** Se ejecuta cuando Claude pide permiso

Los hooks son **enforcement automático** — no dependen de disciplina humana. Se ejecutan siempre.

### 6. Scripts como implementación determinística

Todos los comandos y hooks delegan a scripts en `scripts/`:
```
comando.md → script.sh → script.py
```

Separación clara: el comando define QUÉ, el script define CÓMO.

---

## Comparación con los 3 proyectos de referencia

| Aspecto | spec-kit | claude-pipe | claude-mlx-tts | THYROX |
|---------|----------|-------------|----------------|--------|
| **Docs pre-código** | 4+ templates | 2 (PRD+BUILD_SPEC) | 6 por audiencia | 8+ subsecciones |
| **CLAUDE.md** | No (usa agents/) | No | Sí (contrato AI) | Sí (pero mezclado) |
| **Commands** | 9 slash commands | No | 7 markdown commands | No tiene |
| **Hooks** | Extension hooks | No | Stop + Permission hooks | No tiene |
| **Enforcement** | Templates + gates | Manual | Hooks automáticos | Templates + gates (no usados) |
| **Work tracking** | Checkboxes en tasks | No | Beads (git-native) | Work-logs (vacíos) |
| **Issue tracking** | GitHub Issues | No | Beads (.beads/) | errors/ (manual) |

---

## Lecciones para THYROX

### Lo que debemos adoptar

1. **Separar CLAUDE.md por audiencia real** — Nuestro CLAUDE.md mezcla instrucciones para AI con estructura para humanos. Debería ser SOLO contrato para el AI.

2. **AGENTS.md como checklist de cierre** — Más simple que work-logs narrativos. Un checklist: ¿tests? ¿linter? ¿push? ¿issues actualizados?

3. **Hooks como enforcement** — No depender de "el SKILL dice que hay que hacer X". Si hay un hook que se ejecuta automáticamente, se hace siempre.

### Lo que no aplica

- Commands como archivos .md — THYROX es un SKILL, no un plugin. Los commands de Claude Code son para tools, no para metodología.
- Beads — Interesante pero agrega dependencia. Nuestro errors/ es más simple.
- Pre-autorización de tools — No aplica para PM.

### La reflexión

claude-mlx-tts tiene **enforcement automático** (hooks se ejecutan siempre). THYROX tiene **enforcement documental** (el SKILL dice qué hacer pero nadie obliga). Esa es la diferencia entre un sistema que funciona y uno que depende de disciplina.

---

**Última actualización:** 2026-03-28
