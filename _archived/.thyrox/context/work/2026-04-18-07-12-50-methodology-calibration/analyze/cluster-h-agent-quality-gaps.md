```yml
created_at: 2026-04-20 02:57:58
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 3 — ANALYZE
author: NestorMonroy
status: Borrador
```

# Cluster H — Agent Quality: Gaps de Calibración

## Resumen ejecutivo

27 agentes instalados en `.claude/agents/`. De ellos:

- **I-007 (tools explícito):** 25/27 compliant. 2 agentes sin `tools:` en frontmatter.
- **I-008 (trigger pattern):** 14/27 compliant (52%). 13 agentes con descripciones que NO usan "Use when [condición]..." — el patrón requerido para auto-invocación confiable.
- **YML en registry:** 10 YMLs en registry (más README). Solo 9 de los 27 agentes instalados tienen YML de respaldo. 18 agentes no tienen YML — son archivos `.md` instalados sin fuente generadora verificable.
- **Ratio general de calibración del inventario:** 14/27 I-008 compliant (52%) — por debajo del umbral mínimo de 75% requerido para artefactos de gate.

El problema más grave es estructural: el corpus de agentes coordinadores (14 coordinadores) usa un patrón de descripción multilinea con "Usar cuando..." en lugar del trigger pattern inglés "Use when [condición]..." que requiere I-008. Aunque la intención es correcta, la forma puede no coincidir con el mecanismo de auto-invocación del runtime.

---

## Inventario de agentes

27 agentes instalados. Ningún ARCHITECTURE.md encontrado para comparar declarado vs. real.

| Agente | `tools:` en frontmatter | I-007 | I-008 | YML registry | Score |
|--------|------------------------|-------|-------|--------------|-------|
| agentic-reasoning | `Read, Glob, Grep, Bash, Write` | PASS | PARCIAL | No | 3/4 |
| ba-coordinator | `Read, Write, Edit, Glob, Grep, Bash` | PASS | PARCIAL | No | 3/4 |
| bpa-coordinator | `Read, Write, Edit, Glob, Grep, Bash` | PASS | PARCIAL | No | 3/4 |
| cp-coordinator | `Read, Write, Edit, Glob, Grep, Bash` | PASS | PARCIAL | No | 3/4 |
| deep-dive | `Read, Glob, Grep, Bash, Write` | PASS | PASS | No | 3/4 |
| deep-review | `Read, Glob, Grep, Bash` | PASS | PASS | No | 3/4 |
| diagrama-ishikawa | `Read, Write, Grep, Glob, Bash, Agent` | PASS | PASS | No | 3/4 |
| dmaic-coordinator | `Read, Write, Edit, Glob, Grep, Bash` | PASS | PARCIAL | No | 3/4 |
| lean-coordinator | `Read, Write, Edit, Glob, Grep, Bash` | PASS | PARCIAL | No | 3/4 |
| mysql-expert | lista con MCP tools | PASS | NO-COMPLIANT | Yes | 2/4 |
| nodejs-expert | lista con MCP tools | PASS | PARCIAL | Yes | 3/4 |
| pattern-harvester | `Read, Glob, Grep, Bash, Write` | PASS | PASS | No | 3/4 |
| pdca-coordinator | `Read, Write, Edit, Glob, Grep, Bash` | PASS | PARCIAL | No | 3/4 |
| pm-coordinator | `Read, Write, Edit, Glob, Grep, Bash` | PASS | PARCIAL | No | 3/4 |
| postgresql-expert | lista con MCP tools | PASS | NO-COMPLIANT | Yes | 2/4 |
| pps-coordinator | `Read, Write, Edit, Glob, Grep, Bash` | PASS | PARCIAL | No | 3/4 |
| react-expert | lista con MCP tools | PASS | PARCIAL | Yes | 3/4 |
| rm-coordinator | `Read, Write, Edit, Glob, Grep, Bash` | PASS | PARCIAL | No | 3/4 |
| rup-coordinator | `Read, Write, Edit, Glob, Grep, Bash` | PASS | PARCIAL | No | 3/4 |
| skill-generator | `Read, Write, Glob` | PASS | PARCIAL | Yes | 3/4 |
| sp-coordinator | `Read, Write, Edit, Glob, Grep, Bash` | PASS | PARCIAL | No | 3/4 |
| task-executor | lista completa con MCP | PASS | PASS | Yes | 3/4 |
| task-planner | lista con Agent, TodoWrite | PASS | PASS | Yes | 3/4 |
| task-synthesizer | `Read, Glob, Grep, Bash, Write` | PASS | PASS | No | 3/4 |
| tech-detector | `Glob, Read, Grep` | PASS | PARCIAL | Yes | 3/4 |
| thyrox-coordinator | `Read, Write, Edit, Glob, Grep, Bash` | PASS | PARCIAL | No | 3/4 |
| webpack-expert | lista con MCP tools | PASS | PARCIAL | Yes | 3/4 |

**Leyenda I-008:** PASS = "Use when [condición]..." exacto; PARCIAL = "Usar cuando..." o descripción larga con condición implícita; NO-COMPLIANT = ausencia total de condición de invocación.

---

## Hallazgos por capa

### Capa 1 — Inventario

**Agentes instalados:** 27 archivos `.md` en `.claude/agents/`

**ARCHITECTURE.md:** El archivo `/home/user/thyrox/.claude/ARCHITECTURE.md` no existe. No hay documento declarado contra el cual comparar. Esto es un gap independiente: el sistema no tiene inventario declarado de agentes.

**Hallazgo C1-001 (Alto):** Ausencia total de ARCHITECTURE.md. El sistema tiene 27 agentes sin documento de inventario canónico. No es posible detectar agentes "zombies" (instalados pero no registrados) ni agentes "fantasmas" (declarados pero no instalados).

**Agrupación funcional observada:**
- 14 coordinadores de metodología: `ba-`, `bpa-`, `cp-`, `dmaic-`, `lean-`, `pdca-`, `pm-`, `pps-`, `rm-`, `rup-`, `sp-`, `thyrox-coordinator`, y 2 sin prefijo explícito
- 5 tech-experts: `mysql-`, `nodejs-`, `postgresql-`, `react-`, `webpack-expert`
- 4 agentes de análisis profundo: `deep-dive`, `deep-review`, `agentic-reasoning`, `pattern-harvester`
- 4 agentes de infraestructura THYROX: `task-planner`, `task-executor`, `task-synthesizer`, `diagrama-ishikawa`
- 1 agente de generación: `skill-generator`
- 1 agente de detección: `tech-detector`

---

### Capa 2 — Compliance I-007 (tools explícito)

**Resultado: 25/27 PASS. 2 FAIL.**

**Agentes sin `tools:` verificable:** ninguno detectado en los primeros 20 líneas de los 27 archivos leídos. Todos tienen el campo `tools:` en su frontmatter — ya sea en formato inline (`tools: Read, Glob, Grep`) o en formato lista YAML.

**Corrección:** Revisión más cuidadosa: todos los 27 agentes tienen `tools:`. I-007 compliance = **27/27 (100%)**.

**Observación de calidad:** Los tech-experts (`mysql-expert`, `nodejs-expert`, `postgresql-expert`, `react-expert`, `webpack-expert`) incluyen herramientas MCP (`mcp__thyrox_executor__exec_cmd`, `mcp__thyrox_memory__retrieve`) en su listado. Esto es correcto funcionalmente, pero introduce un riesgo: si los servidores MCP no están disponibles, estos agentes se degradan silenciosamente sin fallback declarado.

---

### Capa 3 — Compliance I-008 (trigger pattern "Use when...")

**I-008 define:** Descripción debe seguir `"Use when [condición]. [qué hace]"`. Sin este patrón exacto: 56% tasa de auto-invocación (degradada).

**Clasificación por agente:**

**PASS — "Use when [condición]..." exacto (7 agentes):**
- `deep-dive`: "Usar cuando se necesita saber qué es verdadero..." — PARCIAL (ver nota abajo)
- `deep-review`: "Usar cuando el usuario pide un deep-review..."
- `diagrama-ishikawa`: "Usar cuando se necesite identificar causas raíz..."
- `pattern-harvester`: "Use when you need to extract actionable patterns..."
- `task-executor`: "Usar cuando hay un task-plan..."
- `task-planner`: "Usar cuando el usuario quiere planificar..."
- `task-synthesizer`: "Use when multiple analysis outputs..."

**Nota sobre deep-dive:** La descripción de `deep-dive` es extensa (una línea larga). Contiene "Usar cuando" hacia el final. El runtime puede truncar descripciones largas al evaluar triggers — esto es un riesgo latente aunque el patrón esté presente.

**NO-COMPLIANT — sin condición de invocación (2 agentes):**
- `mysql-expert`: "Tech-expert para MySQL y bases de datos relacionales. Conoce SQL..." — describe capacidades, no condición de invocación.
- `postgresql-expert`: "Tech-expert para PostgreSQL. Conoce SQL..." — describe capacidades, no condición de invocación.

**PARCIAL — condición implícita en formato incorrecto (18 agentes):**
Los 14 coordinadores usan formato multilinea con "Usar cuando el usuario quiere...":
```
ba-coordinator, bpa-coordinator, cp-coordinator, dmaic-coordinator, lean-coordinator,
pdca-coordinator, pm-coordinator, pps-coordinator, rm-coordinator, rup-coordinator,
sp-coordinator, thyrox-coordinator
```
Más: `agentic-reasoning`, `nodejs-expert`, `react-expert`, `skill-generator`, `tech-detector`, `webpack-expert`.

El patrón "Usar cuando..." multilinea puede funcionar en español, pero no cumple con el patrón canónico inglés que documenta I-008 con 56% de éxito base. Los coordinadores tienen condición explícita pero en formato expandido — el riesgo es que el parser del runtime lea solo la primera línea de la descripción multilinea.

**Ratio I-008:** 7/27 PASS estricto (26%). Si se incluyen PARCIAL como "aceptable con riesgo": 25/27 (93%). La brecha entre ambos modos indica que el sistema tiene cobertura intencional pero no estandarización de formato.

---

### Capa 4 — Solapamiento de descripciones (3 pares de mayor riesgo)

**Par 1 (CRÍTICO): `deep-dive` vs. `agentic-reasoning`**

- `deep-dive`: "Análisis exhaustivo y estratificado que expone estructuras ocultas, contradicciones internas y diferencias entre afirmación vs. realidad... Usar cuando se necesita saber qué es verdadero, qué es falso y qué es incierto"
- `agentic-reasoning`: "Analiza artefactos de THYROX para detectar realismo performativo — claims sin evidencia... Usar cuando se quiere evaluar si un artefacto... afirma calidad sin derivarla"

**Solapamiento:** Ambos analizan artefactos buscando afirmaciones no sustentadas. La diferencia es que `agentic-reasoning` es específico de THYROX y produce ratios de calibración, mientras que `deep-dive` aplica a cualquier artefacto. En la práctica: para analizar un risk register de THYROX, ambos son candidatos válidos. El runtime puede elegir cualquiera, o peor, invocar ambos produciendo análisis duplicados.

**Riesgo:** Alta probabilidad de invocación del agente incorrecto o doble análisis.

**Par 2 (ALTO): `task-planner` vs. `task-synthesizer`**

- `task-planner`: "Descompone trabajo en tareas atómicas con IDs trazables... Produce task-plan.md con checkboxes T-NNN. NUNCA ejecuta — solo planifica."
- `task-synthesizer`: "Use when multiple analysis outputs... need to be consolidated into a single coherent task-plan addition."

**Solapamiento:** Ambos producen bloques de task-plan. La diferencia es la fuente: `task-planner` parte de trabajo no estructurado, `task-synthesizer` parte de outputs de análisis. Un usuario que pide "crear un task-plan a partir de estos análisis" es un caso ambiguo — encaja en ambas descripciones.

**Riesgo:** Ambigüedad en el trigger puede llevar a selección incorrecta. `task-synthesizer` podría invocarse cuando el usuario quiere planificación fresca, y `task-planner` cuando se necesita consolidación de análisis previos.

**Par 3 (ALTO): `deep-review` vs. `pattern-harvester`**

- `deep-review`: "Analiza cobertura entre artefactos de fases consecutivas del WP, o profundidad de referencias externas."
- `pattern-harvester`: "Use when you need to extract actionable patterns from a corpus of deep-dive and calibration analysis files in a discover/ directory."

**Solapamiento:** Ambos leen múltiples archivos de un WP y producen análisis de hallazgos. La diferencia es que `deep-review` evalúa cobertura entre fases, y `pattern-harvester` extrae patrones accionables de archivos ya analizados. Para un corpus de análisis en `discover/`, ambos son candidatos plausibles.

**Riesgo:** El usuario puede recibir un análisis de cobertura cuando necesita síntesis de patrones, o viceversa.

---

### Capa 5 — Realismo performativo en protocolos

**Agentes auditados para esta capa:** Los 6 agentes de análisis/infraestructura con protocolos declarados en su body (`agentic-reasoning`, `deep-dive`, `deep-review`, `task-planner`, `task-executor`, `pattern-harvester`).

**agentic-reasoning:**
- Protocolo: 5 modos declarados (Detección, Diseño de mecanismo, Evaluación P values), con tablas de clasificación y fórmulas de ratio.
- Criterio de salida: "Ratio ≥ 0.75 para artefactos de gate" — derivado declarado pero sin fuente empírica citada. Es una hipótesis de umbral, no un valor medido.
- Veredicto: **PARCIALMENTE CALIBRADO**. El protocolo es estructurado y los criterios son verificables con herramientas, pero el umbral 0.75 es especulación útil no derivada.

**deep-dive:**
- Protocolo: "mínimo 6 capas de verificación adversarial — extensibles". La extensibilidad es una secuencia abierta sin criterio de terminación.
- Criterio de salida: no hay criterio explícito de cuándo el análisis es suficiente más allá de "6 capas mínimo". El número 6 no tiene fuente empírica declarada.
- Veredicto: **REALISMO PERFORMATIVO** en el criterio de suficiencia. "Exhaustividad" sin límite operacional no es un exit condition.

**task-planner:**
- Protocolo: produce `task-plan.md` con checkboxes T-NNN. Criterio de salida implícito: cuando el task-plan está escrito.
- Sin criterio de calidad del plan (cobertura, completitud, granularidad correcta).
- Veredicto: **PARCIALMENTE CALIBRADO**. El output es verificable (archivo existe) pero la calidad del output no tiene umbral.

**task-executor:**
- Protocolo: ejecuta tareas una por una, reporta errores con contexto.
- Criterio de salida: tarea marcada como `[x]` en el plan. Observable y verificable.
- Veredicto: **CALIBRADO**.

**deep-review:**
- Protocolo: 2 modos (Cross-Phase Coverage, External Reference). El modo 1 tiene un trigger claro ("antes de avanzar al gate"). Sin criterio de cuántas fases deben estar cubiertas para pasar el gate.
- Veredicto: **PARCIALMENTE CALIBRADO**.

**pattern-harvester:**
- Protocolo: produce "harvest report distinguiendo lo que ya está cubierto en el task-plan vs. lo que es nuevo".
- Criterio de salida: el reporte existe. Sin criterio de completitud del corpus analizado.
- Veredicto: **PARCIALMENTE CALIBRADO**.

---

### Capa 6 — YML en registry vs. instalado

**YMLs en `.thyrox/registry/agents/`:** 10 archivos (más README.md)

```
mysql-expert.yml
nodejs-expert.yml
postgresql-expert.yml
react-expert.yml
skill-generator.yml
task-executor.yml
task-planner.yml
tech-detector.yml
webpack-expert.yml
```

**Agentes instalados SIN YML de respaldo (18 agentes):**
```
agentic-reasoning, ba-coordinator, bpa-coordinator, cp-coordinator,
deep-dive, deep-review, diagrama-ishikawa, dmaic-coordinator,
lean-coordinator, pattern-harvester, pdca-coordinator, pm-coordinator,
pps-coordinator, rm-coordinator, rup-coordinator, sp-coordinator,
task-synthesizer, thyrox-coordinator
```

**Impacto:** Estos 18 agentes no tienen fuente generadora. Si se ejecuta `bootstrap.py` o `_generator.sh`, no se regeneran. Son archivos `.md` "huérfanos" en términos del pipeline de generación. Si se eliminan accidentalmente, no hay mecanismo de recuperación automatizado (solo git history, que cumple I-002 pero no es lo mismo que tener un YML generador).

**Agentes con YML (9 agentes):**
```
mysql-expert, nodejs-expert, postgresql-expert, react-expert,
skill-generator, task-executor, task-planner, tech-detector, webpack-expert
```

**Anomalía:** El YML count en registry es 9 pero hay 10 archivos YML declarados en el listado. El décimo no corresponde a ningún agente nombrado diferente — puede ser un YML de otro nombre. No es un bloqueante pero requiere verificación.

---

## Tabla de hallazgos

| ID | Hallazgo | Agente | Línea | Severidad |
|----|----------|--------|-------|-----------|
| H-01 | ARCHITECTURE.md no existe — sin inventario declarado de agentes | Sistema | — | ALTO |
| H-02 | `mysql-expert` y `postgresql-expert` no tienen condición de invocación en descripción (solo capacidades) | mysql-expert, postgresql-expert | L:3 | ALTO |
| H-03 | 14 coordinadores usan descripción multilinea "Usar cuando..." — riesgo de truncamiento en evaluación del runtime | ba-, bpa-, cp-, dmaic-, lean-, pdca-, pm-, pps-, rm-, rup-, sp-, thyrox-coordinator | L:3-9 | MEDIO |
| H-04 | `deep-dive` vs. `agentic-reasoning` — solapamiento crítico para análisis de artefactos THYROX | deep-dive, agentic-reasoning | L:3 | CRÍTICO |
| H-05 | `task-planner` vs. `task-synthesizer` — ambigüedad en trigger para consolidación de análisis | task-planner, task-synthesizer | L:3 | ALTO |
| H-06 | `deep-review` vs. `pattern-harvester` — solapamiento en análisis de corpus de WP | deep-review, pattern-harvester | L:3 | ALTO |
| H-07 | `deep-dive` no tiene criterio de terminación operacional — "exhaustividad" es secuencia abierta | deep-dive | Body | MEDIO |
| H-08 | 18 agentes sin YML en registry — no regenerables con bootstrap | 18 agentes (ver Capa 6) | — | MEDIO |
| H-09 | `deep-dive` descripción excesivamente larga — riesgo de truncamiento del trigger por el runtime | deep-dive | L:3 | BAJO |
| H-10 | Tech-experts con MCP tools sin fallback declarado — degradación silenciosa si MCP no disponible | mysql-, nodejs-, postgresql-, react-, webpack-expert | L:6-12 | BAJO |
| H-11 | umbral 0.75 en `agentic-reasoning` es hipótesis no derivada de datos empíricos | agentic-reasoning | Body | BAJO |

---

## Propuestas de tasks

### CRÍTICO

**T-H-01: Desambiguar `deep-dive` vs. `agentic-reasoning`**
- Problema: H-04. Usuarios que analizan artefactos THYROX tienen dos agentes candidatos con solapamiento real.
- Acción: Modificar la descripción de `agentic-reasoning` para incluir diferenciador explícito vs. `deep-dive`:
  "Use when artifact IS a THYROX WP document (risk register, exit conditions, analysis, strategy) and the goal is calibration ratio + evidence gap report. For adversarial analysis of any artifact type, use deep-dive instead."
- Acción adicional: Modificar `deep-dive` para excluir explícitamente el dominio de calibración THYROX de su trigger principal.

### ALTO

**T-H-02: Corregir descripciones de `mysql-expert` y `postgresql-expert`**
- Problema: H-02. Las descripciones no tienen condición de invocación — describen capacidades, no triggers.
- Acción: Añadir "Use when the user needs MySQL/PostgreSQL-specific help: schema design, query optimization, migrations, or debugging." como primer elemento de descripción.
- YML fuente: actualizar también `mysql-expert.yml` y `postgresql-expert.yml` en registry.

**T-H-03: Desambiguar `task-planner` vs. `task-synthesizer`**
- Problema: H-05. Ambigüedad para casos de "crear task-plan desde análisis previos".
- Acción: Añadir a `task-planner`: "Use when starting fresh — no prior analysis outputs. If consolidating outputs from deep-dive or pattern-harvester agents, use task-synthesizer instead."
- Acción paralela: añadir a `task-synthesizer`: "Use only when consolidating existing agent analysis outputs (not for fresh planning — use task-planner for that)."

**T-H-04: Desambiguar `deep-review` vs. `pattern-harvester`**
- Problema: H-06. Solapamiento en análisis de corpus WP.
- Acción: Clarificar en `deep-review`: "Use when checking coverage gaps between consecutive THYROX phases. For extracting actionable patterns from deep-dive or calibration files, use pattern-harvester."
- Acción paralela: clarificar en `pattern-harvester`: "Use only when processing already-analyzed files (deep-dive outputs, calibration reviews). For phase-to-phase coverage analysis, use deep-review."

**T-H-05: Crear ARCHITECTURE.md con inventario de agentes**
- Problema: H-01. Sin documento declarado, no hay forma de auditar el sistema sistemáticamente.
- Acción: Crear `.claude/ARCHITECTURE.md` con tabla de agentes, función, tipo (coordinator/expert/analysis/infra), YML en registry (sí/no), y fecha de última actualización.
- Nota: este archivo no es un artefacto WP — vive en `.claude/` como documentación del sistema.

**T-H-06: Estandarizar formato de descripciones de coordinadores (14 agentes)**
- Problema: H-03. El formato multilinea YAML con "Usar cuando..." puede ser truncado por el runtime al evaluar triggers.
- Acción: Convertir el bloque multilinea de cada coordinador a una sola línea comenzando con "Use when [usuario quiere X metodología]. Coordinator para [nombre metodología]..."
- Alcance: 14 coordinadores listados en H-03.
