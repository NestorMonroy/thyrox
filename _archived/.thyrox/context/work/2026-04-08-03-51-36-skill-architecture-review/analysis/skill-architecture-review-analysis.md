```yml
type: Análisis
work_package: 2026-04-08-03-51-36-skill-architecture-review
created_at: 2026-04-08 03:51:36
purpose: Determinar si pm-thyrox debe permanecer como SKILL o migrar a otra arquitectura
reversibility: reversible
```

# Análisis: Revisión Arquitectónica de pm-thyrox SKILL

## 1. Objetivo y por qué importa

El análisis SKILL-vs-AGENT de FASE 20 concluyó que pm-thyrox debería ser un "thin orchestrator SKILL".
Esa conclusión tenía **dos errores de framing** identificados por el usuario con evidencia externa:

1. Asumió que SKILLs son confiables — no lo son (triggering probabilístico)
2. Asumió que SKILL es "la única opción viable" — CLAUDE.md es una alternativa más confiable

**Objetivo:** Producir una decisión arquitectónica fundamentada (ADR) sobre el mecanismo correcto
para pm-thyrox, con evidencia documentada de las limitaciones de cada alternativa.

---

## 2. Evidencia externa incorporada

### 2.1 Artículo: "The Ultimate Guide to Claude Code Skills" (Mar 15, 2026)

Fuente: artículo publicado en Substack, basado en análisis de 200+ skills en docenas de repositorios.

Hallazgos clave con evidencia empírica:

**H1 — Triggering probabilístico**
> "Skills are not deterministic. You can write the perfect skill, install it correctly, name it beautifully — and Claude Code might just... not use it."
> Evidencia: 20 prompts que deberían disparar una CPO review skill → 0 disparos.

**H2 — SKILLs como prompt injection**
> "Skills are prompt injections. That's it. They're markdown files that get loaded into Claude's context when triggered. Nothing more magical than that."
> Evidencia: 40 de 47 skills instaladas empeoraron el output vs vanilla Claude Code.

**H3 — CLAUDE.md como alternativa superior en simplicidad**
> "Why not just stick with a well-written system prompt in your CLAUDE.md? It's simpler, always loads, doesn't have trigger reliability issues, and is easier to iterate on."

**H4 — El 20% que funciona tiene una condición**
> "That remaining 20% — the skills built by people who actually know the domain, who've iterated on evaluation, who've tested edge cases — can produce output that's measurably sharper."
> Condición: domain expertise + iteración sobre evaluación + testing de edge cases.

**H5 — Evaluación ausente en el ecosistema**
> "Until recently, there was no built-in way to benchmark a skill against baseline Claude Code output. You'd install a skill, use it for a week, and have a vague feeling that it might be better."

### 2.2 Análisis de hallazgos previos (contexto de esta sesión)

**H-API — PTC y Tool Search son superiores pero no disponibles en Claude Code**
Anthropic tiene Tool Search Tool + Programmatic Tool Calling (PTC) en la API.
PTC: una sola sesión Python puede orquestar 50 herramientas sin round-trips adicionales.
Estado: beta en API, **no disponible en Claude Code Web**.
Implicación: la limitación es de producto, no arquitectónica — puede cambiar.

**H-SCALE — Truncación de descripciones al escalar**
El presupuesto de context para SKILL descriptions = ~1% del context window, asignado dinámicamente.
THYROX actual: 16 skills (1 pm-thyrox + 7 tech + 8 workflow).
En este rango, la truncación de keywords puede ya estar ocurriendo.

---

## 3. Estado actual de la arquitectura — COMPLETO

El diagrama original omitió una capa crítica: los **hooks**. La arquitectura real tiene 5 capas:

```
CAPA 0 — Hooks del sistema (100% determinísticos, ejecutados por el harness)
│
├─ SessionStart: session-start.sh
│   └─ Imprime: WP activo + fase actual + próxima tarea + tech skills
│   └─ DETERMINÍSTICO — se ejecuta siempre, sin probabilidad
│
└─ Stop: stop-hook-git-check.sh
    └─ Verifica commits sin push → bloquea si hay trabajo sin pushear
    └─ DETERMINÍSTICO — Claude no puede ignorarlo

CAPA 1 — Siempre en contexto (cargado en cada sesión)
│
└─ CLAUDE.md (~80 líneas útiles)
    └─ Flujo de sesión: "Invocar pm-thyrox antes de trabajar"
    └─ Referencia a state files: focus.md + now.md

CAPA 2 — On-demand: invocación por SKILL tool (probabilística)
│
└─ pm-thyrox SKILL (~430+ líneas)
    └─ Lógica completa de 7 fases (Phase 1..7), gates, manifest, calibración
    └─ PROBABILÍSTICA — Claude decide si invocarlo basado en pattern-matching

CAPA 3 — On-demand: invocación por slash command (determinística si el usuario la escribe)
│
└─ /workflow_analyze, /workflow_plan, /workflow_execute ... (8 commands, ~40-50 líneas c/u)
    └─ Lógica phase-specific — DESACTUALIZADOS vs SKILL.md
    └─ DETERMINÍSTICA si el usuario escribe /workflow_analyze — no depende de Claude

CAPA 4 — Subprocesos: lanzados por Claude (independientes)
│
└─ Agentes nativos: task-executor, task-planner, tech-detector, Explore, etc.
    └─ Corren en contexto separado, devuelven resultado
    └─ DETERMINÍSTICOS una vez lanzados — el lanzamiento sí depende de Claude
```

**Observación crítica que faltaba:** Los **hooks (Capa 0)** son el único mecanismo
100% determinístico disponible en Claude Code Web. session-start.sh ya actúa como
"recordatorio forzado" que compensa la probabilística de la SKILL.

**El verdadero flujo de confiabilidad actual:**
1. Hook (determinístico) → muestra WP activo y dice "invocar pm-thyrox"
2. CLAUDE.md (siempre cargado) → repite la instrucción
3. SKILL (probabilística) → contiene la lógica detallada

Capas 1+2 compensan la debilidad de Capa 2. Es una arquitectura de compensación, no de diseño.

---

## 3b. La confusión conceptual: ¿son lo mismo workflow_*, Phase en SKILL y agentes?

**No. Son 4 cosas distintas que representan el mismo concepto (SDLC phases) en capas diferentes.**

### Mapa de equivalencias y diferencias

| Elemento | Dónde vive | Tipo | Quien lo activa | Contexto de ejecución | Actualizado |
|----------|-----------|------|----------------|----------------------|-------------|
| `Phase 1: ANALYZE` en SKILL.md | Capa 2 (SKILL) | Texto inyectado | Claude (probabilístico) | Sesión principal | ✓ Sí — FASE 19+20 |
| `/workflow_analyze` | Capa 3 (command) | Texto inyectado | Usuario (determinístico) | Sesión principal | ✗ Desactualizado |
| `Agent(task-executor)` | Capa 4 (agente) | Subproceso | Claude (determinístico) | Contexto propio, aislado | ✓ Sí |
| `Phase N` (concepto) | Mental model | Abstracción | — | — | — |

### Lo que hace cada uno

**Phase N en SKILL.md:**
- Es una **sección de texto** dentro del markdown de pm-thyrox
- Cuando Claude invoca el Skill tool, ese texto se inyecta en el contexto de la sesión
- Claude lo lee y lo sigue como instrucciones
- Contiene: qué hacer, en qué orden, qué artefactos crear, cuándo detenerse
- Ejemplo: `Phase 1: ANALYZE` → 9 pasos + gate humano + exit criteria

**`/workflow_analyze` command:**
- Es un **archivo markdown separado** en `.claude/commands/workflow_analyze.md`
- Cuando el usuario escribe `/workflow_analyze`, ese markdown se inyecta en el contexto
- Debería contener la misma lógica que `Phase 1: ANALYZE` en SKILL.md
- **PROBLEMA:** no la contiene — fue creado antes de FASE 19 y no tiene gates, manifest, calibración
- La instrucción llega al contexto de la misma manera (texto inyectado), pero activada de forma diferente

**Agente nativo (e.g., `task-executor`):**
- Es un **subproceso completamente separado** lanzado con `Agent("task-executor")`
- Tiene su propio contexto, sus propias herramientas, su propia memoria
- NO sabe qué hay en pm-thyrox SKILL a menos que su definición lo incluya explícitamente
- Ejecuta tareas atómicas (T-NNN) dentro de una fase, no la fase completa
- Es un ejecutor, no un orquestador de fase

### La superposición problemática

```
"Ejecutar Phase 1: ANALYZE"
         │
         ├─ Opción A: Claude ya tiene pm-thyrox SKILL en contexto
         │    → Sigue las instrucciones de Phase 1 de SKILL.md
         │    → Depende de que la SKILL se haya invocado correctamente
         │
         ├─ Opción B: Usuario escribe /workflow_analyze
         │    → Claude recibe las instrucciones de workflow_analyze.md
         │    → Instrucciones DIFERENTES (desactualizadas, sin gates)
         │    → Mismo resultado esperado, diferente calidad de instrucción
         │
         └─ Opción C: No hay ninguno de los dos
              → Claude improvisa "ANALYZE" basado en su conocimiento general
              → Resultado variable, sin Stopping Point Manifest, sin artefactos correctos
```

**Este es el gap real:** las 3 opciones para ejecutar Phase 1 producen resultados distintos.
La arquitectura correcta requeriría que las 3 opciones sean equivalentes.

---

## 4. Las 4 alternativas arquitectónicas para pm-thyrox

### A) Status quo: pm-thyrox como SKILL monolítica (~430 líneas)

**Cómo funciona:** Claude invoca Skill tool → pm-thyrox → lógica de 7 fases inyectada en contexto.

**Problemas documentados:**
- Triggering probabilístico — puede no activarse
- Descripción corta (truncable) vs cuerpo largo (costoso en tokens)
- Crece con cada FASE añadida → drift hacia inmantenibilidad
- SKILL viola su propia definición (múltiples responsabilidades)

**Ventajas:**
- Funciona hoy (con mitigaciones)
- Todo el framework en un lugar
- Activable bajo demanda (no siempre en contexto)

### B) CLAUDE.md como orquestador principal (migración total)

**Cómo funciona:** Mover lógica de flujo de sesión + principios core a CLAUDE.md.
Las instrucciones de fase se mueven a workflow_* commands.
pm-thyrox SKILL se elimina o se reduce a descripción de activación.

**Ventajas:**
- Siempre cargado — sin probabilistic triggering
- No consume presupuesto de SKILL descriptions
- Más simple de mantener
- Session-start.sh ya complementa este approach

**Problemas:**
- CLAUDE.md con 430+ líneas es pesado para CADA sesión (aunque no sea de PM)
- Sessions no-PM (debug rápido, preguntas) cargan la lógica completa sin necesidad
- CLAUDE.md no es on-demand — todo o nada
- Riesgo: context window usado por PM overhead en sesiones técnicas puras

### C) Thin orchestrator: CLAUDE.md + pm-thyrox SKILL mínima + workflow_* commands

**Cómo funciona:**
- CLAUDE.md: flujo de sesión (~20 líneas), sin lógica de fase
- pm-thyrox SKILL: descripción + referencia a comandos (~50 líneas)
- workflow_* commands: lógica completa de cada fase (por demanda, ~50-80 líneas c/u)

**Ventajas:**
- Workflow-specific logic on-demand (no siempre en contexto)
- CLAUDE.md sigue ligero
- pm-thyrox SKILL corta = mejor tasa de disparo (descripción no truncada)
- Arquitectura correcta (un comando = una fase)

**Problemas:**
- workflow_* commands desactualizados (no tienen gates, manifest, calibración de FASE 19)
- Sincronizar 7 commands con SKILL.md actual = WP formal de migración
- Aún depende de triggering de pm-thyrox SKILL (aunque sea más corta)

### D) CLAUDE.md flujo + sin SKILL central + workflow_* autónomos

**Cómo funciona:**
- CLAUDE.md: flujo de sesión + referencia directa a /workflow_* (sin invocar SKILL)
- workflow_* commands: completos y autónomos (cada uno contiene lo que necesita)
- pm-thyrox SKILL: solo para proyectos externos que quieran usar el framework como biblioteca

**Ventajas:**
- Elimina el punto de falla de triggering de pm-thyrox
- workflow_* commands son los únicos artefactos que necesitan mantenimiento
- Máximo modularidad

**Problemas:**
- Duplicación entre commands: cada uno necesita sus propios principios, nomenclatura, etc.
- Sin orquestador central, ¿quién detecta el WP activo y el estado?
- Pierde la capacidad de "cargar el framework completo" bajo demanda

---

## 5. Análisis de confiabilidad por mecanismo

| Mecanismo | Garantía de carga | Overhead en sesiones no-PM | Actualizable sin migración |
|-----------|------------------|--------------------------|--------------------------|
| CLAUDE.md | 100% siempre | Alto (carga todo) | Sí, directamente |
| pm-thyrox SKILL (actual, ~430 líneas) | Probabilística | Bajo (solo si se invoca) | Sí, directamente |
| pm-thyrox SKILL (thin, ~50 líneas) | Probabilística, menor riesgo | Bajo | Sí |
| workflow_* commands | 100% cuando usuario invoca | Bajo (por demanda) | Sí, independientemente |
| session-start.sh reminder | 100% (hook) | Negligible | Sí |

**Observación clave:** La combinación `CLAUDE.md (flujo ligero) + session-start.sh (reminder) + workflow_* (on-demand)` tiene mejor perfil de confiabilidad que depender de triggering probabilístico de una SKILL.

---

## 6. La condición del 20% que funciona

El artículo identifica que el 20% de skills que mejoran el output tiene 3 características:
1. **Domain expertise** — escrita por alguien que conoce el dominio profundamente
2. **Evaluación iterativa** — comparada contra baseline, no por vibes
3. **Edge cases documentados** — los casos límite están probados

**¿pm-thyrox cumple estas condiciones?**

| Condición | Estado en pm-thyrox |
|-----------|-------------------|
| Domain expertise | ✓ — metodología SDLC bien documentada, 20 FASEs de iteración |
| Evaluación iterativa | ✗ — nunca se comparó contra "Claude sin pm-thyrox" en la misma tarea |
| Edge cases documentados | ~ Parcial — L-001..L-081 capturan edge cases pero no son benchmarks |

**Conclusión:** pm-thyrox tiene domain expertise pero carece de evaluación formal.
No sabemos si mejora o empeora el output vs CLAUDE.md bien escrito + prompts directos.

---

## 7. El caso específico de pm-thyrox: ¿SKILL o CLAUDE.md?

La pregunta correcta no es "¿es SKILL el mecanismo correcto?" sino:
**"¿Cuándo el usuario necesita el framework y cuándo no?"**

**Necesita el framework:**
- Al iniciar un WP nuevo (Phase 1 ANALYZE)
- Al retomar un WP activo
- Al cambiar de fase (cualquier transición)
- Al ejecutar tareas complejas con agentes

**No necesita el framework:**
- Debug rápido de código
- Pregunta técnica puntual
- Sesión de solo lectura / exploración
- Cualquier tarea < 30 min sin WP

**Implicación:** Si pm-thyrox viviera en CLAUDE.md completamente, cargaría sus ~430 líneas en CADA sesión, incluyendo las que no lo necesitan. Eso es overhead real en context window.

**La solución correcta:** CLAUDE.md tiene el flujo mínimo (qué hacer al inicio de sesión + cómo detectar WP activo) + session-start.sh como recordatorio. La lógica detallada de las fases vive en workflow_* commands (on-demand).

---

## 7b. PTC: análisis técnico completo desde el artículo

Fuente: "Programmatic Tool Calling with Claude Code: The Developer's Guide to Agent-Scale Automation"

### Qué es PTC realmente

PTC invierte el patrón de tool calling estándar:
- **Estándar:** Claude llama tool → espera resultado → razona → llama siguiente tool. N tools = N round-trips.
- **PTC:** Claude escribe un script Python que orquesta N tools → ejecuta → devuelve solo el resultado final. N tools ≈ 1 round-trip.

### Los 3 componentes requeridos

1. **Code Execution Tool** — sandbox de ejecución de código habilitado
2. **Tool Opt-In** — cada tool debe declarar `"allowed_callers"` con la versión del sandbox
   - Sin este flag: tool no es callable desde código generado (por diseño, protege tools con side effects)
3. **Script Generation** — Claude escribe código que emite tool call requests; el host las resuelve y reinyecta

### Lo que PTC NO es (aclaración crítica del artículo)

> "PTC does not guarantee parallel execution. The script may express parallelism (via `asyncio.gather()`), but whether tool calls actually execute concurrently depends entirely on how your host application handles the emitted requests."

**PTC no es true coroutines.** Es request-response mediado por la aplicación host.
**La ganancia real es:** reducción de context window (orchestration logic en código, no en tokens de razonamiento), no necesariamente velocidad.

### Estado en Claude Code

| Plataforma | PTC disponible | Notas |
|------------|---------------|-------|
| Claude API | ✓ Beta | `code_execution_20250825` + `"allowed_callers"` |
| Claude Code CLI/Web | ✗ | "Anthropic es consciente de la demanda; es razonable esperar que llegue" |
| MCP servers en Claude Code | Parcial | MCP tools pueden ser llamados desde subagentes, no desde código Python generado |

### Implicación para la decisión arquitectónica

PTC no está disponible en Claude Code. Pero su mecanismo subyacente revela algo importante:

**Lo que PTC hace bien:** elimina round-trips colocando la orquestación en código ejecutable en lugar de razonamiento conversacional.

**Lo que hooks + workflow_* commands hacen de forma análoga:** los hooks son ejecutables determinísticos (shell, no Python generado), y los workflow_* commands son invocación directa (no probabilística). La arquitectura hooks + commands es la aproximación más cercana a PTC disponible en Claude Code hoy.

**Cuando PTC llegue a Claude Code:** la arquitectura correcta cambiará fundamentalmente — pm-thyrox podría convertirse en un script Python que orquesta las 7 fases, no en instrucciones de texto inyectadas. Esta posibilidad debe quedar documentada en el ADR como cláusula de revisión.

### Versioning risk

Los identificadores del artículo (`code_execution_20250825`, `advanced-tool-use-2025-11-20`) son beta y Anthropic los cambia sin deprecation extendida. El ADR no debe acoplarse a versiones específicas.

---

## 8. Restricciones del entorno

| Restricción | Impacto en decisión |
|-------------|-------------------|
| Hooks (Capa 0) son 100% determinísticos | Son la única garantía absoluta de ejecución — deben usarse como base de confiabilidad |
| CLAUDE.md siempre cargado (Capa 1) | Ventaja de confiabilidad, desventaja de overhead en sesiones no-PM |
| SKILL triggering probabilístico (Capa 2) | No se puede confiar en él sin mitigaciones de Capa 0 y 1 |
| /workflow_* determinísticos si usuario los invoca (Capa 3) | Alta confiabilidad pero requiere que el usuario los conozca y los use |
| workflow_* desactualizados vs SKILL.md | Costo de migración real — sincronización = WP separado antes de poder usarlos |
| Claude Code Web — sin PTC | Orquestación por prompt/texto, no por código ejecutable; puede cambiar en el futuro |
| Claude Code Web — sin Tool Search API | Tool Search disponible internamente (deferred tools), no para SKILLs del usuario |
| 16 SKILLs activas (potencial truncación) | Argumento adicional para reducir pm-thyrox SKILL o migrar a commands |
| workflow_* vs Phase N vs agentes: 3 rutas al mismo resultado | Sin equivalencia: la misma "Phase 1" tiene 3 implementaciones con calidad distinta |

---

## 9. Criterios de éxito para este WP

1. ADR firmado con decisión arquitectónica documentada y justificada
2. Evaluación formal (aunque mínima) de pm-thyrox vs baseline
3. Plan de migración concreto si la decisión requiere cambios
4. TD-006 actualizado con los hallazgos de este análisis

---

## 10. Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|-----------|
| Migración rompe el flujo actual | Media | Alto | Migración gradual; mantener SKILL durante transición |
| workflow_* desactualizados producen inconsistencias | Alta | Medio | Sincronizar commands antes de eliminar SKILL |
| CLAUDE.md con demasiado contenido | Media | Medio | Límite explícito de líneas para sección PM en CLAUDE.md |
| Decisión equivocada sin evaluación formal | Media | Medio | Benchmarking mínimo antes de ADR |
| PTC llega a Claude Code y cambia todo | Baja | Alto | ADR debe ser revisable cuando PTC esté disponible |

---

## Stopping Point Manifest

| ID | Fase | Tipo | Evento | Acción requerida |
|----|------|------|--------|-----------------|
| SP-01 | 1→2 | gate-fase | Análisis completo presentado | Esperar "SI" del usuario para avanzar a Phase 2 |
| SP-02 | 2→3 | gate-fase | Strategy + ADR preliminar presentados | Esperar "SI" del usuario |
| SP-03 | 3→4 | gate-fase | Plan de migración (scope) aprobado | Esperar "SI" del usuario |
| SP-04 | 4→5 | gate-fase | Spec + evaluación mínima aprobada | Esperar "SI" del usuario |
| SP-05 | 5→6 | gate-fase | Task-plan aprobado | Esperar "SI" del usuario |
| SP-06 | 6→7 | gate-fase | Todas las tareas completas + validación pre-7 | Esperar "SI" del usuario |
