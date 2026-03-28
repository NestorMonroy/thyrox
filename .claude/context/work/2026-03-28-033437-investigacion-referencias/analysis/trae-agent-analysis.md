```yml
Fecha: 2026-03-28
Proyecto: THYROX
Tipo: Análisis de referencia (Phase 1: ANALYZE)
Referencia: /tmp/thyrox-references/trae-agent/
```

# Análisis: trae-agent — Agent loop, sequential thinking, trajectory recording

## Qué es

Agente de coding open-source de ByteDance. Multi-LLM (Anthropic, OpenAI, Google, Azure, Ollama), con herramientas modulares, Docker sandboxing, evaluación SWE-bench, y diseño orientado a investigación.

No es un framework de PM — es un **agente de software engineering con arquitectura de referencia.**

---

## Los 4 conceptos más relevantes para THYROX

### 1. Sequential Thinking como herramienta explícita

No es razonamiento implícito. Es un **tool** que el agente invoca:

```python
ThoughtData:
  thought: str              # El pensamiento
  thought_number: int       # Posición actual
  total_thoughts: int       # Estimado total (ajustable)
  next_thought_needed: bool # ¿Seguir pensando?
  is_revision: bool         # ¿Revisa pensamiento previo?
  branch_from_thought: int  # ¿Bifurca desde cuál?
  branch_id: str            # ID de la rama
```

**3 tipos de pensamiento:**
- 💭 Regular — paso analítico normal
- 🔄 Revision — reconsidera pensamiento previo
- 🌿 Branch — explora alternativa

**Lo que esto enseña:** El pensamiento debería ser **rastreable**. No solo "Claude pensó y decidió" — sino "pensamiento 3 de 7, revisando pensamiento 2 porque encontró nueva información, rama B explorando alternativa."

**Para THYROX:** Nuestros análisis son pensamiento secuencial implícito. Si cada decisión tuviera thought_number, total_thoughts, y branch tracking, podríamos entender CÓMO llegamos a cada conclusión.

### 2. Trajectory Recording (work-logs automáticos)

Registra **TODO** automáticamente sin intervención:

```json
{
  "task": "Fix authentication bug",
  "start_time": "2026-03-28T10:00:00",
  "end_time": "2026-03-28T10:45:00",
  "execution_time": 2700,
  "success": true,

  "llm_interactions": [
    {
      "timestamp": "...",
      "input_messages": [...],
      "response": { "content": "...", "usage": { "input_tokens": 1200 } },
      "tools_available": ["bash", "edit", "sequential_thinking"]
    }
  ],

  "agent_steps": [
    {
      "step_number": 1,
      "state": "thinking",
      "tool_calls": [{ "name": "bash", "arguments": {...} }],
      "tool_results": [{ "success": true, "result": "..." }]
    }
  ]
}
```

**Guardado continuamente** (no al final). Si el proceso crashea, tienes hasta el último paso.

**Para THYROX:** Esto es lo que debería ser un work-log — NO un documento narrativo que alguien escribe. Es un registro automático de LO QUE PASÓ: qué herramientas se usaron, qué resultados dieron, cuántos tokens se consumieron.

### 3. Agent loop con estado explícito

```
THINKING → CALLING_TOOL → REFLECTING → COMPLETED/ERROR
```

**Condiciones de parada:**
1. `task_done` tool llamado → verificar que hay resultado real
2. Max steps excedidos (default 200)
3. Error/excepción
4. Patch vacío (para SWE-bench)

**Para THYROX:** Nuestras 7 fases no tienen condición de parada explícita. ¿Cuándo termina Phase 1? "Cuando el usuario aprueba." Pero eso depende de disciplina. trae-agent tiene `task_done` como acción explícita que VERIFICA antes de terminar.

### 4. System Prompt como contrato de metodología

El prompt define una metodología de 7 pasos:

```
1. Understand the Problem — leer, identificar
2. Explore and Locate — navegar codebase
3. Reproduce the Bug — CRUCIAL, obligatorio
4. Debug and Diagnose — inspeccionar, trazar
5. Develop Fix — modificaciones mínimas
6. Verify and Test — CRITICAL, tests + regressions
7. Summarize Work — documentar lo hecho
```

**Reglas del prompt:**
- SIEMPRE usar paths absolutos
- SIEMPRE reproducir antes de arreglar
- SIEMPRE escribir tests nuevos
- SIEMPRE verificar regresiones
- Actuar como "senior software engineer"

**Para THYROX:** Nuestro SKILL.md es un prompt de metodología. Pero trae-agent lo pone DENTRO del system prompt del LLM, no en un archivo que el LLM "debería leer." Es enforcement directo.

---

## Otros conceptos relevantes

### CKG (Code Knowledge Graph)

SQLite con índice semántico del codebase. 3 queries:
- `search_function` — buscar por nombre de función
- `search_class` — buscar por nombre de clase
- `search_class_method` — buscar método dentro de clase

**No es grep** — entiende estructura (herencia, métodos, fields).

**Para THYROX:** Si el framework crece, podría indexar sus propios archivos (references, assets, analysis) para búsqueda semántica en vez de grep.

### Evaluation (SWE-bench)

Sistema para medir la efectividad del agente contra benchmarks reales:
- Genera N patches por problema
- Evalúa cada patch contra tests ground truth
- Patch Selection elige el mejor (ensemble + voting)

**Para THYROX:** ¿Cómo medimos si la metodología de 7 fases FUNCIONA? No tenemos benchmark. trae-agent demuestra que la evaluación sistemática es posible y valiosa.

### Docker sandboxing

Ejecución aislada en contenedores. Path mapping automático. Cleanup después de cada task.

**Para THYROX:** No aplica directamente (no ejecutamos código), pero el concepto de aislamiento sí — cada epic debería ser independiente y no contaminar otros.

---

## Comparación con los 9 proyectos

| Aspecto | Lo que aporta trae-agent | Lo que THYROX tiene | Gap |
|---------|------------------------|--------------------|----|
| **Razonamiento** | Sequential thinking tool (explícito, rastreable) | Implícito (Claude piensa pero no se rastrea) | Alto |
| **Registro** | Trajectory recording (automático, continuo) | Work-logs (manual, vacío) | Crítico |
| **Estado** | State machine (THINKING→TOOL→REFLECTING) | Fases sin estado formal | Medio |
| **Parada** | task_done tool + verificación | EXIT_CONDITIONS (documental) | Alto |
| **Prompt** | System prompt con metodología integrada | SKILL.md como archivo separado | Medio |
| **Evaluación** | SWE-bench benchmarking | Ninguna | Alto |
| **Configuración** | YAML con overrides CLI + env | Estática en SKILL.md | Medio |

---

## La reflexión para THYROX

trae-agent es un agente de coding, no de PM. Pero sus principios aplican:

1. **El razonamiento debe ser rastreable** — no "pensé y decidí" sino "pensamiento 3/7, revisión del 2, rama B."

2. **El registro debe ser automático** — trajectory recording vs work-logs manuales. Nadie escribe work-logs. Todo el mundo genera trajectories.

3. **La parada debe ser verificada** — no "creo que terminé" sino `task_done` + verificación de que realmente hay resultado.

4. **La evaluación debe existir** — ¿cómo sabemos si las 7 fases son mejores que 4 fases? ¿O que 3? Sin benchmark, no sabemos.

---

**Última actualización:** 2026-03-28
