```yml
created_at: 2026-04-19 17:19:21
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 3 — DIAGNOSE
author: deep-dive
status: Borrador
version: 1.0.0
veredicto_síntesis: PARCIALMENTE VÁLIDO
saltos_lógicos: 5
contradicciones: 4
engaños_estructurales: 3
```

# Deep-Dive Adversarial — Mapa de Cambios ÉPICA 42

**Artefactos analizados:** 14 archivos (baseline, diagnose, settings.json, bound-detector.py, sync-wp-state.sh, validate-session-close.sh, technical-debt.md, CLAUDE.md, python-mcp.instructions.md, agentic-reasoning.md, registry/agents/README.md, workflow-standardize/SKILL.md, focus.md, ROADMAP.md) más task-executor.yml, task-executor.md, hook-output-control.md, bootstrap.py (verificaciones cruzadas).

---

## CAPA 1: Lectura inicial — qué propone el mapa

El mapa de 20 cambios organiza la implementación en 9 capas (0–8), planteando:
- Capa 0: `bound-detector.py` ya ejecutado como precondición
- Capas 1–3: cambios en scripts e infraestructura (docstring, sync-wp-state, TD-040, TD-042)
- Capas 4–5: nuevo archivo `agentic-python.instructions.md` + nuevo agente `agentic-validator.yml/.md`
- Capa 6: 5 documentos de patrones en `discover/patterns/`
- Capa 7: actualización de estado operacional (focus, project-state, ROADMAP)
- Capa 8: actualización de `workflow-standardize/SKILL.md`

La premisa del mapa: los 30 anti-patrones descubiertos en Stage 1 no están cubiertos en el sistema, y estos 20 cambios los cubren.

---

## CAPA 2: Aislamiento de capas

### Frameworks teóricos
- El diagnóstico identifica 3 ejes causales con 5-Whys: framework metodológico correcto y bien aplicado.
- Los 30 AP catalogados en baseline son verificables (tienen capítulo fuente, severidad, descripción).
- El score 0/30 de cobertura es una observación directa con evidencia.

### Aplicaciones concretas
- El mapa convierte el diagnóstico en 20 cambios: la derivación es en su mayoría correcta, pero con 5 saltos que se identifican en Capa 3.

### Números específicos
- "5 documentos en discover/patterns/" — fuente: el propio mapa (no verificado en disco).
- "23 agentes nativos" — verificable: confirmado por focus.md.
- "30 anti-patrones" — verificable: listados en baseline con ID y capítulo.

### Afirmaciones de garantía
- "Capa 0: bound-detector.py — EJECUTADO" — afirma estado sin citar evidencia de cuándo/cómo.
- El mapa implica que los 20 cambios cubren los 30 AP — pero la cobertura parcial no se deriva explícitamente.

---

## CAPA 3: Saltos lógicos

```
SALTO-01: [bound-detector.py ejecutado] → [Capa 1 puede proceder]
Ubicación: Capa 0 del mapa
Tipo: conclusión especulativa
Tamaño: medio
Justificación faltante: ¿Qué define "ejecutado"? ¿Ejecutado como PreToolUse hook en settings.json
  (que ya existe y está configurado) o ejecutado manualmente? Settings.json confirma que el hook
  ya está en PreToolUse desde antes de ÉPICA 42. La Capa 0 no es un cambio — es el estado previo.
  Pero si "ejecutado" significa "el docstring fue actualizado" (Cambio 1), eso es circular: el
  docstring es parte de Capa 1, no de Capa 0.
```

```
SALTO-02: [5 documentos en discover/patterns/] → [Eje 3 cubierto]
Ubicación: Capa 6 del mapa
Tipo: extrapolación sin datos
Tamaño: crítico
Justificación faltante: El directorio discover/patterns/ NO EXISTE en disco. El glob confirma
  que todos los archivos de Stage 1 están directamente en discover/ (90+ archivos). El mapa
  propone crear el directorio y los 5 documentos como parte de Capa 6, pero no especifica
  cuáles 5 de los 30 AP serán documentados. La selección AP-01, 02, 16, 17, 18 se menciona
  en el mapa como "5 patrones seleccionados" — pero ningún artefacto existente (baseline ni
  diagnose) deriva por qué estos 5 y no los otros CRÍTICOS (AP-25 SISTÉMICO o AP-07, AP-09,
  AP-26 ALTOS con mayor impacto operacional).
```

```
SALTO-03: [agentic-validator.yml sin model:] → [bootstrap.py genera agente correcto]
Ubicación: Capa 3, Cambio 5 del mapa
Tipo: analogía sin derivación
Tamaño: medio
Justificación faltante: El mapa señala que agentic-validator.yml no debe tener model:. La
  evidencia confirma que el README del registry lo prohíbe, y que bootstrap.py en
  generate_agent_md() explícitamente no propaga model: (comentario "NOTA: model NO se incluye").
  Este salto es en realidad CORRECTO. Sin embargo, el cambio 6 del mapa ("flujo registry →
  bootstrap") es donde el salto real ocurre: el mapa da por sentado que bootstrap.py genera
  agentic-validator correctamente desde el YML, pero agentic-validator.yml NO EXISTE todavía
  en el registry (verificado con Glob). El flujo no puede verificarse porque el archivo fuente
  no existe aún.
```

```
SALTO-04: [3 ejes causales diagnosticados] → [20 cambios los resuelven]
Ubicación: Estructura global del mapa
Tipo: extrapolación sin datos
Tamaño: medio
Justificación faltante: El diagnose identifica 3 ejes con soluciones específicas:
  Eje 1 → agentic-python.instructions.md (Cambios 8+9)
  Eje 2 → agentic-validator.md (Cambios 5, 10, 11)
  Eje 3 → patrones consultables (Cambio 12-16)
  Pero los Cambios 1-4, 7, 17-20 no derivan de ninguno de los 3 ejes. Son cambios de
  infraestructura/documentación que el mapa agrega sin especificar a qué causa raíz responden.
  Son cambios potencialmente válidos, pero su inclusión en el mapa ÉPICA 42 requiere
  justificación de por qué pertenecen a esta ÉPICA y no a otra.
```

```
SALTO-05: [P0→P4 priorización] → [orden de ejecución correcto]
Ubicación: Estructura del mapa (orden de capas)
Tipo: analogía sin derivación
Tamaño: crítico
Justificación faltante: El mapa asigna prioridades (implícitas en el número de capa)
  sin verificar las dependencias reales. La verificación de dependencias en Capa 5 revela
  que el orden tiene una dependencia circular no declarada: para que bootstrap.py genere
  agentic-validator.md (Cambio 11), primero debe existir agentic-validator.yml (Cambio 10).
  Ambos están en Capa 5. Pero el mapa no distingue cuál es prerrequisito del otro dentro
  de la misma capa. Adicionalmente, CLAUDE.md @import (Cambio 9, Capa 4) no puede verificarse
  hasta que agentic-python.instructions.md exista (Cambio 8, también Capa 4) — también correcto
  pero no explicitado como dependencia secuencial dentro de la capa.
```

---

## CAPA 4: Contradicciones

```
CONTRADICCIÓN-01:
Afirmación A: "Capa 0: bound-detector.py — EJECUTADO" (Mapa, Capa 0)
Afirmación B: "Capa 1: (1) bound-detector.py docstring" — Cambio 1 del mapa pendiente
Por qué chocan: Si bound-detector.py está en Capa 0 como EJECUTADO (ya hecho), no puede
  ser el objeto de un cambio en Capa 1 (pendiente). O ya tiene el docstring correcto (Capa 0
  es un estado, no una tarea) o el docstring necesita cambio (Capa 1 es una tarea pendiente).
  Las dos afirmaciones usan el mismo archivo en estados incompatibles.
Cuál prevalece: El docstring de bound-detector.py fue leído y es funcional pero no menciona
  explícitamente su rol en ÉPICA 42 ni los patrones que detecta. Prevalece: Capa 0 como
  "estado del hook" (ya funciona), Capa 1 como "actualizar docstring" (tarea real). La
  ambigüedad del término "ejecutado" genera la contradicción.
```

```
CONTRADICCIÓN-02:
Afirmación A: TD-040 describe: "Si @imports no funciona para .instructions.md, migrar a
  .claude/rules/ (mecanismo oficial de Project Rules)" (technical-debt.md, TD-040)
Afirmación B: Cambio 3 del mapa: "verificar @imports TD-040" → Cambio 4: "migrar guidelines
  a rules/ si falla" — presentado como decisión condicional
Por qué chocan: El mapa propone verificar primero y migrar si falla. Pero TD-040 lleva en
  estado "En progreso" desde FASE 36 sin resolución documentada. La verificación ya debería
  haber ocurrido en ÉPICA 41 o antes, ya que los @imports fueron agregados en FASE 36
  (hace múltiples ÉPICAs). El mapa lo trata como trabajo nuevo cuando es deuda técnica
  acumulada sin resolver. La "verificación" no es un cambio de ÉPICA 42 — es completar
  TD-040 que está bloqueado.
Cuál prevalece: TD-040 prevalece: es deuda técnica pre-existente. Los Cambios 3+4 son
  válidos como acciones de cierre de TD-040, pero no son "cambios de ÉPICA 42" en el
  sentido de trabajo nuevo derivado del diagnóstico de Stage 3.
```

```
CONTRADICCIÓN-03:
Afirmación A: task-executor.yml tiene `model: claude-sonnet-4-6` (registry/agents/task-executor.yml)
Afirmación B: El README del registry declara `model: PROHIBIDO — bootstrap.py no lo propaga a
  agentes nativos` (registry/agents/README.md)
  Afirmación C: El mapa, Cambio 5, identifica agentic-validator.yml como problema por no
  tener model: — pero el verdadero problema es que task-executor.yml SÍ TIENE model: contra
  la spec.
Por qué chocan: El mapa identifica como cambio "agentic-validator.yml sin model:" (correcto,
  porque el archivo no existe aún y debe crearse sin model:). Pero ignora que task-executor.yml
  — que sí existe — viola la misma regla (TD-037, pendiente). El mapa tiene coherencia
  parcial: señala el patrón correcto para el archivo nuevo pero no lo aplica retroactivamente
  al archivo existente que ya viola la regla. TD-037 no está en el mapa de 20 cambios.
Cuál prevalece: Ambas afirmaciones son verdaderas simultáneamente. El mapa es incompleto —
  debería incluir como cambio resolver TD-037 para task-executor.yml (y otros 5 YMLs afectados).
```

```
CONTRADICCIÓN-04:
Afirmación A: sync-wp-state.sh — el mapa (Capa 1, Cambio 2) plantea decidir si necesita cambio
Afirmación B: sync-wp-state.sh recibe JSON del evento PostToolUse Write, extrae file_path,
  y actualiza now.md::current_work. El hook en settings.json usa:
  `bash "MAIN/.claude/scripts/sync-wp-state.sh"` — pero el script usa `cat` (INPUT=$(cat))
  para leer stdin. Sin embargo, `MAIN` se resuelve via `git rev-parse --git-common-dir` con
  potencial fallo si no hay repositorio git. El script tiene exit 0 implícito en todos los
  paths de error (si FILE_PATH no contiene .thyrox/context/work/).
Por qué chocan: El mapa presenta sync-wp-state.sh como "decisión pendiente", cuando la
  evidencia del archivo mismo muestra que el script funciona correctamente para su propósito
  declarado (sincronizar current_work en now.md). hook-output-control.md confirma que
  PostToolUse recibe el JSON del evento con tool_input.file_path. El script lo extrae
  correctamente. No hay necesidad de cambio — es un FALSO POSITIVO como cambio pendiente.
  La única mejora posible sería el manejo del MAIN path, pero eso es mejora de robustez,
  no corrección de bug.
Cuál prevalece: sync-wp-state.sh NO necesita cambio funcional. El mapa genera trabajo
  fantasma al incluirlo como "decisión".
```

---

## CAPA 5: Engaños estructurales

| Patrón | Instancia en el mapa | Efecto |
|--------|---------------------|--------|
| **Credibilidad prestada** | El mapa invoca los 30 AP del baseline como si la mera existencia del catálogo garantizara que los 20 cambios los cubren. El baseline dice 0/30 cubiertos; el mapa no deriva cuántos quedan cubiertos después de los 20 cambios. | Crea apariencia de resolución completa sin derivarla. |
| **Limitación enterrada** | El hecho de que discover/patterns/ no existe y los 5 patrones no están seleccionados aparece solo cuando se verifica en disco — el mapa lo presenta como si el directorio y la selección ya estuvieran resueltos. | Los Cambios 12-16 son trabajo no especificado presentado como trabajo definido. |
| **Validación en contexto distinto** | La corrección del flujo registry→bootstrap se asume válida para agentic-validator porque funciona para task-executor. Pero bootstrap.py tiene un camino específico: primero busca en REGISTRY_DIR/agents/{tech}-expert.yml. agentic-validator NO sigue la nomenclatura tech-expert, lo que puede requerir ajuste en bootstrap.py (que solo tiene lógica para `install_tech_agent` buscando `{tech}-expert.yml`). | El flujo puede no funcionar para agentic-validator sin modificación de bootstrap.py. |

---

## CAPA 6: Veredicto

### VERDADERO

| Claim | Evidencia | Fuente |
|-------|-----------|--------|
| bound-detector.py ya funciona como PreToolUse hook | settings.json confirma `"matcher": "Agent"` → `"command": "python3 .claude/scripts/bound-detector.py"` | settings.json:78-85 |
| agentic-validator.yml no debe tener model: | README registry: "model: PROHIBIDO" + bootstrap.py generate_agent_md() no lo propaga | registry/README.md + bootstrap.py:224-238 |
| sync-wp-state.sh funciona correctamente para su propósito | Script lee stdin correctamente, extrae file_path, actualiza now.md. hook-output-control.md confirma PostToolUse envía tool_input.file_path | sync-wp-state.sh + hook-output-control.md |
| Los 30 AP tienen cobertura 0/30 en el sistema actual | python-mcp.instructions.md tiene 8 reglas todas de MCP, ninguna de agentic AI. No existe agentic-python.instructions.md. No existe agentic-validator.md | python-mcp.instructions.md (8 reglas) + Glob confirmado |
| task-executor.yml viola la regla model: prohibido | El YML tiene `model: claude-sonnet-4-6` explícitamente | task-executor.yml:7 |
| validate-session-close.sh Check 3 usa criterio task-plan activo | El script busca `*-task-plan.md` con `- [ ]` para determinar WPs activos | validate-session-close.sh:79-85 |
| bootstrap.py es idempotente para tech-experts | Función `install_tech_agent` verifica existencia antes de sobreescribir | bootstrap.py:273 |
| discover/patterns/ no existe | Glob de discover/** no retorna ningún subdirectorio patterns/ | Glob ejecutado |
| agentic-validator.yml no existe en registry | Glob de registry/agents/*.yml no lo muestra | Glob ejecutado |

### FALSO

| Claim | Por qué es falso | Contradicción/evidencia |
|-------|-----------------|------------------------|
| sync-wp-state.sh necesita cambio (Cambio 2) | El script funciona correctamente. Su lógica es correcta para el evento PostToolUse Write. No hay bug documentado. | sync-wp-state.sh leído completo — lógica correcta |
| Los 5 patrones (AP-01, 02, 16, 17, 18) están en discover/patterns/ | El directorio no existe en disco. Ningún archivo de patrón existe allí. | Glob de discover/patterns/ → No files found |
| Capa 0 está "ejecutada" como bloque completo previo | El Cambio 1 (docstring de bound-detector.py) está pendiente — el hook funciona pero el docstring de ÉPICA 42 no está actualizado | bound-detector.py docstring no menciona ÉPICA 42 ni AP-01..AP-30 |
| bootstrap.py genera agentic-validator.md correctamente con el flujo actual | bootstrap.py solo tiene `install_tech_agent` que busca `{tech}-expert.yml`. agentic-validator no es un tech-expert. El flujo requiere ajuste en bootstrap.py o instalación manual | bootstrap.py:266-311 — no hay ruta para agentes no-tech-expert |

### INCIERTO

| Claim | Por qué no es verificable | Qué necesitaría |
|-------|--------------------------|----------------|
| Los @imports en CLAUDE.md cargan las guidelines activamente | TD-040 lleva "En progreso" desde FASE 36 sin resolución documentada. No hay sesión de prueba registrada que confirme la carga. | Una sesión de prueba donde Claude aplica reglas de Node.js sin instrucción explícita |
| El agente agentic-validator detectará correctamente AP-01..AP-30 | El agente no existe. Su efectividad depende del catálogo que se embeba en su system_prompt. | Creación del agente + prueba sobre código con AP conocidos |
| validate-session-close.sh Check 3 tiene comportamiento correcto con TD-042 | TD-042 describe verificación PAT-004 ausente. El script actual tiene lógica de task-plan pero no verifica commits vs checkboxes. El mapa incluye este como cambio pero no especifica la implementación. | Implementación + prueba del Check adicional |

### Patrón dominante

**Mezcla de trabajo nuevo y deuda técnica pre-existente sin distinguir su naturaleza.**

El mapa de 20 cambios presenta como "cambios de ÉPICA 42" una combinación de:
1. Trabajo real derivado del diagnóstico Stage 3 (Cambios 8, 9, 10, 11, 12-16) — válido
2. Cierre de TDs pre-existentes (TD-040, TD-042) que no derivan del diagnóstico agentic AI — válidos como trabajo pero mal clasificados como "de ÉPICA 42"
3. Trabajo fantasma (sync-wp-state.sh) — incluido sin necesidad real
4. Trabajo no especificado (discover/patterns/ sin selección de APs) — presentado como definido

Esto opera en el mapa porque el número "20" crea apariencia de exhaustividad, pero al menos 3-4 de esos 20 no tienen justificación derivada del diagnóstico y uno (sync-wp-state.sh) es directamente innecesario.

---

## Respuestas a preguntas específicas

### 1. Archivos fuera de la lista que también necesitan cambio

**ARCHITECTURE.md** — Existe. No fue listado. El diagnóstico dice que los agentes ahora incluyen una familia nueva de "domain pattern validators" (agentic-validator). ARCHITECTURE.md describe la arquitectura de agentes como dos familias (methodology coordinators + tech experts). Si se crea agentic-validator, ARCHITECTURE.md necesita actualizarse para documentar la tercera familia. **Cambio faltante confirmado.**

**README.md** — Existe. Contiene referencias a los 23 agentes del sistema. Si se agrega agentic-validator (Cambio 11), el README necesita actualización del conteo y descripción. **Cambio faltante menor pero real.**

**CONTRIBUTING.md** — No existe en el repo (Glob no lo retorna entre los README.md encontrados). No aplica.

**references/hook-authoring.md** — No existe como tal (el archivo relevante es `hook-output-control.md` que sí existe). No hay cambio faltante aquí.

**TD-037 (task-executor.yml y otros 5 YMLs con model: prohibido)** — No está en el mapa. Si se crea agentic-validator.yml correctamente sin model:, y task-executor.yml sigue teniendo model:, la inconsistencia es visible. **TD-037 debería ser parte del mapa o tener un cambio explícito.** INCIERTO si es scope de ÉPICA 42 o de otra ÉPICA.

### 2. Los 5 patrones seleccionados (AP-01, 02, 16, 17, 18) — ¿selección correcta?

La selección es PARCIALMENTE VÁLIDA pero tiene un problema de criterio no declarado.

**Justificación de los 5 seleccionados:**
- AP-01, 02: CRÍTICOS, callbacks ADK — son los más difíciles de detectar, error de implementación profundo
- AP-16, 17: CRÍTICOS, HITL falso — mayor riesgo operacional en producción
- AP-18: CRÍTICO, Import roto — produce fallo inmediato y visible

**APs de igual o mayor impacto práctico omitidos:**
- AP-25 (SISTÉMICO): "Named Mechanism vs. Implementation" — afecta 9/10 capítulos, es el patrón más prevalente de la serie. No incluirlo en los 5 patrones iniciales es una omisión significativa.
- AP-09, AP-12 (ALTO): `json.loads` sin try/except — fallo garantizado con temperature>0. Son errores de implementación comunes y de alta probabilidad de ocurrencia en código nuevo.
- AP-07 (ALTO): `temperature=1` para clasificadores — directamente relevante si el sistema THYROX implementa routing agentic.

El criterio implícito de la selección parece ser "APs CRÍTICOS por severidad". Pero AP-25 es SISTÉMICO (categoría más grave que CRÍTICO en términos de prevalencia) y no está incluido.

**Veredicto:** La selección cubre los 5 CRÍTICOS correctamente pero omite el patrón SISTÉMICO más prevalente (AP-25). Para un conjunto inicial de 5 patrones de referencia, sustituir AP-18 (que es detectable automáticamente por linters de import) por AP-25 (que requiere comprensión semántica) daría mayor valor práctico.

### 3. sync-wp-state.sh — ¿necesita cambio?

**NO necesita cambio.** Evidencia:

El script funciona correctamente según su spec:
- Lee JSON de stdin via `INPUT=$(cat)` — correcto para PostToolUse
- Extrae `file_path` via jq con fallback python3 — robusto
- Filtra solo archivos de `.thyrox/context/work/` — correcto
- Actualiza `current_work` y `updated_at` en now.md — correcto
- Registra en `phase-history.jsonl` — funcionalidad de observabilidad

`hook-output-control.md` confirma que PostToolUse recibe `tool_input.file_path` en el JSON del evento. El script lo extrae correctamente.

La única debilidad es el path de MAIN via `git rev-parse --git-common-dir` que puede fallar fuera de un repo git — pero el script tiene `|| echo '.'` como fallback, y el proyecto es siempre un repo git. Esta no es una condición de fallo real.

**El Cambio 2 del mapa es un FALSO POSITIVO.**

### 4. ¿bootstrap.py funciona correctamente para generar agentic-validator?

**NO con el flujo actual.** Evidencia:

bootstrap.py tiene dos rutas de instalación:
- `install_core_agents()` — para los 4 core agents (task-planner, task-executor, tech-detector, skill-generator). Busca archivos ya existentes en `.claude/agents/`. No genera nada.
- `install_tech_agent(tech, ...)` — para tech-experts. Busca `registry/agents/{tech}-expert.yml`. El nombre de patrón es `{tech}-expert`.

`agentic-validator` no sigue ninguno de estos patrones:
- No es un core agent (no está en `CORE_AGENTS = [...]`)
- No es un tech-expert (el YML debería llamarse `agentic-validator-expert.yml` para que bootstrap.py lo encuentre, lo cual sería nombre incorrecto)

bootstrap.py no tiene una ruta genérica para agentes que no son tech-experts. El flujo de `install_tech_agent` llama con `REGISTRY_DIR / "agents" / f"{tech}-expert.yml"` — si el agente se llama `agentic-validator`, bootstrap.py buscaría `agentic-validator-expert.yml`, no `agentic-validator.yml`.

**El Cambio 6 ("flujo registry→bootstrap") requiere modificación de bootstrap.py para añadir soporte de instalación de agentes no-tech-expert desde YML, o bien el agente debe instalarse manualmente (equivalente al patrón de coordinators documentado en bootstrap.py:46-66).**

La nota en bootstrap.py (líneas 46-66) sobre coordinators dice explícitamente que los agentes con lógica compleja NO se generan dinámicamente — se mantienen manualmente. `agentic-validator` podría seguir el mismo patrón: creación directa de `.claude/agents/agentic-validator.md` sin pasar por bootstrap.py.

**Veredicto sobre bootstrap.py:** Funciona correctamente para su scope actual (tech-experts). No está roto. Pero el mapa asume que funciona para agentic-validator sin verificar si eso es cierto — y no lo es.

### 5. ¿El orden de prioridades P0→P4 es correcto?

El orden tiene dependencias no declaradas que lo invalidan parcialmente:

**Dependencias críticas no explicitadas:**

| Par | Dependencia real | Problema en el mapa |
|-----|-----------------|-------------------|
| Cambio 8 → Cambio 9 | `agentic-python.instructions.md` debe existir antes de agregar @import en CLAUDE.md | El mapa los pone en la misma Capa 4 sin orden interno |
| Cambio 10 → Cambio 11 | `agentic-validator.yml` debe existir antes de que bootstrap.py lo procese | El mapa los pone en la misma Capa 5 sin orden interno |
| Cambios 10+11 → bootstrap.py actualizado | bootstrap.py no puede procesar agentic-validator.yml sin modificación | El mapa no incluye modificar bootstrap.py |
| Cambios 12-16 → selección de APs | Los 5 documentos de patrones no pueden escribirse sin decidir cuáles son | El mapa no registra que la selección no está hecha |

**El P0→P4 como esquema de prioridad es correcto en concepto** (infraestructura antes que contenido, contenido antes que documentación de estado). **Pero la granularidad dentro de las capas es insuficiente** para ejecutar sin ambigüedad.

**Orden correcto sugerido con dependencias explícitas:**

```
P0: bound-detector.py docstring (1) — independiente, no bloquea nada
P1: TD-040 verificación @imports (3) → si falla: migración a rules/ (4) [secuencial]
P2: validate-session-close.sh TD-042 (7) — independiente de los otros
P3: agentic-python.instructions.md (8) → CLAUDE.md @import (9) [secuencial obligatorio]
P4: agentic-validator.yml (10) → [decisión: bootstrap.py o instalación manual] → agentic-validator.md (11)
P5: Selección de 5 APs → discover/patterns/ (12-16) [requiere decisión previa]
P6: focus.md (17) → project-state.md (18) → ROADMAP.md (19) [orden convencional]
P7: workflow-standardize/SKILL.md (20) — no tiene dependencias técnicas

OMITIR: sync-wp-state.sh (2) — no necesita cambio
AGREGAR: ARCHITECTURE.md — tercera familia de agentes
AGREGAR: README.md — conteo actualizado de agentes
AGREGAR: Decisión sobre bootstrap.py — instalación manual vs. extensión del script
```

### 6. Cambios en la lista que son falsos positivos

**FALSO POSITIVO confirmado:**

- **Cambio 2: sync-wp-state.sh** — El script funciona correctamente. No hay bug documentado, no hay gap funcional, no hay referencia en los TDs activos. Su inclusión en el mapa no tiene evidencia de soporte.

**FALSO POSITIVO probable (sin evidencia de necesidad en ÉPICA 42):**

- **Cambio 1: bound-detector.py docstring** — El docstring actual describe correctamente el propósito del script. Actualizarlo para mencionar ÉPICA 42 o los AP es mejora cosmética, no funcional. No hay ningún gap que este cambio resuelva.

**Trabajo correctamente clasificado pero con scope incompleto:**

- **Cambios 3+4 (TD-040):** Son válidos como cierre de TD-040, pero TD-040 no deriva del diagnóstico Stage 3 de ÉPICA 42. Son deuda técnica independiente. Incluirlos en ÉPICA 42 puede diluir el scope o crear tracking confuso.

---

## Síntesis ejecutiva

**Veredicto global: PARCIALMENTE VÁLIDO**

El mapa tiene una base de diagnóstico sólida (los 30 AP, los 3 ejes causales) y un conjunto núcleo de cambios correctos (Cambios 8, 9, 10, 11, 17, 18, 19, 20). Los problemas son:

1. **1 falso positivo confirmado** (sync-wp-state.sh no necesita cambio)
2. **1 dependencia no resuelta** (bootstrap.py no genera agentic-validator sin modificación o decisión explícita)
3. **1 directorio inexistente** (discover/patterns/ + selección de APs no realizada)
4. **2 cambios faltantes** (ARCHITECTURE.md, decisión bootstrap.py vs. instalación manual)
5. **1 TD ignorado** (TD-037: task-executor.yml y 5 YMLs con model: prohibido)
6. **1 selección de AP con omisión** (AP-25 SISTÉMICO ausente de los 5 patrones)

El mapa es ejecutable si se aplican estas correcciones — los cambios núcleo son válidos y la lógica de implementación es correcta. Los fallos no invalidan la dirección general sino que la incompletan.

### Nota de completitud del input

El análisis se realizó sobre los 14 artefactos especificados más 4 verificaciones cruzadas (task-executor.yml, task-executor.md, hook-output-control.md, bootstrap.py). El directorio discover/patterns/ fue verificado en disco — no existe. El archivo agentic-validator.yml fue verificado en disco — no existe. Estas verificaciones son determinantes para los hallazgos de Capa 4 y las respuestas a preguntas 3, 4 y 6.
