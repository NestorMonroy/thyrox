# Registry Design — Decisión Arquitectónica

**Estado:** Aprobado  
**Fecha:** 2026-04-07  
**WP:** `2026-04-07-06-30-37-registry-separation`  
**ADR interno:** `.claude/context/decisions/adr-015.md`

---

## Contexto

THYROX necesita una ubicación única para los artefactos que se generan automáticamente al configurar el framework en un proyecto. Existen tres tipos de artefactos con propósitos fundamentalmente distintos:

1. **Agentes spawnables** — subprocesos Claude con herramientas y conocimiento técnico embebido
2. **Templates de metodología** — guías SDLC fase-por-fase por stack tecnológico
3. **Servidores de runtime** — infraestructura MCP que expone capacidades de ejecución/memoria

El riesgo principal es que la mezcla de estos tres tipos en un directorio plano haga difícil entender el propósito del registry sin leer cada archivo individualmente.

---

## Decisión

Unificar todos los artefactos en `.claude/registry/` con **separación física por subdirectorio**:

```
.claude/registry/
├── agents/          ← comportamiento (YMLs de agentes)
├── {layer}/         ← datos (templates de metodología)
└── mcp/             ← runtime (servidores MCP)
```

La separación es **semántica primero, física segundo** — los subdirectorios ya comunican el propósito antes de leer un solo archivo.

---

## Alternativas consideradas

### Alternativa A: Directorio plano con naming convention

```
.claude/registry/
├── agent.task-planner.yml
├── agent.nodejs-expert.yml
├── skill.backend-nodejs.template.md
├── mcp.executor_server.py
```

**Rechazada:** El prefijo en el nombre es frágil y no escala. El directorio como namespace es más explícito y está alineado con convenciones Unix.

### Alternativa B: Tres registries separados

```
.claude/agents-registry/
.claude/skills-registry/
.claude/mcp-registry/
```

**Rechazada:** Tres directorios en `.claude/` aumentan el ruido. Un registry unificado con subdirectorios mantiene la cohesión conceptual.

### Alternativa C: Registry raíz (`registry/`) separado de `.claude/`

Fue la estructura inicial de THYROX (FASE 11). En FASE 15 se unificó en `.claude/registry/` por:
- THYROX es un meta-framework replicable — todo lo operacional vive en `.claude/`
- Separar `registry/` del resto de `.claude/` crea dos ubicaciones para buscar configuración

---

## Inspiración: mise

El diseño está inspirado en [mise](https://mise.jdx.dev), un gestor de herramientas de desarrollo:

> mise separa explícitamente **datos** (registry TOML — uno por tool) de **comportamiento** (backends — implementaciones Rust que saben cómo instalar).

Mapeando a THYROX:

| mise | THYROX | Naturaleza |
|------|--------|-----------|
| `registry/*.toml` | `{layer}/*.template.md` | Datos — declaran qué existe |
| Backends (npm, cargo, github...) | `agents/*.yml` | Comportamiento — declaran cómo ejecutar |
| Herramientas instaladas | `mcp/*.py` | Runtime — infraestructura activa |

El principio de mise que adoptamos: **nuevas capacidades = nuevos archivos de datos, no modificar el core**.

---

## Consecuencias

### Positivas

- Un developer nuevo puede entender la estructura del registry leyendo solo los nombres de los subdirectorios
- Cada tipo de artefacto escala independientemente: agregar un agente no toca los templates; agregar un template no toca los servidores MCP
- La documentación (`docs/registry.md`) puede organizarse por flujo en lugar de por archivo

### Negativas / compensadas

- Los YMLs de agentes tienen un campo `skill_template:` que referencia templates del Flujo B — existe acoplamiento entre los dos tipos. Compensado: el campo es metadata opcional, no lo usa `bootstrap.py` para la generación.

---

## Evolución futura

En una versión posterior, cada skill podría tener un archivo de metadata declarativo (`skill.toml`) similar al `registry/*.toml` de mise:

```toml
# .claude/skills/backend-nodejs/skill.toml (futuro)
id = "backend-nodejs"
version = "1.0"
detect = ["package.json", ".nvmrc"]
backends = ["generator:template"]
test = { check = "file_exists:.claude/skills/backend-nodejs/SKILL.md" }
```

Esto permitiría discovery programático, validación con JSON Schema y un `thyrox doctor` análogo al `mise doctor`. Decisión diferida a FASE 16+.

---

## Referencias

- Análisis de referencia: `/tmp/reference/mise-analysis.md`
- Referencia operacional del registry: `docs/registry.md`
- README interno del registry: `.claude/registry/README.md`
- Historial de la unificación: ROADMAP.md FASE 15
