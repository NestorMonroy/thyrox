# Platform Evolution Tracking — Claude Code

> On-demand reference. No cargado automáticamente.
> Propósito: detectar cambios de plataforma que afecten componentes THYROX.
> Proceso: verificar al inicio de una ÉPICA si hay cambios relevantes.

## Componentes THYROX con dependencia directa de plataforma

| Componente | Versión verificada | Comportamiento esperado | Cómo detectar cambio |
|------------|-------------------|------------------------|----------------------|
| `@imports` en CLAUDE.md | Claude Code ~1.x | Carga archivos referenciados con ruta relativa al repo | Si una guideline no aplica → revisar sección Memory del changelog |
| Hooks API (`settings.json`) | Claude Code ~1.x | `PreToolUse`, `PostToolUse`, `Stop`, `SessionStart` | Si hook no dispara → verificar `hookEventName` en settings |
| Agent frontmatter | Claude Code ~1.x | `name`, `description`, `tools`, `model`, `async_suitable` | Si agente no auto-invoca → revisar formato en docs oficiales |
| Slash commands | Claude Code ~1.x | Archivos en `.claude/commands/` sin frontmatter | Si comando no disponible → verificar plugin.json |

## Proceso de verificación

Al inicio de una ÉPICA nueva, verificar (máximo 10 min):
1. Leer changelog de Claude Code por releases desde la última ÉPICA
2. Para cada componente en tabla → confirmar que comportamiento esperado sigue vigente
3. Si hay cambio → crear TD-NNN en technical-debt.md

## Historial de cambios detectados

| ÉPICA | Componente | Cambio detectado | Acción tomada |
|-------|-----------|-----------------|---------------|
| 42 | `@imports` | TD-040: duda sobre carga de rutas fuera de `.claude/` | T-001 PASS — mecanismo confirmado funcional |
