```yml
project: THYROX — Capacidades de integración con EvoAgentX
Work package: 2026-04-05-01-09-22-thyrox-capabilities-integration
created_at: 2026-04-05 23:00:00  # hora estimada — corregido FASE 35 (2026-04-14), WP histórico sin hora original
current_phase: Phase 1 — ANALYZE
open_risks: 5
```

# Risk Register — thyrox-capabilities-integration

## Matriz de riesgos

| ID | Descripción | Probabilidad | Impacto | Severidad | Estado |
|----|-------------|:------------:|:-------:|:---------:|--------|
| R-001 | EvoAgentX v0.1.0 tiene APIs inestables — breaking changes en v0.2.x pueden romper el adapter layer | Alta | Alto | Alta | Abierto |
| R-002 | Instalación full de EvoAgentX incluye ~40 deps pesadas (torch, transformers, colpali) — setup complejo en proyectos destino | Alta | Medio | Alta | Abierto |
| R-003 | `WorkFlowReviewer` marcado como TODO en EvoAgentX — el pipeline de validación de workflows no está implementado | Media | Medio | Media | Abierto |
| R-004 | LongTermMemory + FAISS requiere indexar artefactos existentes (retroalimentación) — el costo inicial de indexación puede ser alto en proyectos grandes | Baja | Bajo | Baja | Abierto |
| R-005 | La capa adapter (`registry/agents/_evoagentx_adapter.py`) introduce un punto de mantenimiento adicional — si EvoAgentX cambia arquitectura (no solo API), el adapter puede quedar obsoleto | Media | Alto | Alta | Abierto |

## Detalle de riesgos

### R-001: API inestable EvoAgentX 0.1.0
**Contexto:** EvoAgentX está en versión temprana (0.1.0, mayo 2025). Las clases
`CustomizeAgent`, `LongTermMemory`, y los toolkits son la interfaz pública más usada,
pero no hay garantía de estabilidad entre minor versions.

**Mitigación:** Pinear versión exacta en requirements. Crear `_evoagentx_adapter.py`
como única capa de contacto con EvoAgentX — toda la integración va por ahí.

---

### R-002: Dependencias pesadas
**Contexto:** `pip install evoagentx` instala torch, transformers, colpali-engine.
Para el meta-framework, solo se necesita: core, memory, tools (sin RAG completo, sin optimizers).

**Mitigación:** Instalar solo los módulos necesarios vía extras o instalación selectiva:
`pip install evoagentx pydantic litellm faiss-cpu sentence-transformers`
Sin `torch` ni `transformers` si no se usa ColPali ni optimizadores.

---

### R-003: WorkFlowReviewer no implementado
**Contexto:** El módulo `WorkFlowReviewer` está marcado `TODO` en EvoAgentX.
Si se usa `WorkFlowGenerator` para automatizar Phase 5 DECOMPOSE, el reviewer
que valida el workflow generado no existe.

**Mitigación:** No usar `WorkFlowGenerator` en Phase 5 sin validación manual.
Priorizar `CustomizeAgent` + `AgentManager` que SÍ están implementados.

---

### R-004: Costo de indexación inicial
**Contexto:** Para proyectos con historial largo de WPs (>50 artefactos), la primera
indexación de `LongTermMemory` con FAISS puede tomar tiempo y espacio en disco.

**Mitigación:** Indexación incremental — solo indexar WPs al cerrarlos (Phase 7 TRACK),
no indexar retroactivamente todo el historial.

---

### R-005: Adapter layer como punto de fallo
**Contexto:** Si EvoAgentX cambia su arquitectura interna (no solo la API pública),
el adapter podría necesitar reescritura completa. Esto afecta todos los tech skills
generados que dependen de él.

**Mitigación:** Definir interfaces abstractas en el adapter, independientes de la
implementación de EvoAgentX. El adapter expone: `create_agent()`, `execute_tool()`,
`store_memory()`, `retrieve_memory()` — sin exponer tipos de EvoAgentX directamente.
