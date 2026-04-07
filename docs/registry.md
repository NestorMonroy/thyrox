# THYROX Registry — Referencia

El registry (`.claude/registry/`) es la fuente de verdad para los artefactos que THYROX genera automáticamente en un proyecto. Contiene tres tipos de artefactos con propósitos distintos.

---

## Los tres flujos de generación

```
.claude/registry/
│
├── agents/*.yml          → bootstrap.py  → .claude/agents/*.md
│   (comportamiento)                         (agentes spawnables)
│
├── {layer}/*.template.md → _generator.sh → .claude/skills/{layer}-{fw}/SKILL.md
│   (datos/metodología)                      .claude/guidelines/{layer}-{fw}.instructions.md
│
└── mcp/*.py              → .mcp.json     → herramientas MCP en sesión
    (runtime)                                (exec_cmd, memory store/retrieve)
```

---

## Flujo A — Agentes (comportamiento)

Los agentes son subprocesos Claude con herramientas específicas y conocimiento técnico embebido. Define **quién puede ejecutar qué**.

**Fuente:** `agents/*.yml`  
**Generador:** `python .claude/registry/bootstrap.py`  
**Salida:** `.claude/agents/*.md`

### Agentes incluidos

| Agente | Propósito |
|--------|-----------|
| `task-planner` | Descompone trabajo en tareas atómicas T-NNN con IDs trazables |
| `task-executor` | Ejecuta una tarea T-NNN del task-plan activo |
| `tech-detector` | Detecta el stack tecnológico desde archivos de configuración |
| `skill-generator` | Genera SKILL.md + agente desde un YML del registry |
| `nodejs-expert` | Experto en Node.js, Express, testing con Jest |
| `react-expert` | Experto en React, hooks, Vitest/React Testing Library |
| `postgresql-expert` | Experto en PostgreSQL, migrations, SQL avanzado |

### Invocar un agente

```
Agent tool → subagent_type: "task-planner"
```

### Agregar un agente nuevo

1. Crear `agents/{nombre}.yml` con `name`, `description` (≥20 chars), `tools`
2. No incluir `model` (campo prohibido en agentes nativos)
3. Regenerar: `python .claude/registry/bootstrap.py --force`
4. Verificar: `python .claude/skills/pm-thyrox/scripts/lint-agents.py`

---

## Flujo B — Skill Templates (datos/metodología)

Los skill templates son guías SDLC fase-por-fase para trabajar en un stack tecnológico específico. Define **cómo trabajar con X tecnología**.

**Fuente:** `{layer}/{framework}.template.md`  
**Generador:** `.claude/registry/_generator.sh {layer} {framework}`  
**Salida:**
- `.claude/skills/{layer}-{framework}/SKILL.md` — guía fase-por-fase
- `.claude/guidelines/{layer}-{framework}.instructions.md` — reglas siempre-on (carga automática)

### Templates incluidos

| Template | Skill generado |
|----------|---------------|
| `backend/nodejs.template.md` | `backend-nodejs` |
| `frontend/react.template.md` | `frontend-react` |
| `db/postgresql.template.md` | `db-postgresql` |

### Instanciar un skill en un proyecto

```bash
# Generar el skill de Node.js para este proyecto
.claude/registry/_generator.sh backend nodejs

# Ver qué se generaría sin crear archivos
.claude/registry/_generator.sh backend nodejs --dry-run

# Sobreescribir si ya existe
.claude/registry/_generator.sh backend nodejs --force
```

### Formato de un template

Cada template contiene dos secciones con marcadores:

```markdown
<!-- SKILL_START -->
# {{LAYER_TITLE}} {{FRAMEWORK_TITLE}} — SKILL
... guía fase-por-fase con placeholders {{PROJECT_NAME}}, {{FRAMEWORK}} ...
<!-- SKILL_END -->

<!-- INSTRUCTIONS_START -->
# {{LAYER_TITLE}} {{FRAMEWORK_TITLE}} — Guidelines
... reglas siempre-on para Claude, mínimo 5 con ejemplos ...
<!-- INSTRUCTIONS_END -->
```

### Agregar un tech skill nuevo

1. Crear `{layer}/{framework}.template.md` con ambas secciones
2. Incluir los 5 placeholders obligatorios: `{{PROJECT_NAME}}`, `{{LAYER}}`, `{{FRAMEWORK}}`, `{{LAYER_TITLE}}`, `{{FRAMEWORK_TITLE}}`
3. Escribir mínimo 5 reglas con ejemplo bueno + malo en INSTRUCTIONS
4. Testear: `.claude/registry/_generator.sh {layer} {framework} test-project`
5. Commit: `feat(registry): add {layer}-{framework} template`

### Capas válidas

| Capa | Ejemplos |
|------|----------|
| `frontend` | react, vue, nextjs, svelte |
| `backend` | nodejs, python, go, java |
| `db` | postgresql, mysql, mongodb, redis |
| `infra` | docker, kubernetes, terraform |
| `mobile` | reactnative, flutter |
| `testing` | cypress, playwright, jest |

---

## Flujo C — MCP Servers (runtime)

Los servidores MCP son la capa de infraestructura — exponen capacidades de ejecución y memoria a Claude durante la sesión.

**Fuente:** `mcp/*.py`  
**Activación:** Declarados en `.mcp.json` — Claude Code los arranca automáticamente.

### Herramientas expuestas

| Herramienta | Descripción |
|-------------|-------------|
| `mcp__thyrox-executor__exec_cmd` | Ejecuta comandos shell con blocklist de seguridad |
| `mcp__thyrox-executor__exec_python` | Ejecuta código Python en entorno aislado |
| `mcp__thyrox-memory__store` | Guarda texto en memoria FAISS persistente |
| `mcp__thyrox-memory__retrieve` | Búsqueda semántica en memoria FAISS |

### Setup inicial

```bash
pip install -r requirements.txt
```

---

## Separación datos/comportamiento

Inspirado en el diseño de [mise](https://mise.jdx.dev) (gestor de herramientas de desarrollo):

> En mise, el registry TOML son **datos** (qué tools existen), y los backends son **comportamiento** (cómo instalar cada tool). Ambos coexisten pero son separables.

En THYROX:

| Tipo | Naturaleza | Escala añadiendo |
|------|-----------|-----------------|
| `agents/*.yml` | Comportamiento — define quién ejecuta | Nuevos YMLs en `agents/` |
| `*.template.md` | Datos — define qué metodología | Nuevos templates en `{layer}/` |
| `mcp/*.py` | Runtime — infraestructura de capacidades | Nuevos servidores en `mcp/` |

Cada tipo escala de forma independiente sin modificar el core.

---

## Bootstrap completo de un proyecto nuevo

```bash
# 1. Detectar stack del proyecto
Agent tool → tech-detector

# 2. Generar agentes para el stack detectado
python .claude/registry/bootstrap.py --stack nodejs,react,postgresql

# 3. Generar tech skills
.claude/registry/_generator.sh backend nodejs
.claude/registry/_generator.sh frontend react
.claude/registry/_generator.sh db postgresql

# 4. Verificar setup
python .claude/skills/pm-thyrox/scripts/lint-agents.py
```

O usando el comando integrado:

```
/workflow_init
```

---

*Producido con pm-thyrox — WP `2026-04-07-06-30-37-registry-separation`, Phase 4: STRUCTURE.*
