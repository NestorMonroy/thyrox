```yml
created_at: 2026-04-19 11:28:01
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 2 — BASELINE
author: NestorMonroy
status: Borrador
version: 1.0.0
```

# Baseline — Agentic AI Implementation Patterns

**Propósito:** Establecer el estado actual del sistema THYROX frente a los 30 anti-patrones
y brechas de implementación descubiertos en Stage 1 DISCOVER (Cap.9–20 del libro analizado).
Este baseline define el punto de partida medible antes de implementar mejoras.

---

## 1. Fuentes de hallazgos

| Fuente | Tipo | Documentos clave |
|--------|------|-----------------|
| Cap.9 AgentTools | Análisis | `discover/a2a-pattern-deep-dive.md` (ref. old) |
| Cap.10 Multi-Agent | Calibración | 77% → 65.4% (dos versiones) |
| Cap.11 Callbacks | Calibración | 63.3% / 60.6% / 71.9% (tres inputs) |
| Cap.12 Sessions | Calibración | 53.1% |
| Cap.13 Context | Calibración | 50.6% EPUB / 77.2% tablas |
| Cap.14 Memory | Calibración | 62.1% |
| Cap.15 A2A | Calibración | 74.0% PARCIALMENTE |
| Cap.16 Resource-Aware | Calibración | 42.2% REALISMO PERFORMATIVO |
| Cap.17 Reasoning | Calibración | 64.1% |
| Cap.18 Guardrails | Calibración | 64.2% |
| Cap.20 Prioritization | Calibración | 61.5% |
| **Serie completa** | **Promedio** | **63.3% (14 mediciones)** |

---

## 2. Catálogo de anti-patrones descubiertos — 30 patrones en 8 categorías

### Categoría A — Contratos de callback ADK (2 patrones)

| ID | Patrón | Capítulo fuente | Severidad |
|----|--------|-----------------|-----------|
| AP-01 | `before_model_callback`: retornar `None` con objeto modificado — framework usa objeto ORIGINAL, no modificado | Cap.13 | CRÍTICO |
| AP-02 | `before_tool_callback`: firma incorrecta con `CallbackContext` en lugar de `ToolContext` | Cap.13 | ALTO |

**Estado THYROX:** No documentado en ningún guideline. Coverage: **0/2**

---

### Categoría B — Contratos de tipos violados (4 patrones)

| ID | Patrón | Capítulo fuente | Severidad |
|----|--------|-----------------|-----------|
| AP-03 | Función declara `-> list` pero retorna `dict` en excepción (type contract violation silenciosa) | Cap.16 | ALTO |
| AP-04 | Función declara `-> str` pero retorna `tuple` (unpacking oculto en el llamador) | Cap.16 | MEDIO |
| AP-05 | `types.Content(role="system")` — rol inválido en Gemini/ADK; "system" va en `system_instruction` | Cap.13 | ALTO |
| AP-06 | `code_executor=[BuiltInCodeExecutor]` — clase vs instancia, contrato incierto sin validación | Cap.17 | MEDIO |

**Estado THYROX:** No documentado. Coverage: **0/4**

---

### Categoría C — Determinismo de clasificadores (2 patrones)

| ID | Patrón | Capítulo fuente | Severidad |
|----|--------|-----------------|-----------|
| AP-07 | `temperature=1` para clasificadores determinísticos — routing no-determinístico | Cap.16 | ALTO |
| AP-08 | `temperature=0.5` para decisiones de routing — variabilidad no intencional | Cap.20 | ALTO |

**Estado correcto (Cap.18):** `temperature=0.0` — única instancia que lo hace bien.

**Estado THYROX:** No documentado. Coverage: **0/2**

---

### Categoría D — Manejo de errores ausente (4 patrones)

| ID | Patrón | Capítulo fuente | Severidad |
|----|--------|-----------------|-----------|
| AP-09 | `json.loads(llm_output)` sin try/except — crash en output no-JSON (probabilidad alta con temperature>0) | Cap.16, Cap.20 | ALTO |
| AP-10 | `output.pydantic` sin verificación de None — falla silenciosa si el parsing de Pydantic falla | Cap.18 | MEDIO |
| AP-11 | HTTP error sin validación de `response.raise_for_status()` en path alternativo | Cap.16 | MEDIO |
| AP-12 | `json.loads` sin manejo ante LLM con markdown fencing en output (`\`\`\`json...`) | Cap.16, Cap.20 | ALTO |

**Estado THYROX:** No documentado. Coverage: **0/4**

---

### Categoría E — Observabilidad contradictoria (3 patrones)

| ID | Patrón | Capítulo fuente | Severidad |
|----|--------|-----------------|-----------|
| AP-13 | `logging.basicConfig(level=logging.ERROR)` silencia INFO/WARNING — contradice claims de observabilidad | Cap.18 | ALTO |
| AP-14 | `print(f"DEBUG: ...")` en producción — no hay mecanismo de silenciado ni logging estructurado | Cap.20 | MEDIO |
| AP-15 | Servicios in-memory (`InMemoryArtifactService`, `InMemorySessionService`) presentados sin disclaimer de producción | Cap.12/13/15 | MEDIO |

**Estado THYROX:** No documentado. Coverage: **0/3**

---

### Categoría F — HITL sin bloqueo real (2 patrones)

| ID | Patrón | Capítulo fuente | Severidad |
|----|--------|-----------------|-----------|
| AP-16 | `escalate_to_human()` retorna `{"status": "success"}` inmediatamente — no hay loop de espera real | Cap.14/15 | CRÍTICO |
| AP-17 | `flag_for_review()` sin mecanismo de interrupt/resume — HITL es decorativo | Cap.14/15 | CRÍTICO |

**Estado THYROX:** No documentado. Coverage: **0/2**

---

### Categoría G — Imports rotos y deprecados (5 patrones)

| ID | Patrón | Capítulo fuente | Severidad |
|----|--------|-----------------|-----------|
| AP-18 | `from langchain_core.tools import Tool` → `ImportError` (Tool vive en `langchain.tools`) | Cap.20 | CRÍTICO |
| AP-19 | `from langchain.memory import ConversationBufferMemory` → deprecado en LangChain ≥0.3 | Cap.20 | ALTO |
| AP-20 | `from langchain_community.embeddings import OpenAIEmbeddings` → deprecado (`langchain_openai`) | Cap.14 | ALTO |
| AP-21 | `from langchain_community.vectorstores import Weaviate` → deprecado (`langchain_weaviate`) | Cap.14 | ALTO |
| AP-22 | `datetime.datetime.now()` en f-string de `instruction` — evaluado UNA VEZ en creación del agente, no por invocación | Cap.13/15 | MEDIO |

**Estado THYROX:** No documentado. Coverage: **0/5**

---

### Categoría H — Patrones de diseño agentic (8 patrones)

| ID | Patrón | Capítulo fuente | Severidad |
|----|--------|-----------------|-----------|
| AP-23 | `ConversationBufferMemory` compartido entre escenarios — contaminación de contexto cross-invocation | Cap.11/14 | ALTO |
| AP-24 | A2A naming inconsistency: JSON-RPC usa `sendTask` pero Key Takeaways dice `tasks/send` (versiones de protocolo distintas) | Cap.15 | MEDIO |
| AP-25 | Named Mechanism vs. Implementation: título del capítulo nombra mecanismo que el código no implementa (9/10 caps) | Cap.10-20 | SISTÉMICO |
| AP-26 | Thread-unsafe counter en multi-agent: `self.next_task_id += 1` sin lock en sistema concurrente | Cap.20 | ALTO |
| AP-27 | Dynamic re-prioritization completamente ausente: no hay campo `deadline` en `Task`, no hay re-ranking | Cap.20 | ALTO |
| AP-28 | `http://` URL en AgentCard vs claim de mTLS "fundamental" — contradicción de seguridad | Cap.15 | ALTO |
| AP-29 | `Bearer ` con token vacío en Authorization header — retorna 401 sin señalización explícita | Cap.16 | MEDIO |
| AP-30 | Calibración por Citas Verificables (CCV): referencias bibliográficas sin inline citations no elevan calibración | Serie completa | SISTÉMICO |

**Estado THYROX:** No documentado. Coverage: **0/8**

---

## 3. Cobertura actual del sistema THYROX

### 3.1 Archivos de guidelines activos

| Archivo | Reglas actuales | Cobertura de agentic AI |
|---------|----------------|------------------------|
| `python-mcp.instructions.md` | 8 reglas | 0% — enfocado en MCP servers, no en agentes |
| `backend-nodejs.instructions.md` | Node.js/Express | 0% — no aplica |
| `db-mysql.instructions.md` | MySQL | 0% — no aplica |
| `db-postgresql.instructions.md` | PostgreSQL | 0% — no aplica |
| `frontend-react.instructions.md` | React/UI | 0% — no aplica |
| `frontend-webpack.instructions.md` | Webpack | 0% — no aplica |

### 3.2 Agentes nativos (`.claude/agents/`)

23 agentes nativos existentes. Ninguno especializado en validación de patrones agentic AI.
- `agentic-reasoning` — detecta realismo performativo en artefactos THYROX (no en código agentic)
- `deep-dive` — análisis adversarial genérico (no especializado en ADK/LangChain)
- Resto: coordinators metodológicos (dmaic, rup, lean, etc.)

### 3.3 Score de cobertura baseline

```
Anti-patrones catalogados:  30
Anti-patrones cubiertos:     0
Cobertura baseline:          0%  (0/30)

Distribución por severidad:
  CRÍTICO  (AP-01, 02, 16, 17, 18):    5 patrones  → 0% cubiertos
  ALTO     (AP-03..15, AP-19..28):     19 patrones → 0% cubiertos
  MEDIO    (AP-04, 06, 10, 11, etc.):   6 patrones → 0% cubiertos
  SISTÉMICO (AP-25, AP-30):             2 patrones → 0% cubiertos
```

---

## 4. Estado de calibración de la serie analizada

| Capítulo | Score | Veredicto |
|----------|-------|-----------|
| Cap.9 AgentTools | 77.0% | CALIBRADO |
| Cap.10 v1 | 79.0% | CALIBRADO |
| Cap.10 v2 | 65.4% | PARCIALMENTE CALIBRADO |
| Cap.11 ES | 63.3% | PARCIALMENTE CALIBRADO |
| Cap.11 EN | 60.6% | PARCIALMENTE CALIBRADO |
| Cap.11 tablas | 71.9% | PARCIALMENTE CALIBRADO |
| Cap.12 | 53.1% | PARCIALMENTE CALIBRADO |
| Cap.13 EPUB | 50.6% | PARCIALMENTE CALIBRADO |
| Cap.13 tablas | 77.2% | CALIBRADO |
| Cap.14 | 62.1% | PARCIALMENTE CALIBRADO |
| Cap.15 | 74.0% | PARCIALMENTE CALIBRADO |
| Cap.16 | 42.2% | REALISMO PERFORMATIVO |
| Cap.17 | 64.1% | PARCIALMENTE CALIBRADO |
| Cap.18 | 64.2% | PARCIALMENTE CALIBRADO |
| Cap.20 | 61.5% | PARCIALMENTE CALIBRADO |
| **Promedio serie** | **63.3%** | PARCIALMENTE CALIBRADO |

**Distribución de veredictos:** CALIBRADO: 3/15 (20%) · PARCIALMENTE CALIBRADO: 11/15 (73%) · REALISMO PERFORMATIVO: 1/15 (7%) · INVÁLIDO: 0/15

---

## 5. Métricas de éxito (target state)

| Métrica | Baseline | Target |
|---------|----------|--------|
| Cobertura AP catalogados | 0/30 (0%) | 30/30 (100%) |
| AP CRÍTICOS cubiertos | 0/5 | 5/5 (100%) |
| AP ALTOS cubiertos | 0/19 | 19/19 (100%) |
| guidelines con agentic AI rules | 0 | 1 (python-mcp ampliado o archivo nuevo) |
| Agente especializado en validación | 0 | 1 (agentic-validator agent) |
| Patrones documentados en discover/ | 1 (AP-01/02 via callback misunderstanding) | 30 |

---

## 6. Gap summary para Stage 3 DIAGNOSE

Los gaps se agrupan en 3 ejes causales para análisis en Stage 3:

### Eje 1 — Ausencia de guidelines de implementación agentic
`python-mcp.instructions.md` cubre MCP server dev pero ignora completamente:
ADK callbacks, LangChain memory, HITL patterns, observabilidad, type contracts.

### Eje 2 — Ausencia de agentes de validación especializados
No existe agente que valide código agentic contra los 30 AP antes de que llegue
a producción. `agentic-reasoning` detecta realismo performativo en artefactos
THYROX — dominio diferente.

### Eje 3 — Ausencia de patrones de referencia consultables
Solo 1 de 30 anti-patrones está documentado como patrón (`agentic-callback-contract-misunderstanding.md`).
Los restantes 29 viven solo en deep-dives y calibration reports — no como guía accionable.

---

## 7. Archivos de referencia Stage 1

```
discover/
├── agentic-callback-contract-misunderstanding.md     ← único patrón documentado
├── a2a-pattern-input.md + deep-dive + calibration
├── resource-aware-optimization-input.md + deep-dive + calibration
├── reasoning-techniques-input.md + deep-dive + calibration
├── guardrails-safety-input.md + deep-dive + calibration
├── prioritization-input.md + deep-dive + calibration
└── [90+ archivos totales]
```
