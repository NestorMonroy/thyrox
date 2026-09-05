```yml
created_at: 2026-04-16 17:26:51
project: THYROX
work_package: 2026-04-15-08-29-58-plugin-distribution
phase: Phase 12 — STANDARDIZE
author: NestorMonroy
status: Borrador
patterns_count: 3
```

# Patterns: plugin-distribution

## PAT-001: Guard de idempotencia con directorio como semáforo

**Contexto**: Scripts de bootstrap que se ejecutan en cada sesión (SessionStart hook, init scripts).

**Problema**: Un hook que corre en cada sesión sobreescribe estado si no verifica si ya inicializó.

**Solución**:

```bash
# Al inicio del script — salida inmediata si ya existe el marcador
if [ -d ".thyrox/context" ]; then
    log "Ya inicializado. Nada que hacer."
    exit 0
fi
# ... resto del script solo corre la primera vez
```

**Consecuencias**:
- ✓ Simple, legible, sin estado adicional
- ✓ El directorio creado por el script sirve como su propio semáforo
- ✓ Seguro ante reinicios, fallos parciales y ejecuciones concurrentes
- ✗ No detecta inicializaciones parciales (si el script falló a mitad)

**Cuándo NO aplicar**: cuando se necesita detectar y reparar estado corrupto — usar un archivo de versión explícito en su lugar.

**Origen**: WP `plugin-distribution`, 2026-04-16

---

## PAT-002: Separación "plugin provee / proyecto recibe"

**Contexto**: Herramientas distribuidas como plugins de Claude Code que necesitan crear estado en el proyecto destino.

**Problema**: Mezclar el código del plugin (skills, agents, scripts) con el estado del proyecto destino genera acoplamiento — actualizaciones del plugin rompen el estado del proyecto.

**Solución**:

```
Plugin (versionado, actualizable):
  skills/thyrox/, workflow-*/  ← lógica del framework
  agents/                       ← agentes reutilizables
  bin/thyrox-init.sh            ← script de bootstrap

Proyecto destino (propiedad del usuario):
  .thyrox/context/              ← estado del proyecto
  .claude/settings.json         ← permisos del proyecto
  ROADMAP.md, CHANGELOG.md      ← artefactos del proyecto
```

**Consecuencias**:
- ✓ `claude plugin update thyrox` actualiza skills sin tocar estado del proyecto
- ✓ El usuario controla su propio estado
- ✗ El usuario necesita correr init al instalar (no completamente transparente)

**Cuándo NO aplicar**: herramientas con estado global compartido entre proyectos (usar `$CLAUDE_PLUGIN_DATA` en ese caso).

**Origen**: WP `plugin-distribution`, 2026-04-16

---

## PAT-003: Logging prefijado por script

**Contexto**: Múltiples hooks activos en la misma sesión de Claude Code.

**Problema**: Con SessionStart, Stop, PostCompact activos simultáneamente, el output del hook es difícil de rastrear.

**Solución**:

```bash
log() { echo "[nombre-script] $*"; }

log "Inicializando estructura THYROX en $(pwd)..."
log "Creado: .thyrox/context/"
log "Inicialización completa."
```

**Consecuencias**:
- ✓ Identificación inmediata del script fuente en la salida
- ✓ Cero overhead — solo una función bash
- ✗ Requiere disciplina en todos los scripts del framework

**Origen**: WP `plugin-distribution`, 2026-04-16

---

## Decisiones convertidas en estándar

| Decisión | Patrón | Aplica a |
|----------|--------|---------|
| Scripts de hook usan guard de directorio | PAT-001 | `bin/`, `scripts/` del plugin |
| Plugin no escribe estado del proyecto en tiempo de desarrollo | PAT-002 | Cualquier skill futuro que requiera bootstrap |
| Todos los scripts de hook usan `log()` prefijado | PAT-003 | `.claude/scripts/`, `bin/` |
