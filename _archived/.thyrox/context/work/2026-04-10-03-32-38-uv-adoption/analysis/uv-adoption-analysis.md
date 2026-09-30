```yml
type: Análisis
created_at: 2026-04-10 03:32:38
project: thyrox-framework
feature: uv-adoption
fase: FASE 30
phase: Phase 1 — ANALYZE
```

# Análisis: Adopción de uv en el ecosistema THYROX

---

## Contexto del usuario final

**Rol:** Mantenedor del framework THYROX (Claude Code).
**Objetivo:** Adoptar uv como gestor de dependencias y ejecutor de scripts Python en todo el ecosistema THYROX — reemplazando el uso directo de `python3` y `pip` sin aislamiento.
**Motivación:** Automatización es el tipo de trabajo Python predominante. uv ya está instalado (v0.8.17).
**Restricciones:** Sin romper los MCP servers activos ni el flujo de hooks de Claude Code.

---

## 1. Objetivo / Por qué

THYROX usa Python en 3 contextos hoy:
- **Scripts de automatización** (9 scripts `.py` en `.claude/scripts/` y `.claude/skills/thyrox/scripts/`)
- **MCP servers** (2 servidores — memory + executor — con dependencias pesadas: faiss-cpu, sentence-transformers)
- **Bootstrap installer** (`registry/bootstrap.py`)

Problema actual:
- Ningún script declara sus dependencias — dependen del entorno Python del sistema
- Los MCP servers se invocan con `python server.py` sin entorno aislado
- `requirements.txt` usa rangos abiertos (`>=`) sin lockfile → no reproducible
- Si el sistema Python cambia, todo se rompe silenciosamente

uv resuelve esto con:
1. Entornos aislados on-demand por script
2. Dependencias declaradas inline en el script (PEP 723)
3. Lockfile (`uv.lock`) para reproducibilidad exacta
4. Gestión de versiones Python sin depender del sistema

---

## 2. Stakeholders

| Stakeholder | Rol | Necesidad |
|-------------|-----|-----------|
| Mantenedor THYROX | Desarrollador / usuario único | Scripts que "simplemente funcionen" sin gestión manual de envs |
| Claude Code (agent) | Consumidor de scripts vía hooks | Ejecución determinista; no puede resolver entornos manualmente |
| MCP servers (runtime) | Proceso Python de larga duración | Aislamiento de dependencias; no contaminar el sistema Python |

---

## 3. Uso operacional — cómo se usa Python en THYROX hoy

### Grupo A — Scripts de automatización (`.claude/scripts/`)

| Script | Propósito | Deps actuales |
|--------|-----------|---------------|
| `detect_broken_references.py` | Detecta referencias rotas en markdown | ninguna (stdlib) |
| `validate-broken-references.py` | Valida referencias | ninguna (stdlib) |
| `convert-broken-references.py` | Corrige referencias | ninguna (stdlib) |
| `lint-agents.py` | Valida formato de agentes nativos | ninguna (stdlib) |

### Grupo B — Script de migración (`.claude/skills/thyrox/scripts/`)

| Script | Propósito | Deps actuales |
|--------|-----------|---------------|
| `migrate-metadata-keys.py` | Migra keys YAML en artefactos | ninguna (stdlib) |

### Grupo C — Bootstrap (`.claude/registry/`)

| Script | Propósito | Deps actuales |
|--------|-----------|---------------|
| `bootstrap.py` | Instala agentes + MCP en proyectos nuevos | `pyyaml` (asumido), stdlib |

### Grupo D — MCP servers (`.claude/registry/mcp/`)

| Servidor | Propósito | Deps actuales |
|----------|-----------|---------------|
| `memory_server.py` | Memoria semántica FAISS | faiss-cpu, sentence-transformers, mcp, pydantic, numpy |
| `executor_server.py` | Ejecución subprocess controlada | mcp, pydantic |
| `thyrox_core.py` | Utilidades comunes | compartidas con servers |

### Invocación actual

```json
// .mcp.json — sin aislamiento
{ "command": "python", "args": [".claude/registry/mcp/memory_server.py"] }
{ "command": "python", "args": [".claude/registry/mcp/executor_server.py"] }
```

---

## 4. Casos de Uso — TODOS los identificados

### UC-001: `uv run` para scripts sin dependencias (Grupo A + B)

**Descripción:** Ejecutar scripts de automatización con `uv run` en lugar de `python3`.

**Antes:**
```bash
python3 .claude/scripts/detect_broken_references.py
python3 .claude/scripts/lint-agents.py
```

**Después:**
```bash
uv run .claude/scripts/detect_broken_references.py
uv run .claude/scripts/lint-agents.py
```

**Beneficio:** Aislamiento on-demand. Si el script en el futuro añade deps, solo se agrega el `# /// script` block — no requiere cambios en cómo se invoca.

**Impacto en THYROX:** Bajo — cambiar shebangs y referencias en hooks.

---

### UC-002: Inline script metadata (PEP 723) en scripts con dependencias (Grupo C)

**Descripción:** Declarar dependencias directamente en el script con el bloque `# /// script`.

**Antes (bootstrap.py):**
```python
#!/usr/bin/env python3
# Asume que pyyaml está instalado en el sistema
import yaml
```

**Después:**
```python
#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pyyaml>=6"]
# ///
import yaml
```

**Beneficio:** El script es autónomo — sus deps van con él. No requiere `pip install` previo.

**Impacto en THYROX:** Medio — requiere revisar qué importa cada script y declararlas.

---

### UC-003: MCP servers con entorno aislado (Grupo D — caso más crítico)

**Descripción:** Reemplazar `python memory_server.py` por `uv run memory_server.py` con dependencias declaradas inline, o con `pyproject.toml`.

**Antes (`.mcp.json`):**
```json
{ "command": "python", "args": [".claude/registry/mcp/memory_server.py"] }
```
Requiere que `faiss-cpu`, `sentence-transformers`, etc. estén instalados en el sistema.

**Después — opción A (inline metadata):**
```python
# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "faiss-cpu>=1.7.4",
#   "sentence-transformers>=2.7.0",
#   "mcp>=1.0.0",
#   "pydantic>=2.0.0",
#   "numpy>=1.24.0",
# ]
# ///
```
```json
{ "command": "uv", "args": ["run", ".claude/registry/mcp/memory_server.py"] }
```

**Después — opción B (pyproject.toml en subdirectorio):**
Crear `.claude/registry/pyproject.toml` con deps declaradas.
```json
{ "command": "uv", "args": ["run", "--project", ".claude/registry", "mcp/memory_server.py"] }
```

**Beneficio:** MCP servers arrancan en entorno reproducible sin `pip install` manual. Crítico para portabilidad cuando THYROX se usa en una máquina nueva.

**Impacto en THYROX:** Alto — es el cambio más impactante y más valioso.

---

### UC-004: Reemplazar `requirements.txt` con `pyproject.toml` + `uv lock`

**Descripción:** Migrar `requirements.txt` a `pyproject.toml` con deps declaradas. Usar `uv lock` para generar `uv.lock` con versiones exactas.

**Antes:**
```
faiss-cpu>=1.7.4
sentence-transformers>=2.7.0
```

**Después:**
```toml
[project]
name = "thyrox"
requires-python = ">=3.11"
dependencies = [
    "faiss-cpu>=1.7.4",
    "sentence-transformers>=2.7.0",
    "mcp>=1.0.0",
    "pydantic>=2.0.0",
    "numpy>=1.24.0",
]
```
```bash
uv lock  # genera uv.lock con versiones exactas
uv sync  # instala el entorno reproducible
```

**Beneficio:** Reproducibilidad exacta de deps. `uv.lock` va a git → mismas versiones en toda máquina.

**Impacto en THYROX:** Medio-alto — requiere crear `pyproject.toml` y commitear `uv.lock`.

---

### UC-005: Lockfile por script (`uv lock --script`)

**Descripción:** Para scripts críticos que necesitan versiones exactas, crear `script.py.lock` adjunto.

```bash
uv lock --script .claude/registry/mcp/memory_server.py
# genera: memory_server.py.lock
```

**Beneficio:** Reproducibilidad exacta para el script individualmente, sin necesitar un proyecto completo.

**Impacto en THYROX:** Bajo — solo para scripts críticos (MCP servers).

---

### UC-006: Shebang ejecutable para scripts en PATH

**Descripción:** Convertir scripts de uso frecuente en ejecutables directos con shebang `uv run`.

**Antes:**
```bash
python3 .claude/scripts/lint-agents.py
```

**Después:**
```python
#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# ///
```
```bash
chmod +x .claude/scripts/lint-agents.py
.claude/scripts/lint-agents.py  # ejecutable directo
```

**Beneficio:** Scripts invocables directamente sin prefijo `python3`. Más limpio en hooks de Claude Code.

**Impacto en THYROX:** Bajo — solo cambio de shebang + chmod.

---

### UC-007: Gestión de versión Python (`uv python`)

**Descripción:** Fijar la versión Python del proyecto para evitar dependencia del sistema.

```bash
uv python install 3.11   # instala Python 3.11 via uv
uv python pin 3.11       # crea .python-version en el repo
```

**Beneficio:** THYROX siempre usa Python 3.11 aunque el sistema tenga otra versión. `.python-version` va a git.

**Impacto en THYROX:** Bajo — un archivo más en el repo, gran mejora en portabilidad.

---

### UC-008: Ejecutar scripts con Python específico (`uv run --python`)

**Descripción:** Usar una versión Python concreta para scripts de testing o compatibilidad.

```bash
uv run --python 3.12 .claude/scripts/lint-agents.py
uv run --python 3.10 bootstrap.py  # verificar compatibilidad backwards
```

**Beneficio:** Verificar que THYROX funciona en múltiples versiones Python sin instalar manualmente.

**Impacto en THYROX:** Ninguno en producción — solo para testing.

---

### UC-009: Herramientas Python sin instalar (`uvx`)

**Descripción:** Ejecutar linters, formatters y herramientas Python de manera temporal sin añadirlos a las deps del proyecto.

```bash
uvx ruff check .claude/scripts/         # lint Python sin instalar ruff
uvx mypy .claude/registry/mcp/          # type check MCP servers
uvx black .claude/scripts/*.py          # format scripts
uvx pytest .claude/skills/thyrox/scripts/tests/  # si se añaden tests Python
```

**Beneficio:** Cero contaminación del entorno del proyecto. Cada herramienta corre en su propio env temporal.

**Impacto en THYROX:** Ninguno — solo mejora el DX del mantenedor.

---

### UC-010: `exclude-newer` para reproducibilidad temporal en automation

**Descripción:** Fijar una fecha límite en scripts de automatización críticos para que uv no use packages publicados después de esa fecha.

```python
# /// script
# dependencies = ["requests>=2.28"]
# [tool.uv]
# exclude-newer = "2026-01-01T00:00:00Z"
# ///
```

**Beneficio:** Scripts de automatización producen exactamente el mismo resultado a lo largo del tiempo, independientemente de nuevas releases de paquetes.

**Impacto en THYROX:** Bajo — solo para scripts de infra crítica donde la reproducibilidad importa más que tener la última versión.

---

### UC-011: Skill `uv` para proyectos THYROX-bootstrapped

**Descripción:** Crear un tech skill `uv` en THYROX (similar a `python-mcp`, `backend-nodejs`, etc.) que configure automáticamente uv en proyectos nuevos al ejecutar `/workflow_init`.

**Contenido del skill:**
- Cómo inicializar `pyproject.toml` con uv
- Template de inline script metadata
- Cómo modificar `.mcp.json` para usar `uv run`
- Cómo declarar deps para scripts nuevos

**Beneficio:** Cualquier proyecto que adopte THYROX puede configurar uv con un solo comando.

**Impacto en THYROX:** Alto — es el caso de uso más estratégico. Multiplica el valor de todos los UC anteriores a todos los usuarios de THYROX.

---

## 5. Atributos de calidad

| Atributo | Importancia | Cómo uv lo aborda |
|----------|-------------|------------------|
| **Reproducibilidad** | Crítica | `uv.lock` + `exclude-newer` = mismo resultado en toda máquina y momento |
| **Portabilidad** | Alta | `uv run script.py` funciona en cualquier máquina con uv — sin `pip install` previo |
| **Velocidad** | Alta | uv es 10-100x más rápido que pip; MCP servers arrancan más rápido |
| **Aislamiento** | Alta | Cada script/server tiene su propio entorno — no contamina sistema Python |
| **Simplicidad operacional** | Alta | El mantenedor no gestiona envs manualmente; Claude Code tampoco |

---

## 6. Restricciones

| Restricción | Impacto |
|-------------|---------|
| MCP servers deben seguir arrancando correctamente | Los cambios en `.mcp.json` se validan antes de commitear |
| Hooks de Claude Code usan `bash` → invocaciones Python deben mantenerse compatibles | `uv run script.py` es drop-in para `python3 script.py` |
| uv ya instalado (v0.8.17) | Sin fricción de instalación |
| Sistema usa Python 3.11 | uv puede gestionar esto sin conflictos |

---

## 7. Fuera de alcance

- Migrar los scripts Bash (`.sh`) — no son Python
- Crear tests Python para los scripts existentes
- Publicar THYROX como paquete en PyPI
- Uso de uv workspaces (no hay múltiples sub-proyectos Python)

---

## 8. Criterios de éxito

| Criterio | Verificación |
|----------|-------------|
| MCP servers arrancan con `uv run` sin `pip install` previo | `uv run memory_server.py` en máquina limpia |
| Scripts de automatización funcionan con `uv run` | `uv run lint-agents.py` retorna mismo resultado |
| `uv.lock` comiteado en el repo | `git log --oneline` muestra commit del lockfile |
| Skill `uv` disponible en `/workflow_init` | `ls .claude/skills/uv/` |
| `requirements.txt` eliminado o deprecado | Solo existe para retrocompatibilidad con nota |

---

## Resumen de casos de uso por prioridad

| Prioridad | UC | Descripción | Esfuerzo |
|-----------|-----|-------------|---------|
| P1 — Crítico | UC-003 | MCP servers con entorno aislado | Alto |
| P1 — Crítico | UC-004 | `pyproject.toml` + `uv lock` | Medio-alto |
| P2 — Alto | UC-001 | `uv run` para scripts sin deps | Bajo |
| P2 — Alto | UC-002 | Inline metadata para scripts con deps | Medio |
| P2 — Alto | UC-011 | Skill `uv` para proyectos bootstrapped | Alto |
| P3 — Medio | UC-007 | Fijar versión Python | Bajo |
| P3 — Medio | UC-006 | Shebang ejecutable | Bajo |
| P3 — Medio | UC-009 | `uvx` para herramientas temporales | Bajo |
| P4 — Bajo | UC-005 | Lockfile por script | Bajo |
| P4 — Bajo | UC-008 | `uv run --python` para testing | Bajo |
| P4 — Bajo | UC-010 | `exclude-newer` reproducibilidad | Bajo |

---

## Stopping Point Manifest

| ID | Fase | Tipo | Evento | Acción requerida |
|----|------|------|--------|-----------------|
| SP-01 | Phase 1 → 2 | gate-fase | Análisis presentado | Usuario aprueba hallazgos y prioridades |
| SP-02 | Phase 2 → 3 | gate-fase | Strategy completa | Usuario aprueba decisiones: opción A vs B para MCP, scope del skill uv |
| SP-04 | Phase 4 → 5 | gate-fase | Spec completa | Usuario aprueba spec antes de descomponer tareas |
| SP-05 | Phase 5 → 6 | gate-fase | Task plan listo | GATE OPERACION antes de modificar `.mcp.json` y `requirements.txt` |
| SP-06 | Phase 6 → 7 | gate-fase | Implementación completa | Confirmar que MCP servers arrancan correctamente |
