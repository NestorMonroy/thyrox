```yml
created_at: 2026-04-19 11:28:01
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 3 — DIAGNOSE
author: NestorMonroy
status: Borrador
version: 1.0.0
```

# Diagnóstico — Root Cause Analysis de Brechas en Agentic AI

**Propósito:** Identificar las causas raíz de por qué THYROX no cubre los 30 anti-patrones
descubiertos en Stage 1. Entender el origen de cada brecha define qué soluciones atacan
las causas y cuáles solo tratan los síntomas.

---

## Resumen ejecutivo

El baseline (Stage 2) confirmó 0/30 anti-patrones cubiertos. Los 3 ejes causales identificados
son interdependientes: la ausencia de guidelines produce código sin validación, la ausencia de
un agente validador permite que el código sin validación llegue a producción, y la ausencia de
patrones consultables hace que los developers cometan los mismos errores repetidamente.
La causa raíz común a los 3 ejes es una **decisión de scope original**: `python-mcp.instructions.md`
fue diseñado para MCP server development, no para agentic AI application development.

---

## Eje 1 — Ausencia de guidelines de implementación agentic

### Síntoma observado
`python-mcp.instructions.md` tiene 8 reglas, todas enfocadas en MCP server development:
- R1: Type hints, R2: Dataclasses, R3: exec_cmd timeout, R4: Blocked patterns, R5: MCP error format,
  R6: Pathlib, R7: bootstrap.py idempotencia, R8: FAISS persistence.

**Ninguna regla cubre:** ADK callbacks, LangChain memory, HITL, observabilidad, type contracts
en funciones de agente, temperatura de clasificadores.

### Causa raíz: Scope de diseño incorrecto

El archivo fue creado cuando el proyecto usaba Python principalmente para el MCP server
(infrastructure tooling). En ese momento, el scope era correcto. La expansión hacia
análisis de agentic AI de un libro externo (ÉPICA 42) expuso el gap: el proyecto ahora
necesita guidelines para **aplicaciones agentic** (ADK, LangChain, CrewAI), no solo para
infraestructura MCP.

### Causas secundarias

1. **Sin mecanismo de extensión declarado:** `python-mcp.instructions.md` no tiene sección
   de "fuera de scope" que hubiera señalado explícitamente que agentic patterns están ausentes.
   El gap no era visible hasta el análisis de Stage 1.

2. **Sin proceso de actualización basado en hallazgos:** THYROX no tiene un mecanismo
   que diga "cuando descubrimos un nuevo anti-patrón → actualizar guidelines". Los
   deep-dives y calibration reports viven en `discover/` pero no hay ruta de propagación
   hacia `guidelines/`.

3. **Nombre engañoso:** `python-mcp.instructions.md` sugiere "todo Python en el proyecto"
   cuando en realidad es solo "Python para MCP servers". El alcance implícito supera el
   real.

### Árbol de causas (5-Whys)

```
Síntoma: python-mcp.instructions.md no cubre ADK/LangChain patterns
  ↳ ¿Por qué? Fue diseñado para MCP server development, no agentic apps
      ↳ ¿Por qué? En el momento de creación, Python = MCP tools solamente
          ↳ ¿Por qué? ÉPICA 42 es la primera iniciativa de agentic AI analysis
              ↳ ¿Por qué? THYROX fue diseñado como framework metodológico, no como código agentic
                  ↳ Causa raíz: Scope original correctamente limitado; no había señal de expansión
```

**Implicación:** No es un error de diseño original — es scope drift no señalizado. La solución
es agregar un nuevo archivo de guidelines (no modificar `python-mcp.instructions.md`) o
extender explícitamente el scope existente.

---

## Eje 2 — Ausencia de agente validador especializado

### Síntoma observado

Los 23 agentes existentes cubren:
- Coordinación metodológica (dmaic, lean, rup, pm, etc.)
- Tech expertise (mysql, postgresql, nodejs, react, webpack)
- Análisis de artefactos THYROX (agentic-reasoning → realismo performativo)
- Análisis adversarial genérico (deep-dive → cualquier artefacto)

**Ningún agente valida:** código agentic contra anti-patrones conocidos (ADK callbacks,
LangChain imports, temperatura de clasificadores, HITL patterns).

### Causa raíz: Los agentes cubren metodología y tecnología, no patrones de dominio agentic

La arquitectura de agentes del sistema tiene dos familias:
1. **Methodology coordinators** — ejecutan fases THYROX o marcos externos (DMAIC, BABOK, etc.)
2. **Tech experts** — producen código para una tecnología específica (nodejs-expert, react-expert)

No existe una familia para **domain pattern validators** — agentes que toman código
en cualquier tecnología y lo validan contra un catálogo de anti-patrones conocidos.

### Causas secundarias

1. **El agente `agentic-reasoning` tiene scope THYROX, no código usuario:**
   Su descripción dice "Analiza artefactos de THYROX para detectar realismo performativo".
   Está diseñado para evaluar documentos metodológicos (risk registers, exit conditions),
   no para validar código Python contra contratos de callback ADK.

2. **El agente `deep-dive` es genérico, no especializado:**
   `deep-dive` puede analizar "cualquier artefacto" pero sin un catálogo de anti-patrones
   precargado, reproduce el mismo error que el libro analizado: detecta problemas visibles
   pero no tiene referencia contra qué comparar patrones sutiles como `return None` en
   `before_model_callback`.

3. **Sin mecanismo de "nuevos hallazgos → nuevo agente":**
   Cuando Stage 1 descubrió 30 anti-patrones, no existe un proceso que dispare la creación
   de un agente que los conozca. El conocimiento queda en `discover/` sin propagarse.

### Árbol de causas (5-Whys)

```
Síntoma: no hay agente que valide código agentic contra AP-01..AP-30
  ↳ ¿Por qué? Ningún agente existente tiene ese catálogo
      ↳ ¿Por qué? Los agentes fueron diseñados para metodología y tech stack
          ↳ ¿Por qué? El proyecto no tenía corpus de anti-patrones agentic hasta ÉPICA 42
              ↳ ¿Por qué? ÉPICA 42 es la primera análisis sistemático de código agentic externo
                  ↳ Causa raíz: Gap de dominio nuevo — agentic AI patterns no existían en el sistema
```

**Implicación:** La solución requiere crear un nuevo agente `agentic-validator` con el
catálogo AP-01..AP-30 embebido, distinto de `agentic-reasoning` (artefactos THYROX) y
distinto de `deep-dive` (genérico adversarial).

---

## Eje 3 — Ausencia de patrones de referencia consultables

### Síntoma observado

Solo 1 de 30 anti-patrones está documentado como patrón consultable:
`discover/agentic-callback-contract-misunderstanding.md` — documenta AP-01/AP-02.

Los restantes 29 AP viven dispersos en deep-dives y calibration reports — documentos
de análisis densos, no optimizados para consulta rápida durante implementación.

### Causa raíz: Los artefactos de Stage 1 son análisis, no patrones de referencia

El formato de los artefactos Stage 1 (`deep-dive.md`, `calibration.md`) está optimizado
para **revelar** problemas. Contienen:
- Evidencia detallada de cada bug
- Análisis de contexto y cadena causal
- Scores y matrices de calibración

Pero para que un developer consulte "¿cómo implemento correctamente X?", necesita:
- El anti-patrón (qué NO hacer)
- El patrón correcto (qué SÍ hacer)
- Ejemplo mínimo ejecutable

Los artefactos actuales tienen los dos primeros elementos dispersos entre análisis detallados,
pero no en formato patrón consultable.

### Causas secundarias

1. **Sin Stage 12 STANDARDIZE ejecutado aún:**
   THYROX tiene `Stage 12 STANDARDIZE` diseñado precisamente para propagar aprendizajes.
   El WP no ha llegado a Stage 12, por lo tanto los patrones de Stage 1 no han sido
   estandarizados. Esto es un gap de proceso, no un gap de diseño.

2. **La excepción (`agentic-callback-contract-misunderstanding.md`) fue un one-off:**
   Ese documento fue creado ad-hoc por corrección de un error de over-scoping. No existe
   como parte de un sistema — no hay template, no hay directorio destino establecido, no
   hay proceso de "cuando descubrimos AP → crear patrón".

3. **Sin directorio de patrones agentic en el sistema:**
   `discover/` contiene todos los análisis de Stage 1. No hay `patterns/` o equivalente
   donde vivan los patrones destilados de los análisis. El conocimiento está enterrado.

### Árbol de causas (5-Whys)

```
Síntoma: 29/30 AP no tienen documentación de patrón consultable
  ↳ ¿Por qué? Los artefactos Stage 1 son análisis, no patrones
      ↳ ¿Por qué? Stage 1 DISCOVER produce síntesis, no guías de implementación
          ↳ ¿Por qué? La estandarización vive en Stage 12, no en Stage 1
              ↳ ¿Por qué? El WP no ha llegado aún a Stage 12
                  ↳ Causa raíz: Proceso correcto pero etapa temprana — Stage 12 no ejecutado
```

**Implicación:** La solución no requiere cambiar el proceso THYROX — requiere llegar a Stage 10
IMPLEMENT donde los patrones se crean en `guidelines/` y el agente en `.claude/agents/`.
Stage 12 STANDARDIZE propagará los patrones finales.

---

## Mapa causal integrado

```
Causa raíz compartida:
  python-mcp.instructions.md scope = MCP only (decisión correcta en 2025, insuficiente en 2026)
       │
       ├──→ Eje 1: No hay reglas para agentic AI patterns en guidelines
       │         Solución: nuevo archivo agentic-python.instructions.md
       │
       ├──→ Eje 2: No hay agente validador de código agentic
       │         Solución: nuevo agente agentic-validator.md
       │
       └──→ Eje 3: No hay patrones consultables en formato patrón
                  Solución: ejecutar Stage 10 IMPLEMENT (crea el contenido) +
                            Stage 12 STANDARDIZE (propaga y consolida)

Causa raíz sistémica secundaria:
  Sin mecanismo de propagación hallazgos → guidelines → agentes
       │
       └──→ Afecta los 3 ejes: cada discovery en ÉPICA futura repite el mismo gap
                  Solución: proceso en Stage 12 que actualice guidelines + agentes
```

---

## Clasificación de gaps por tipo de solución

| Gap | AP cubiertos | Tipo de solución | Complejidad |
|-----|-------------|-----------------|-------------|
| Guidelines agentic ausentes | AP-01..AP-30 (aplica a todos) | Nuevo archivo `.thyrox/guidelines/agentic-python.instructions.md` | MEDIA — 30 reglas bien definidas |
| Agente validador ausente | AP-01..AP-30 (todos) | Nuevo `.claude/agents/agentic-validator.md` | MEDIA — catálogo ya definido, formato conocido |
| Patrones consultables ausentes | AP-01..AP-30 | Documentos en `discover/patterns/` (o similar) | BAJA — formato patrón = extracción de deep-dives |
| Proceso de propagación ausente | Sistémico | Actualización de Stage 12 STANDARDIZE template | BAJA — process change, no código |

---

## Diagnóstico de severidad por eje

### Eje 1 — Guidelines: CRÍTICO
Sin guidelines, el sistema no puede prevenir AP en código nuevo. El error puede repetirse
en cualquier sesión donde se implemente código agentic. Impact: 30/30 AP sin prevención.

### Eje 2 — Agente validador: ALTO
Sin agente, la validación depende de conocimiento implícito del developer. El riesgo
disminuye si los guidelines existen (Eje 1 resuelto), pero no desaparece — los guidelines
son pasivos (necesitan ser leídos), el agente es activo (puede ser invocado sobre código existente).

### Eje 3 — Patrones consultables: MEDIO
Sin patrones, la recuperación de conocimiento es costosa (leer deep-dives densos).
No impide implementación correcta si los guidelines existen, pero sí aumenta el tiempo
de consulta y la probabilidad de que el developer no encuentre el patrón correcto a tiempo.

---

## Conclusión diagnóstica

Los 3 ejes son síntomas de una única evolución de dominio: el proyecto pasó de usar
Python para infraestructura MCP a analizar/implementar aplicaciones agentic, sin
actualizar el sistema de guidelines y agentes para reflejar ese cambio.

La solución es una implementación en 3 partes que ataca cada eje directamente:

1. **`agentic-python.instructions.md`** — 30 reglas derivadas de AP-01..AP-30
2. **`agentic-validator.md`** — agente que valida código contra ese catálogo
3. **Patrones consultables** — formato patrón para AP críticos en Stage 12

El orden de implementación óptimo: Eje 1 → Eje 2 → Eje 3 (cada uno amplifica el anterior).
