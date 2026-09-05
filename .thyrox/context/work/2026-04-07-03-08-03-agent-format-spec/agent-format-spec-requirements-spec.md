```yml
type: Especificación de Requisitos
work_package: 2026-04-07-03-08-03-agent-format-spec
created_at: 2026-04-07 04:47:24
status: Borrador
phase: Phase 4 — STRUCTURE
```

# Especificación de Requisitos: agent-format-spec

## Tabla de Requisitos

| ID | Descripción | Prioridad | Tarea |
|----|------------|-----------|-------|
| R-001 | Campos obligatorios en agente nativo | Alta | T-001, T-002 |
| R-002 | Campos prohibidos en agente nativo | Alta | T-001, T-002 |
| R-003 | Calidad de `description` | Alta | T-001, T-002 |
| R-004 | Corrección de nodejs-expert y react-expert | Alta | T-004, T-005 |
| R-005 | Generador no propaga `model` | Alta | T-006 |
| R-006 | Reference skill-vs-agent | Media | T-003 |
| R-007 | Linter ejecutable | Alta | T-002 |

---

## R-001 — Campos obligatorios

**Given** un archivo `.claude/agents/{nombre}.md` con frontmatter YAML
**When** el linter valida el archivo
**Then** el archivo debe contener los tres campos obligatorios:
- `name`: string en kebab-case, coincide con el nombre del archivo sin extensión
- `description`: string de al menos 20 caracteres, no puede ser bloque vacío `>`
- `tools`: lista YAML con al menos un elemento

**And** si falta algún campo obligatorio, el linter imprime:
```
[ERROR] {filepath}: missing required field '{field}'
```

**Acceptance criteria:**
- `task-executor.md` pasa sin errores (ya tiene los 3 campos)
- Un archivo con solo `name:` genera 2 errores (description, tools faltantes)
- Un archivo sin frontmatter genera error en los 3 campos

---

## R-002 — Campos prohibidos

**Given** un archivo `.claude/agents/{nombre}.md`
**When** el linter valida el archivo
**Then** el archivo NO debe contener ninguno de estos campos en el frontmatter:
- `model`
- `category`
- `skill_template`
- `system_prompt`

**And** si se detecta un campo prohibido, el linter imprime:
```
[ERROR] {filepath}: prohibited field '{field}' found in frontmatter
```

**Acceptance criteria:**
- `nodejs-expert.md` (estado actual) genera ERROR por campo `model`
- `task-executor.md` pasa sin errores (no tiene campos prohibidos)
- Un archivo con `model: claude-sonnet-4-6` genera 1 error

---

## R-003 — Calidad de description

**Given** un agente con campo `description` presente y no vacío
**When** el linter valida
**Then** la description cumple:
- Longitud ≥ 20 caracteres
- No es un bloque YAML vacío (`description: >` sin contenido)
- No empieza con `>` como primer carácter del valor

**And** el linter emite WARNING (no ERROR) si la description no sigue el patrón recomendado:
```
[WARN] {filepath}: description should follow pattern '{qué hace}. Usar cuando {condición}.'
```

**Acceptance criteria:**
- `nodejs-expert.md` (estado actual, `description: >`) genera ERROR por description vacía
- `task-executor.md` pasa sin warnings (su description sigue el patrón)
- Una description de 10 caracteres genera WARNING de longitud
- Una description de 50 caracteres sin el patrón genera WARNING de patrón (no ERROR)

---

## R-004 — Corrección de nodejs-expert y react-expert

**Given** `nodejs-expert.md` con `description: >` (vacío) y `model: claude`
**When** se aplica la corrección
**Then** el archivo resultante tiene:
- `description`: texto ≥20 chars con patrón `{qué hace}. Usar cuando {condición}.`
- Campo `model` eliminado del frontmatter
- Campo `tools` preservado sin cambios
- Cuerpo del documento (body markdown) sin modificar

**And** `react-expert.md` recibe el mismo tratamiento

**And** después de la corrección:
```
python3 scripts/lint-agents.py .claude/agents/nodejs-expert.md
→ 1 file checked, 0 errors, 0 warnings
```

**Acceptance criteria:**
- El linter retorna 0 errores en ambos archivos post-corrección
- La description de cada agente es semánticamente correcta para su dominio
- El body markdown (instrucciones del agente) permanece intacto

---

## R-005 — Generador no propaga model

**Given** `skill-generator.md` genera un agente nativo desde un registry YML
**When** el registry YML contiene el campo `model: claude-sonnet-4-6`
**Then** el agente nativo generado NO incluye `model` en su frontmatter

**And** el generador tiene instrucción explícita visible:
```
# IMPORTANTE: no incluir campo `model` en el agente generado
# El model lo infiere Claude Code de la sesión — no es metadata del agente
```

**And** el linter ejecutado sobre el agente recién generado retorna 0 errores sobre campos prohibidos

**Acceptance criteria:**
- Instrucción explícita de filtrado en `skill-generator.md`
- Un agente generado desde `nodejs-expert.yml` no tiene campo `model`

---

## R-006 — Reference skill-vs-agent

**Given** `references/skill-vs-agent.md` existe
**When** un desarrollador o agente lo consulta
**Then** encuentra:
- Tabla comparativa con columnas: Dimensión | SKILL | Agente
- Filas: qué es, dónde vive, cómo se activa, acceso a tools, ejecución en paralelo
- Ejemplos concretos de cada tipo del proyecto THYROX
- Regla de decisión: cuándo crear un SKILL vs un agente

**Acceptance criteria:**
- El archivo tiene al menos 5 filas en la tabla comparativa
- Incluye al menos 2 ejemplos de SKILLs y 2 ejemplos de agentes del proyecto
- La regla de decisión es una oración accionable

---

## R-007 — Linter ejecutable

**Given** `scripts/lint-agents.py` existe
**When** se ejecuta `python3 scripts/lint-agents.py`
**Then**:
- Valida todos los archivos en `.claude/agents/*.md` por defecto
- Acepta path opcional como argumento: `python3 scripts/lint-agents.py .claude/agents/nodejs-expert.md`
- Imprime resultado por archivo: `✓ {file}` o `✗ {file}: {N} errors, {K} warnings`
- Imprime resumen final: `{N} files checked, {M} errors, {K} warnings`
- Retorna código de salida 0 si M=0, código 1 si M>0

**And** el script detecta los tres tipos de error presentes hoy:
- Campos prohibidos (nodejs-expert, react-expert tienen `model`)
- Description vacía (nodejs-expert, react-expert tienen `description: >`)
- Campos faltantes (si los hubiera)

**Acceptance criteria:**
- `python3 scripts/lint-agents.py` retorna código 1 con el estado actual del repo (2 agentes rotos)
- Después de corregir nodejs-expert y react-expert, retorna código 0
- El script no tiene dependencias externas fuera de stdlib Python + `pyyaml`

---

## Checklist de calidad de la spec

- [x] Todos los requisitos tienen Given/When/Then
- [x] Todos los requisitos tienen acceptance criteria medibles
- [x] Ningún requisito contiene `[NEEDS CLARIFICATION]`
- [x] La tabla de trazabilidad GAP→R cubre los 6 gaps del análisis
- [x] R-001 y R-002 son el gate para WP-1 (parallel-agent-conventions)

## Gate para WP-1

**Condición de desbloqueo:** Cuando el usuario apruebe R-001 (campos obligatorios) y R-002 (campos prohibidos), WP-1 puede modificar `task-executor.md` y `task-planner.md` con certeza del formato que deben respetar.
