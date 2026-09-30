```yml
type: Análisis Phase 1
work_package: 2026-04-07-03-08-03-agent-format-spec
created_at: 2026-04-07 03:08:03
status: Borrador
author: Claude (agent especializado Phase 1)
phase: Phase 1 — ANALYZE
```

# Analysis: agent-format-spec

## Objetivo del Work Package

Definir la especificación formal del formato de agentes nativos de Claude Code (`.claude/agents/*.md`): qué campos son obligatorios, cómo escribir `description` de calidad, crear un linter que valide el formato. Formalizar la distinción entre SKILL y Agente en una reference del framework.

---

## 1. Dominio y Contexto

### ¿Qué es un agente nativo de Claude Code?

Un agente nativo de Claude Code es un archivo `.md` ubicado en `.claude/agents/` con un frontmatter YAML que Claude Code interpreta para hacer sub-spawning. Cuando el contexto principal invoca `Agent tool`, Claude Code usa el campo `description` como criterio de routing para seleccionar el agente correcto.

**Ruta canónica:** `.claude/agents/{nombre}.md`

### ¿Qué es un SKILL?

Un SKILL es un conjunto de instrucciones de metodología que Claude sigue dentro del contexto principal (no como subproceso). Se activa con `Skill tool` y vive en `.claude/skills/{nombre}/SKILL.md`.

### Distinción fundamental

| Dimensión | SKILL | Agente |
|-----------|-------|--------|
| Qué es | Metodología — el *cómo* | Ejecutor autónomo — el *quién* |
| Activación | `Skill tool` en contexto principal | `Agent tool` → subproceso separado |
| Ubicación | `.claude/skills/{nombre}/SKILL.md` | `.claude/agents/{nombre}.md` |
| Formato | Markdown libre (sin frontmatter obligatorio) | Frontmatter YAML + cuerpo markdown |
| Acceso a tools | Hereda tools del contexto principal | Lista propia de tools declaradas |
| Paralelo | No — instrucciones en serie | Sí — puede ejecutarse en paralelo |

---

## 2. Inventario del Estado Actual

### 2.1 Agentes en `.claude/agents/` (6 agentes)

| Archivo | `name` | `description` | `model` | `tools` declaradas |
|---------|--------|---------------|---------|-------------------|
| `nodejs-expert.md` | `nodejs-expert` | `>` (vacío — solo `>`) | `claude` | 6 tools |
| `react-expert.md` | `react-expert` | `>` (vacío — solo `>`) | `claude` | 6 tools |
| `skill-generator.md` | `skill-generator` | Texto completo, uso claro | ausente | 3 tools |
| `task-executor.md` | `task-executor` | Texto completo, uso claro | ausente | 9 tools |
| `task-planner.md` | `task-planner` | Texto completo, uso claro | ausente | 7 tools |
| `tech-detector.md` | `tech-detector` | Texto completo, uso claro | ausente | 3 tools |

**Observación crítica:** `nodejs-expert.md` y `react-expert.md` fueron generados desde el registry y tienen `description: >` sin valor — el campo está presente pero vacío. Esto rompe el routing basado en descripción.

**Observación sobre `model`:** `nodejs-expert.md` y `react-expert.md` tienen `model: claude` (valor genérico). Los demás no tienen `model`. El registry YML sí incluye `model: claude-sonnet-4-6`. Existe inconsistencia entre lo que el registry genera y lo que el formato nativo debería tener.

### 2.2 Agentes en `registry/agents/` (7 archivos YML)

| Archivo | `model` | `category` | `skill_template` |
|---------|---------|------------|-----------------|
| `nodejs-expert.yml` | `claude-sonnet-4-6` | `backend` | sí |
| `react-expert.yml` | (no leído pero similar) | `frontend` | sí |
| `postgresql-expert.yml` | (similar) | `database` | sí |
| `skill-generator.yml` | `claude-sonnet-4-6` | ausente | ausente |
| `task-executor.yml` | `claude-sonnet-4-6` | ausente | ausente |
| `task-planner.yml` | (similar) | ausente | ausente |
| `tech-detector.yml` | (similar) | ausente | ausente |

**El registry YML tiene campos que el agente nativo NO debe tener** (`model`, `category`, `skill_template`, `system_prompt`). El generador `skill-generator.md` incluye `model` en el output generado — esto es incorrecto según las instrucciones del WP.

---

## 3. Análisis de Gaps

### GAP-1: No hay spec formal de campos obligatorios vs opcionales

**Evidencia:** Los 6 agentes existentes usan subconjuntos distintos del frontmatter:
- `nodejs-expert.md`: tiene `name`, `description` (vacío), `model`, `tools`
- `task-executor.md`: tiene `name`, `description` (con texto), `tools` (sin `model`)
- Ningún documento define qué es obligatorio

**Impacto:** El generador `skill-generator.md` produce frontmatter incorrecto (incluye `model`) y no sabe que `description` es el campo más crítico para el routing.

### GAP-2: No hay convención para escribir `description` de calidad

**Evidencia:**
- `nodejs-expert.md`: `description: >` → vacío (routing imposible)
- `react-expert.md`: `description: >` → vacío (routing imposible)
- `task-executor.md`: `description: Ejecuta tareas atómicas de un task-plan.md. Usar cuando hay un task-plan con checkboxes T-NNN...` → buena calidad
- `skill-generator.md`: `description: Genera archivos de skill (.claude/skills/ o .claude/agents/) para una tecnología específica...` → buena calidad

Los agentes de alta calidad siguen un patrón implícito: `{qué hace}. Usar cuando {condición}`. Los tech-experts generados desde el registry no siguen este patrón porque el registry no tiene descripción útil.

### GAP-3: No hay linter que valide `.claude/agents/*.md`

**Evidencia:** No existe ningún script en `.claude/skills/pm-thyrox/scripts/` ni en `registry/` que valide el formato de los agentes.

**Impacto:** `nodejs-expert.md` y `react-expert.md` tienen `description` vacío y nadie lo detectó automáticamente.

### GAP-4: La distinción SKILL vs Agente no está documentada

**Evidencia:** Buscado en `.claude/skills/pm-thyrox/references/` — no hay ninguna reference que explique cuándo crear un SKILL vs un agente. Las reglas en `CLAUDE.md` solo mencionan que existen ambos, no cuándo usar cada uno.

### GAP-5: Schema del registry vs formato nativo son inconsistentes

**Evidencia directa:**
- `registry/agents/task-executor.yml` tiene: `model`, `system_prompt` (como campo YML separado)
- `skill-generator.md` (el generador) incluye `model: {model}` en el output generado
- El formato nativo correcto NO debe incluir `model` según las instrucciones del WP

**Impacto:** Cada vez que se regenera un agente desde el registry, se produce un archivo con `model` incorrecto.

### GAP-6: No hay convención de naming para agentes

**Evidencia:** Los 6 agentes usan patrones distintos sin documentación:
- `{tech}-expert.md` — para tech experts
- `task-{rol}.md` — para agentes de workflow (task-executor, task-planner)
- `tech-detector.md` — `{dominio}-{función}.md`
- `skill-generator.md` — `{qué genera}-generator.md`

No hay documento que defina cuándo usar `{capa}-{acción}` vs `{dominio}-{rol}` vs `{nombre}`.

---

## 4. Investigación por Aspectos (8 preguntas de Phase 1)

### ¿Qué existe hoy?

6 agentes nativos con formato inconsistente. 7 YMLs en el registry con schema diferente (más campos). Un generador que produce output incorrecto (incluye `model`). Cero documentación sobre el formato esperado.

### ¿Qué funciona bien?

Los 4 agentes de workflow (`task-executor`, `task-planner`, `skill-generator`, `tech-detector`) tienen `description` de calidad con patrón `{qué hace}. Usar cuando {condición}. NUNCA ejecuta — solo planifica` (para task-planner).

### ¿Qué está roto?

- `nodejs-expert.md` y `react-expert.md` tienen `description` vacío → routing imposible
- El generador produce `model` en el output → debe eliminarse
- No hay validación automática → los errores pasan desapercibidos

### ¿Qué está faltando completamente?

- Spec formal (documento de referencia)
- Linter/validador ejecutable
- Reference en el framework que explique SKILL vs Agente
- Convención de naming documentada

### ¿Cuáles son las dependencias?

El linter depende de que exista la spec formal. La reference SKILL vs Agente puede escribirse en paralelo a la spec. La corrección de los agentes existentes depende de la spec.

### ¿Cuál es el alcance correcto?

1. Spec formal en `registry/` o `.claude/skills/pm-thyrox/references/`
2. Linter en `.claude/skills/pm-thyrox/scripts/`
3. Reference SKILL vs Agente en `.claude/skills/pm-thyrox/references/`
4. Corrección de agentes existentes (`nodejs-expert.md`, `react-expert.md`)
5. Actualización del generador para no incluir `model`

### ¿Qué riesgos tiene?

Ver risk register adjunto.

### ¿Qué criterios de éxito son medibles?

Ver sección siguiente.

---

## 5. Criterios de Éxito Medibles

| ID | Criterio | Métrica |
|----|----------|---------|
| SC-001 | Todos los agentes en `.claude/agents/` tienen `description` no vacío | `linter.py --check` retorna 0 errores en descripción |
| SC-002 | Ningún agente en `.claude/agents/` tiene campo `model` | `linter.py --check` retorna 0 errores en campos prohibidos |
| SC-003 | El linter valida los 6 campos del spec | El script detecta los 3 tipos de error presentes hoy en 2 agentes |
| SC-004 | Existe reference `skill-vs-agent.md` en `.claude/skills/pm-thyrox/references/` | Archivo existe y contiene tabla de distinción |
| SC-005 | La spec define campos obligatorios/opcionales/prohibidos | Documento existe con 3 secciones diferenciadas |
| SC-006 | La convención de naming está documentada con ejemplos | Al menos 3 patrones documentados con ejemplos de cuándo usar cada uno |
| SC-007 | El generador no produce `model` en el output | `skill-generator.md` actualizado y probado |

---

## 6. Observaciones de Dogfooding — Ejecución en Paralelo

Este WP se ejecuta simultáneamente con `2026-04-07-03-08-03-parallel-agent-conventions`. Las siguientes fricciones fueron observadas durante Phase 1:

### Fricción 1: Invisibilidad del WP paralelo

**Observado:** Al listar `.claude/context/work/`, el WP `parallel-agent-conventions` existe con su directorio `analysis/` ya creado, pero el contenido está vacío. No hay forma de saber qué está investigando el otro agente, qué gaps ya identificó, o si hay overlap en el análisis.

**Impacto:** Riesgo real de análisis duplicado. Este agente documentó los mismos 6 gaps que potencialmente el otro agente está documentando en este momento. Sin coordinación, el output de Phase 1 puede ser redundante o contradictorio.

**Ausencia de mecanismo:** No hay protocolo definido para que dos agentes ejecutando Phase 1 en paralelo en WPs relacionados puedan coordinarse. No existe un "shared scratch space" o archivo de estado intermedio.

### Fricción 2: Imposibilidad de modificar archivos compartidos

**Instrucción recibida:** "NO modificar ROADMAP.md, now.md ni ningún archivo compartido."

**Impacto observado:** Esta restricción es correcta para evitar conflictos de escritura concurrente, pero genera una asimetría: el agente tiene información útil (hallazgos del análisis) que debería actualizar el estado del proyecto, pero no puede hacerlo. Al finalizar la sesión, alguien debe fusionar el estado manualmente.

**Fricción concreta:** No saber si el otro agente ya actualizó `now.md` con bloqueos o hallazgos relevantes para este WP.

### Fricción 3: Solapamiento de scope

**Observado:** El WP `parallel-agent-conventions` tiene un nombre que sugiere que también trata sobre convenciones de agentes — posible overlap directo con este WP. Sin coordinación previa, ambos agentes pueden producir specs distintas para el mismo problema.

**Hipótesis:** Probablemente los dos WPs son complementarios (uno hace spec, el otro hace convenciones de naming/uso), pero la separación no es visible desde los archivos disponibles.

### Conclusión de dogfooding

La ejecución en paralelo de WPs relacionados sin comunicación inter-agente funciona cuando los scopes son completamente ortogonales. Cuando hay overlap temático, el riesgo de divergencia es alto. El framework actual no tiene mecanismo para resolverlo en tiempo real — la coordinación debe ocurrir en Phase 2 (STRATEGY) cuando el humano puede revisar ambos análisis y definir la división.

---

## 7. Preguntas Resueltas (sin `[NEEDS CLARIFICATION]`)

Todas las preguntas de análisis pudieron responderse con la información disponible en el repositorio:

- **¿Debe `model` incluirse?** No. El WP lo indica explícitamente. Evidencia en repo: los 4 agentes de workflow de mejor calidad no lo tienen.
- **¿Dónde vive la spec?** En `.claude/skills/pm-thyrox/references/` (sigue la anatomía del framework).
- **¿Dónde vive el linter?** En `.claude/skills/pm-thyrox/scripts/` (anatomía oficial).
- **¿Qué hace el campo `description`?** Routing — Claude Code lo usa para seleccionar el agente correcto al invocar `Agent tool`.
- **¿Hay agentes con description vacía?** Sí: `nodejs-expert.md` y `react-expert.md`.
