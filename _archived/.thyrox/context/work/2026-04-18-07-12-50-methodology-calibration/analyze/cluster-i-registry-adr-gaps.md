```yml
created_at: 2026-04-20 03:00:39
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 3 — ANALYZE
author: NestorMonroy
status: Borrador
```

# Cluster I — Registry Pipeline y ADR Coverage: Gaps

## Resumen ejecutivo

El pipeline de generación de THYROX tiene tres responsabilidades documentadas: (1) generar
agentes tech desde YMLs vía `bootstrap.py`, (2) generar skills + guidelines desde templates
vía `_generator.sh`, y (3) actualizar `.mcp.json` con los MCP servers. Los tres mecanismos
funcionan correctamente para los casos cubiertos. Sin embargo, hay 4 gaps estructurales que
producen realismo performativo: (a) 18 de 27 agentes instalados no tienen YML backing en
`registry/agents/` y fueron creados manualmente sin rastro de generación, (b) 6 techs están
declaradas en `TECH_CATEGORIES` de bootstrap.py sin template correspondiente — el instalador
falla silenciosamente para ellas, (c) `python-mcp` aparece en `@imports` de CLAUDE.md como
guideline "generada por registry" pero no tiene template en el registry, y (d) `faiss-cpu` y
`sentence-transformers` son dependencias requeridas por `thyrox-memory` MCP server pero no
están instaladas en el entorno actual. El ADR coverage tiene 3 decisiones implementadas en
código que no tienen registro formal.

---

## Sección 1: Pipeline bootstrap.py

### Capa 1 — Qué genera bootstrap.py

**Fuente:** `bootstrap.py` L1-433, ejecutado como `python .thyrox/registry/bootstrap.py --stack <techs>`

bootstrap.py tiene tres funciones de generación:

**F1 — `install_core_agents()`** (L241-263): NO genera ningún archivo. Solo verifica que los 4
core agents (`task-planner`, `task-executor`, `tech-detector`, `skill-generator`) ya existan
en `.claude/agents/`. Si no existen → imprime `[FAIL]` y continúa. No lanza excepción, no
aborta. El llamador no puede distinguir un bootstrap exitoso de uno parcialmente fallido salvo
leyendo stdout.

**F2 — `install_tech_agent()`** (L266-312): Genera `.claude/agents/{tech}-expert.md` combinando:
- YAML del registry: `registry/agents/{tech}-expert.yml` (nombre, description, tools)
- Template de skill: `registry/{category}/{tech}.skill.template.md` (body)

Si el YAML no existe → imprime `[FAIL]` y retorna False (no aborta). Si el template no existe
→ usa un body genérico (`# {name}\n\nAgente experto en {tech}.`). Ninguna de estas dos
condiciones se propaga como error al caller.

**Bug documentado (L309-310):** La variable `action` siempre valdrá `"sobreescrito"` porque
se calcula **después** de `dest.write_text(content)`, cuando `dest` ya existe
incondicionalmente.

```python
dest.write_text(content)          # L309 — escribe el archivo
action = "sobreescrito" if dest.exists() else "creado"  # L310 — dest.exists() siempre True
```

**F3 — `update_mcp_json()`** (L315-337): Actualiza `.mcp.json` con las entradas
`thyrox-memory` y `thyrox-executor`. No valida que los servidores referenciados existan o
sean ejecutables.

**Validación de output:** Ausente. El script imprime un resumen final con `len(list(AGENTS_DIR.glob('*.md')))` (L425) pero ese conteo incluye agentes pre-existentes — no confirma que los agentes del `--stack` actual fueron generados correctamente.

**Error de path en docstring (L9-11):** El docstring dice `python .claude/registry/bootstrap.py`
pero el script vive en `.thyrox/registry/bootstrap.py`. `PROJECT_ROOT` se deriva correctamente
del `__file__` en runtime (L24: `.thyrox/registry/ → .thyrox/ → repo root`), por lo que el
path real funciona. El docstring es decorativo incorrecto.

### Capa 2 — _generator.sh

**Fuente:** `_generator.sh` L1-143

El script lee un template desde `registry/{layer}/{framework}.template.md`, extrae dos
secciones delimitadas por marcadores HTML (`<!-- SKILL_START -->`, `<!-- SKILL_END -->`,
`<!-- INSTRUCTIONS_START -->`, `<!-- INSTRUCTIONS_END -->`), reemplaza placeholders
(`{{PROJECT_NAME}}`, `{{LAYER}}`, etc.) y escribe dos archivos:
- `.claude/skills/{layer}-{framework}/SKILL.md`
- `.thyrox/guidelines/{layer}-{framework}.instructions.md`

**Validación de template:** El script valida que los 4 marcadores estén presentes antes de
ejecutar (L91-96). Si falta alguno → exit 1. Esta es la única validación de input.

**Validación de output:** Ausente. Después de los dos `>` de redirección (L136-137), no hay
verificación de que los archivos se crearon con contenido no vacío. Si `awk` o `sed` fallan
silenciosamente (por ejemplo, marcadores presentes pero sin contenido entre ellos), se
crearían archivos vacíos sin error reportado.

**Generación de SKILL.md con `set -euo pipefail`:** El `set -euo pipefail` (L4) protege
contra errores de comandos encadenados. Sin embargo, `awk` retorna 0 aunque no encuentre
contenido entre marcadores — el archivo se crea vacío y el script termina con `[GREEN] Generated`.

**Templates disponibles (observación directa):** 5 templates en el registry:
- `backend/nodejs.template.md`
- `db/mysql.template.md`
- `db/postgresql.template.md`
- `frontend/react.template.md`
- `frontend/webpack.template.md`

**python-mcp — generación espuria:** `.thyrox/guidelines/python-mcp.instructions.md` existe
y está referenciado en `CLAUDE.md` con `@.thyrox/guidelines/python-mcp.instructions.md` como
si fuera generado por `_generator.sh`. Sin embargo, no existe ningún template
`registry/backend/python-mcp.template.md` ni `registry/python/python-mcp.template.md`. El
archivo fue creado manualmente. `.claude/skills/python-mcp/SKILL.md` tampoco contiene los
marcadores `<!-- SKILL_START -->` que identifican output de `_generator.sh`. La narrativa
"directivas generadas por `registry/_generator.sh`" en CLAUDE.md no aplica a `python-mcp`.

### Capa 3 — Gap YML ↔ agentes instalados

**Evidencia directa:** `ls .thyrox/registry/agents/` vs `ls .claude/agents/`

**YMLs en registry/agents/ (9 archivos):**
```
mysql-expert, nodejs-expert, postgresql-expert, react-expert,
skill-generator, task-executor, task-planner, tech-detector, webpack-expert
```

**Agentes instalados en .claude/agents/ (27 archivos):**
```
agentic-reasoning, ba-coordinator, bpa-coordinator, cp-coordinator,
deep-dive, deep-review, diagrama-ishikawa, dmaic-coordinator,
lean-coordinator, mysql-expert, nodejs-expert, pattern-harvester,
pdca-coordinator, pm-coordinator, postgresql-expert, pps-coordinator,
react-expert, rm-coordinator, rup-coordinator, skill-generator,
sp-coordinator, task-executor, task-planner, task-synthesizer,
tech-detector, thyrox-coordinator, webpack-expert
```

**18 agentes instalados sin YML backing en registry/agents/:**

| Agente | Tipo | Origen presumible |
|--------|------|-------------------|
| `agentic-reasoning` | Análisis | Manual |
| `ba-coordinator` | Coordinator | Manual |
| `bpa-coordinator` | Coordinator | Manual |
| `cp-coordinator` | Coordinator | Manual |
| `deep-dive` | Análisis | Manual |
| `deep-review` | Análisis | Manual |
| `diagrama-ishikawa` | Análisis | Manual |
| `dmaic-coordinator` | Coordinator | Manual |
| `lean-coordinator` | Coordinator | Manual |
| `pattern-harvester` | Análisis | Manual |
| `pdca-coordinator` | Coordinator | Manual |
| `pm-coordinator` | Coordinator | Manual |
| `pps-coordinator` | Coordinator | Manual |
| `rm-coordinator` | Coordinator | Manual |
| `rup-coordinator` | Coordinator | Manual |
| `sp-coordinator` | Coordinator | Manual |
| `task-synthesizer` | Orquestación | Manual |
| `thyrox-coordinator` | Orquestación | Manual |

La política de creación manual de coordinators está documentada en un comentario de código en
`bootstrap.py` L46-67, pero **no en ningún ADR**. Esta decisión tiene implicaciones de
onboarding: un nuevo mantenedor del sistema que ejecute `bootstrap.py` esperaría que genere
todos los agentes, pero genera solo 9 de 27.

**Techs en TECH_CATEGORIES sin template ni YML (fallo silencioso de bootstrap.py):**

| Tech | Categoría | Template | YML |
|------|-----------|----------|-----|
| `python` | backend | No existe | No existe |
| `fastapi` | backend | No existe | No existe |
| `django` | backend | No existe | No existe |
| `mongodb` | database | No existe | No existe |
| `redis` | database | No existe | No existe |

Si un usuario ejecuta `bootstrap.py --stack python,fastapi` verá `[FAIL]` para ambas techs,
pero el script termina con exit code 0 y el mensaje "Bootstrap completado". No hay
distinción entre "instalación completa" y "instalación parcial con fallos".

---

## Sección 2: ADR Coverage

### Capa 4 — Gaps de ADRs faltantes

**ADRs existentes analizados:** 23 ADRs en `.thyrox/context/decisions/`

Los 3 gaps más críticos de decisiones implementadas sin ADR:

**GAP-1 — Política de coordinators como artefactos estáticos (Crítico)**

La decisión de que los coordinators NO se generan desde bootstrap.py y son archivos
mantenidos manualmente está documentada únicamente en un comentario de código en
`bootstrap.py` L46-67. Esta es una decisión arquitectónica con consecuencias directas sobre:
- Proceso de onboarding de nuevos mantenedores
- Proceso de agregar nuevas metodologías
- Expectativas de qué hace `bootstrap.py`

El ADR más cercano es `adr-meta-framework-orchestration.md` que describe la arquitectura de
4 capas pero no documenta explícitamente el mecanismo de creación/mantenimiento de
coordinators.

**GAP-2 — python-mcp como skill manual fuera del pipeline (Alto)**

La guideline `python-mcp.instructions.md` y el skill `python-mcp/SKILL.md` existen como
artefactos manuales mientras que todos los demás tech guidelines son generados por
`_generator.sh`. La razón (MCP es infraestructura del propio framework, no un stack tech
externo) es razonable pero no está registrada. El resultado: CLAUDE.md la lista bajo "generadas
por registry" cuando no lo es, y cualquier intento de `_generator.sh backend python-mcp`
fallaría con `ERROR: Template not found`.

**GAP-3 — Naming mismatch methodologies ↔ coordinators (Medio)**

`registry/methodologies/` contiene `pmbok.yml` y `babok.yml`, pero los coordinators
instalados son `pm-coordinator.md` y `ba-coordinator.md` (sin el sufijo completo del
framework). `routing-rules.yml` usa `pm-coordinator` y `ba-coordinator` correctamente, pero
la convención de naming declarada en `bootstrap.py` L63-66 es `{flow-id}-coordinator.md` —
lo que implicaría `pmbok-coordinator.md` y `babok-coordinator.md`. La inconsistencia no rompe
funcionalidad pero viola el contrato declarado y complica agregar nuevas metodologías.

### Capa 5 — Realismo performativo en el pipeline

**RP-1 — "Fuente de verdad única" en registry/agents/ (Alto)**

`registry/README.md` probablemente declara que `registry/agents/` es la fuente de verdad
para los agentes. En la práctica, 18 de 27 agentes operacionales no tienen representación
en el registry. Cualquier claim de "fuente de verdad" para el registry es performativo
respecto a los coordinators, agentes de análisis (`deep-dive`, `agentic-reasoning`, etc.)
y agentes de síntesis (`task-synthesizer`).

**RP-2 — "Genera automáticamente" en CLAUDE.md (Medio)**

`CLAUDE.md` declara sobre las guidelines: "Generadas por `registry/_generator.sh`". Esta
afirmación es verdadera para 5 de 6 guidelines listadas en los `@imports`. Para
`python-mcp.instructions.md` es falsa — fue creada manualmente y no tiene template en el
registry. La frase genera expectativa incorrecta sobre el proceso de actualización: si alguien
necesita actualizar `python-mcp.instructions.md`, buscaría el template en el registry y no
lo encontraría.

**RP-3 — Exit code de bootstrap.py (Alto)**

El script termina con `return 0` (success) independientemente de si hubo `[FAIL]` en la
instalación de core agents o tech agents. Un pipeline CI que ejecute bootstrap.py y verifique
el exit code para determinar si la instalación fue exitosa obtendría un falso positivo.

**RP-4 — "Bootstrap completado" con instalación parcial (Alto)**

El mensaje final "Bootstrap completado" + resumen de conteo (`Total en .claude/agents/: N`)
usa el conteo de todos los `.md` existentes, no solo los generados en esta ejecución. Si 5
de los 27 agentes ya existían de instalaciones previas y 0 fueron generados por esta
ejecución (porque todos los techs del `--stack` fallaron), el resumen mostraría
`Total en .claude/agents/: 27` — idéntico a una instalación exitosa.

### Capa 6 — Dependencias ocultas del pipeline

**DEP-1 — faiss-cpu y sentence-transformers no instalados (Crítico)**

El MCP server `thyrox-memory` (configurado en `.mcp.json` y registrado en bootstrap.py
`MCP_SERVERS`) requiere `faiss-cpu` y `sentence-transformers`. Verificación directa:

```
$ python3 -c "import faiss"
ModuleNotFoundError: No module named 'faiss'
```

`requirements.txt` existe y lista estas dependencias, pero bootstrap.py no ejecuta
`pip install -r requirements.txt` ni verifica el entorno. El MCP server fallará al iniciar
en cualquier entorno limpio. `thyrox_core.py` L190-195 tiene un guard con mensaje
"Run: pip install faiss-cpu sentence-transformers", pero ese error solo aparece en runtime
del servidor, no durante `bootstrap.py`.

**DEP-2 — Paths relativos en .mcp.json (Alto)**

Las entradas de `.mcp.json` usan paths relativos:
```json
"args": [".thyrox/registry/mcp/memory_server.py"]
```

Esto asume que Claude Code ejecuta los MCP servers desde el `PROJECT_ROOT`. Si Claude Code
cambia el working directory o si el proyecto se mueve, los paths fallan. No hay documentación
de este supuesto.

**DEP-3 — `python` sin versión mínima declarada en .mcp.json (Medio)**

`.mcp.json` usa `"command": "python"` sin especificar versión. `thyrox_core.py` usa
`from __future__ import annotations` y type hints modernos que requieren Python 3.10+.
`requirements.txt` no declara versión de Python. Un entorno con Python 3.8 o 3.9 fallaría
con errores de tipo, no con un error claro de versión.

**DEP-4 — `awk` y `sed` asumidos en PATH (Bajo)**

`_generator.sh` asume `awk` y `sed` disponibles sin verificación. En entornos Docker
mínimos o Windows (WSL sin paquetes base), podrían no estar presentes. La cabecera
`#!/usr/bin/env bash` + `set -euo pipefail` detectaría la ausencia, pero el mensaje de
error sería críptico (`command not found: awk`) sin indicar qué instalar.

---

## Tabla de hallazgos

| ID | Hallazgo | Archivo | Línea | Severidad |
|----|----------|---------|-------|-----------|
| H-01 | 18/27 agentes sin YML en registry — "fuente de verdad" performativa | `registry/agents/` | — | Alto |
| H-02 | bootstrap.py exit code 0 con instalaciones fallidas | `bootstrap.py` | L429 | Alto |
| H-03 | faiss-cpu no instalado, thyrox-memory MCP inoperativo en entorno limpio | `thyrox_core.py` | L190 | Crítico |
| H-04 | python-mcp en @imports como "generado por _generator.sh" — sin template | `CLAUDE.md` | (imports) | Alto |
| H-05 | 5 techs en TECH_CATEGORIES sin template ni YML — fallo silencioso | `bootstrap.py` | L31-42 | Alto |
| H-06 | Bug: variable `action` siempre "sobreescrito" post-write | `bootstrap.py` | L309-310 | Bajo |
| H-07 | Path en docstring: `.claude/registry/` vs `.thyrox/registry/` real | `bootstrap.py` | L9-11 | Bajo |
| H-08 | _generator.sh no verifica output no-vacío tras extracción awk | `_generator.sh` | L136-137 | Medio |
| H-09 | ADR faltante: política de coordinators como artefactos estáticos | `bootstrap.py` | L46-67 | Alto |
| H-10 | ADR faltante: python-mcp como skill manual fuera del pipeline | `CLAUDE.md` | (imports) | Alto |
| H-11 | ADR faltante: naming mismatch pmbok→pm / babok→ba | `routing-rules.yml` | L42-55 | Medio |
| H-12 | Paths relativos en .mcp.json asumen cwd=PROJECT_ROOT sin documentar | `.mcp.json` | L6,12 | Alto |
| H-13 | `python` sin versión mínima en .mcp.json, scripts requieren 3.10+ | `.mcp.json` | L5,11 | Medio |
| H-14 | Conteo final bootstrap.py incluye agentes pre-existentes — métrica no informativa | `bootstrap.py` | L425 | Bajo |

---

## Propuestas de tasks

### T-01 [CRÍTICO] — Instalar dependencias MCP o documentar pre-requisito

**Problema:** `faiss-cpu` y `sentence-transformers` no instalados. `thyrox-memory` MCP
server falla en entorno limpio sin error claro en bootstrap.

**Acción:** Agregar a `bootstrap.py` una función `check_python_deps()` que verifique las
dependencias críticas antes de registrar los MCP servers en `.mcp.json`, o añadir en el
output del bootstrap un warning explícito: "WARN: thyrox-memory requiere
`pip install faiss-cpu sentence-transformers` — MCP server inoperativo hasta instalación".

**Archivo:** `bootstrap.py` (nueva función entre L340-345) + `registry/mcp/README.md`
**Dependencias:** ninguna

---

### T-02 [CRÍTICO] — Crear ADR para política de coordinators estáticos

**Problema:** Decisión arquitectónica crítica (coordinators = artefactos manuales, no
generados) documentada solo en comentario de código. Sin ADR, cualquier mantenedor puede
"romper" el sistema intentando generarlos o puede no saber cómo crear un nuevo coordinator.

**Acción:** Crear `decisions/adr-coordinators-static-artifacts.md` que documente:
- Por qué coordinators no se generan desde bootstrap.py
- Cómo crear un nuevo coordinator (template base: `dmaic-coordinator.md`)
- La convención de naming `{flow-id}-coordinator.md` y los casos que la violan (pm, ba)

**Archivo:** `.thyrox/context/decisions/adr-coordinators-static-artifacts.md`
**Dependencias:** ninguna

---

### T-03 [ALTO] — Corregir exit code de bootstrap.py

**Problema:** `main()` retorna 0 incluso cuando hay `[FAIL]` en instalación de core agents
o tech agents. Impide uso en CI/CD y da feedback erróneo al usuario.

**Acción:** Trackear fallos en `install_core_agents()` e `install_tech_agent()`, retornar
exit code 1 si algún agente requerido falló. Separar "skip por ya-existe" (no-fallo) de
"fail por no encontrado" (fallo real).

**Archivo:** `bootstrap.py` L241-263, L396-413, L429
**Dependencias:** ninguna

---

### T-04 [ALTO] — Crear ADR para python-mcp como skill manual

**Problema:** `python-mcp.instructions.md` está listada en CLAUDE.md como "generada por
_generator.sh" cuando fue creada manualmente. La inconsistencia afecta cualquier intento
de actualizar o regenerar el guideline.

**Acción:** Crear `decisions/adr-python-mcp-manual-skill.md` o agregar nota en CLAUDE.md
distinguiendo guidelines generadas vs manuales en los @imports. Si se elige ADR, documentar
por qué python-mcp es infraestructura del framework y no un tech stack externo.

**Archivo:** `.thyrox/context/decisions/adr-python-mcp-manual-skill.md` y/o `CLAUDE.md`
**Dependencias:** ninguna

---

### T-05 [ALTO] — Agregar verificación de output no-vacío en _generator.sh

**Problema:** Si el contenido entre marcadores SKILL_START/SKILL_END está vacío, `awk`
produce archivo vacío sin error. El script reporta `[GREEN] Generated` con archivos vacíos.

**Acción:** Después de las líneas L136-137, agregar:
```bash
[ -s "$SKILL_FILE" ] || { echo -e "${RED}ERROR: $SKILL_FILE generado vacío${NC}" >&2; exit 1; }
[ -s "$INSTRUCTIONS_FILE" ] || { echo -e "${RED}ERROR: $INSTRUCTIONS_FILE generado vacío${NC}" >&2; exit 1; }
```

**Archivo:** `_generator.sh` L138 (inserción)
**Dependencias:** ninguna
