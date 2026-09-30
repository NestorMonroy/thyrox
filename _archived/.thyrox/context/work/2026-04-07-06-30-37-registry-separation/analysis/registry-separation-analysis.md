```yml
type: Análisis de Fase 1
work_package: 2026-04-07-06-30-37-registry-separation
created_at: 2026-04-07 06:30:37
status: En progreso
phase: Phase 1 — ANALYZE
```

# Análisis: registry-separation

## Objetivo

Separar físicamente los dos tipos de artefactos en `.claude/registry/` para que el propósito de cada uno sea evidente por estructura, y documentar el diseño resultante en `/docs`.

## Contexto

Después de la unificación de FASE 15, `.claude/registry/` contiene dos tipos de artefactos con propósitos fundamentalmente distintos que comparten el mismo directorio raíz:

```
.claude/registry/
├── agents/          ← Definiciones de agentes spawnables (el "quién")
│   ├── task-planner.yml
│   ├── task-executor.yml
│   ├── tech-detector.yml
│   ├── skill-generator.yml
│   ├── nodejs-expert.yml
│   ├── react-expert.yml
│   └── postgresql-expert.yml
├── backend/         ← Templates de tech skills (el "cómo")
│   └── nodejs.template.md
├── frontend/
│   └── react.template.md
├── db/
│   └── postgresql.template.md
├── mcp/             ← Servidores MCP (infraestructura de runtime)
│   ├── executor_server.py
│   ├── memory_server.py
│   └── thyrox_core.py
├── _generator.sh    ← Instancia templates → .claude/skills/
├── bootstrap.py     ← Genera .claude/agents/*.md desde YMLs
└── README.md        ← Describe solo tech skill templates
```

## Problema identificado

### GAP-1: README.md describe solo la mitad del registry

El README actual describe únicamente el rol de los `*.template.md` y `_generator.sh`. No menciona `agents/`, `bootstrap.py`, ni `mcp/`. Alguien que lee el README no sabe qué hace `bootstrap.py` ni por qué existen los YMLs.

### GAP-2: Conceptos mezclados sin separación visual

Un developer que llega al registry ve:
- `agents/task-planner.yml` — define un agente
- `backend/nodejs.template.md` — define una metodología tech
- `mcp/memory_server.py` — define infraestructura de runtime

Tres conceptos distintos sin separación física ni naming que los distinga.

### GAP-3: `mcp/` no tiene documentación propia

Los servidores MCP son la capa de runtime de THYROX. No tienen README, no está documentado cómo arrancar, cómo extender, ni qué hace cada servidor.

### GAP-4: Sin documentación pública en `/docs`

La arquitectura del registry — cómo funciona, cómo extenderlo, la distinción entre sus partes — no existe en `/docs`. Solo existe el README interno del registry (que documenta solo templates).

## Análisis de los dos flujos de generación

### Flujo A: Agents → `bootstrap.py`

```
.claude/registry/agents/*.yml
        ↓ bootstrap.py --stack [techs]
.claude/agents/*.md
        ↓ Claude Code lo registra
Agent tool → subprocesp con tools específicos
```

**Propósito:** Define "quién puede ejecutar qué". Agentes con conocimiento embebido y tools limitadas.

**Operación:** `python .claude/registry/bootstrap.py --stack nodejs,react`

### Flujo B: Templates → `_generator.sh`

```
.claude/registry/{layer}/{framework}.template.md
        ↓ _generator.sh {layer} {framework}
.claude/skills/{layer}-{framework}/SKILL.md
.claude/guidelines/{layer}-{framework}.instructions.md
        ↓ Skill tool / .instructions.md auto-load
Guía metodológica fase-por-fase
```

**Propósito:** Define "cómo trabajar en X stack". Metodología SDLC adaptada a cada tecnología.

**Operación:** `.claude/registry/_generator.sh backend nodejs`

### Flujo C: MCP → `.mcp.json`

```
.claude/registry/mcp/memory_server.py
.claude/registry/mcp/executor_server.py
        ↓ .mcp.json (paths declarados)
        ↓ Claude Code arranca los servidores
mcp__thyrox-executor__exec_cmd, mcp__thyrox-memory__store
```

**Propósito:** Runtime capabilities — ejecución de comandos y memoria persistente.

## Decisión de diseño: ¿separar en subdirectorios o mantener flat?

### Opción A: Subdirectorios explícitos

```
.claude/registry/
├── agents/          (sin cambio)
├── skills/          ← renombrar backend/ + frontend/ + db/ bajo un paraguas
│   ├── backend/
│   ├── frontend/
│   └── db/
├── mcp/             (sin cambio)
├── bootstrap.py
├── _generator.sh
└── README.md
```

**Pro:** Estructura jerárquica clara. `skills/` agrupa todos los templates.
**Contra:** Un nivel extra de anidamiento. Rompe paths existentes.

### Opción B: Separación por README + documentación (sin mover archivos)

Mantener estructura actual pero:
- Reescribir README.md para documentar los 3 flujos
- Agregar documentación en `/docs`
- Separación semántica, no física

**Pro:** Zero breaking changes en paths de `.mcp.json`, `bootstrap.py`.
**Contra:** La separación no es visible en el árbol de directorios.

### Opción C: Separación física solo de `agents/` (ya existe)

La separación `agents/` vs `{layer}/` ya es visible. El problema principal es que el README no lo documenta y `/docs` no existe.

**Pro:** Ya está implementado. El árbol ya comunica la separación.
**Contra:** No está documentado.

## Evaluación

La separación física YA existe — `agents/` contiene agentes, `backend/frontend/db/` contienen templates. Lo que falta es **documentación**: el README no describe el modelo completo y `/docs` no tiene nada.

**Decisión propuesta:** Opción C ampliada — mejorar documentación sin mover archivos:
1. Reescribir `.claude/registry/README.md` para los 3 flujos
2. Crear `docs/registry.md` — referencia pública de arquitectura del registry
3. Actualizar el README de `agents/` si no existe

## Criterios de éxito

- Un developer nuevo puede entender en <5 min la diferencia entre `agents/` y `backend/` solo leyendo el README
- `/docs` tiene documentación de referencia del registry con los 3 flujos
- Cada subdirectorio del registry tiene su propio README breve
- Links cruzados: `docs/registry.md` ↔ `.claude/registry/README.md`

## Fuera de alcance

- Renombrar o mover archivos existentes (breakaria paths)
- Agregar nuevos templates o agentes
- Cambiar bootstrap.py o _generator.sh
