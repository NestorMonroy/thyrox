```yml
type: Análisis de Phase 1
work_package: 2026-04-09-17-19-45-agentic-loop
fase: FASE 27
created_at: 2026-04-09 18:00:00
```

# Análisis — Agentic Loop Integration

## 1. Introducción y Motivación

### ¿Qué es el Agentic Loop?

El Agentic Loop es la arquitectura de ejecución de Claude Code tal como la describe la documentación oficial. Describe cómo Claude opera en un ciclo iterativo de tres fases:

```
Gather → Execute → Verify → [Gather…]
```

- **Gather (Recopilación):** Leer archivos, buscar en el codebase, analizar resultados, validar estado del sistema.
- **Execute (Ejecución):** Editar archivos, crear archivos nuevos, correr comandos shell, llamar herramientas externas.
- **Verify (Verificación):** Correr tests, confirmar que los archivos cambiaron correctamente, analizar outputs, evaluar constraints.

La fase Verify genera feedback que alimenta el siguiente ciclo de Gather, haciendo el loop convergente.

### ¿Qué pide el usuario?

Analizar cómo implementar este patrón dentro del framework pm-thyrox — específicamente en Phase 6 EXECUTE y los agentes que la soportan.

---

## 2. Estado actual del framework

### 2.1 Flujo actual en Phase 6 (task-executor)

El agente `task-executor.md` tiene este flujo:

```
1. Leer task-plan
2. Identificar siguiente T-NNN sin bloqueos
3. Implementar el cambio
4. Actualizar checkbox [ ] → [x]
5. Repetir
```

**Ausencia crítica:** No hay paso de Verify explícito. El agente ejecuta, marca `[x]`, y pasa a la siguiente tarea. La verificación solo aparece como reporting de errores reactivo, no como validación proactiva post-implementación.

### 2.2 Flujo actual en workflow-execute/SKILL.md

```
1. Leer descripción + SPEC referenciado
2. Verificar dependencias previas
3. GATE OPERACIÓN (si aplica)
4. Implementar
5. Si falla → ERR-NNN.md
6. Commit
7. Actualizar checkbox
8. Actualizar ROADMAP.md
```

**Ausencia crítica:** Ningún paso de verificación entre "Implementar" y "Commit". Se asume que si no hay error visible, la implementación es correcta.

### 2.3 Dónde sí existe verificación hoy

| Punto de verificación | Tipo | Momento |
|----------------------|------|---------|
| Checking dependencias previas | Pre-task | Antes de ejecutar |
| `validate-phase-readiness.sh` | Pre-Phase 7 | Después de toda Phase 6 |
| GATE OPERACIÓN | Pre-operación destructiva | Ad-hoc en tareas específicas |
| `context/errors/ERR-NNN.md` | Post-fallo | Solo cuando algo falla visiblemente |
| Stopping Point Manifest | Gates manuales | Para agentes en background |

**Conclusión:** La verificación existe a nivel de fase (macro) y como respuesta a fallos (reactiva), pero NO a nivel de tarea individual (micro) ni de forma proactiva.

---

## 3. Brecha identificada: El Verify Gap

### 3.1 El problema

Después de ejecutar una tarea, Claude marca `[x]` sin verificar que:
- Los cambios producen el comportamiento esperado
- No hay efectos secundarios en otros archivos
- Los tests siguen pasando (si existen)
- Los links, imports o referencias añadidas son correctos

Esto hace que errores silenciosos (cambio incorrecto, typo en un import, link roto) pasen al siguiente ciclo sin detección.

### 3.2 ¿Por qué no se detecta hoy?

1. **No hay paso de Verify en task-executor.md** — el flujo termina en "actualizar checkbox".
2. **workflow-execute/SKILL.md no define validation actions** — solo define qué hacer si hay error, no cómo verificar que no lo hay.
3. **La verificación global (validate-phase-readiness.sh) es demasiado tardía** — detecta el problema solo al final de Phase 6, cuando múltiples tareas ya están marcadas.

---

## 4. Opciones de implementación

### Opción A: Agregar paso Verify en task-executor.md

**Descripción:** Después de cada implementación, task-executor ejecuta un bloque de verificación antes de marcar `[x]`.

```
3. Implementar
3.5. Verify: [lista de checks por tipo de tarea]
4. Si Verify falla → ERR-NNN + retry o STOP
5. Actualizar [x]
```

**Checks posibles según tipo de tarea:**
- Edición de código → grep del cambio + validar sintaxis
- Nueva referencia/link → confirmar que el path existe
- Modificación de configuración → dry-run del script afectado
- Nuevo archivo → confirmar que se creó en el path correcto

**Ventajas:** Verificación inmediata, feedback rápido, errores detectados en tarea individual.
**Desventajas:** task-executor.md se hace más complejo; los checks varían por dominio y son difíciles de generalizar; riesgo de false-negatives si los checks son insuficientes.

### Opción B: Agregar instrucciones Verify en workflow-execute/SKILL.md

**Descripción:** El orquestador (SKILL.md) define cuándo y qué verificar, delegando el cómo al agente según el tipo de tarea.

```
4. Implementar el cambio
4.5. Verify según tipo:
     - archivos de código → sintaxis + references
     - scripts → bash --dry-run (si disponible)
     - markdown → links internos
5. Si falla → ERR-NNN y reintentar
6. Commit
```

**Ventajas:** Separa "qué verificar" (orquestador) de "cómo ejecutar" (agente). Más alineado con la arquitectura actual.
**Desventajas:** SKILL.md crece en complejidad; el agente aún necesita saber cómo hacer los checks.

### Opción C: Nuevo agente `verifier.md`

**Descripción:** Agente especializado en verificación que se lanza después de cada T-NNN completada.

```
task-executor completa T-NNN → lanza verifier → verifier reporta OK/FAIL → si FAIL: loop
```

**Ventajas:** Separación de responsabilidades limpia; verifier puede ser más sofisticado.
**Desventajas:** Overhead por tarea (agente adicional por cada T-NNN); complejidad de orquestación; latencia.

### Opción D: Referencia + convención (no implementación de agente)

**Descripción:** Documentar el patrón Gather→Execute→Verify como referencia, y agregar la fase Verify como convención en workflow-execute/SKILL.md sin cambiar task-executor.md.

Claude (o el desarrollador que ejecuta) aplica los checks manualmente según el tipo de tarea.

**Ventajas:** Cero cambios a agentes existentes; implementación inmediata; extensible.
**Desventajas:** Dependencia del juicio en cada sesión; no garantiza consistencia.

---

## 5. Análisis de alternativas por tamaño del cambio

| Opción | Archivos afectados | Complejidad | Impacto |
|--------|-------------------|-------------|---------|
| A: task-executor | `agents/task-executor.md` | Media | Alto — verificación por tarea |
| B: workflow-execute | `skills/workflow-execute/SKILL.md` | Baja | Medio — convención orquestada |
| C: verifier agent | `agents/verifier.md` + orquestación | Alta | Alto — pero overhead significativo |
| D: referencia + convención | `references/agentic-loop.md` + SKILL.md | Muy baja | Bajo — depende del LLM |

**Recomendación preliminar:** Opción B + D combinadas.

- **Opción B** agrega el paso Verify en workflow-execute/SKILL.md con tabla de checks por tipo de tarea — suficiente para el 80% de casos.
- **Opción D** crea `references/agentic-loop.md` como documentación del patrón, para que Claude lo entienda en contexto y aplique con juicio en los casos no cubiertos por la tabla.
- **Opción A** queda como mejora futura: refinar task-executor.md cuando se tenga más datos de qué checks son más útiles (TD para después de piloto).

---

## 6. Impacto en arquitectura del framework

### 6.1 Herramientas del Agentic Loop en la arquitectura de pm-thyrox

Según la documentación oficial, las 5 categorías de herramientas del loop son:

| Categoría | Herramientas | Uso en pm-thyrox |
|-----------|-------------|-----------------|
| File system | Read/Write/Edit/Glob | Todas las fases — ya integrado |
| Terminal | Bash, exec_cmd | Phases 6-7, scripts — ya integrado |
| Web | WebFetch/WebSearch | Phase 1-2 (research) — disponible |
| IDE | (no aplica en CLI) | — |
| External APIs | MCP tools | MCP servers disponibles — subutilizado |

### 6.2 Extensibilidad (L1/L2/L3)

La documentación define tres niveles:

- **L1 (Model + Tools):** Claude nativo con herramientas básicas. El framework pm-thyrox ya opera en L1.
- **L2 (Extensions):** Skills, MCP servers, hooks, subagentes. pm-thyrox ya usa L2 parcialmente (Skills, hooks, agents).
- **L3 (Plugins):** Extensiones externas para IDEs. No relevante para este proyecto.

**Conclusión:** pm-thyrox ya está en L2. El Agentic Loop no requiere subir a L3.

### 6.3 Subagentes para paralelización

La documentación menciona subagentes para paralelizar subtareas. pm-thyrox ya tiene:
- `task-executor.md` para ejecución
- `task-planner.md` para planificación
- Agentes tech-específicos (nodejs, react, etc.)

Lo que falta: **mapeo explícito de cada fase del loop a qué agente/herramienta la ejecuta**. Actualmente el mapping es implícito.

---

## 7. Mapeo Gather → Execute → Verify a fases SDLC

| Loop Phase | Fase SDLC equivalente | Herramienta |
|-----------|----------------------|-------------|
| Gather | Phase 1 ANALYZE | workflow-analyze (Read/Grep/WebFetch) |
| Gather | Phase 2 STRATEGY | workflow-strategy (Read/WebFetch) |
| Execute | Phase 6 EXECUTE | task-executor (Write/Edit/Bash) |
| Verify | **GAP — no existe** | workflow-execute debería añadirlo |
| Iterate | Phase 6 loop (más tareas) | task-executor (ya itera) |

El loop completo ocurre dentro de Phase 6 en cada tarea: Gather (leer SPEC) → Execute (implementar) → Verify (validar) → siguiente tarea.

---

## 8. Conclusiones del análisis

1. **Brecha primaria:** No hay paso Verify después de cada tarea en Phase 6. La verificación es reactiva (solo ante fallos) o tardía (solo antes de Phase 7).

2. **Implementación recomendada:** Opción B + D.
   - Agregar tabla de checks Verify en `workflow-execute/SKILL.md` (por tipo de tarea).
   - Crear `references/agentic-loop.md` documentando el patrón oficial.

3. **No se necesita:** Nuevo agente verifier (overhead excesivo). task-executor puede permanecer simple y delegar el "qué verificar" al orquestador SKILL.md.

4. **Oportunidad secundaria:** Mapeo explícito de agentes a fases del loop en la documentación del framework.

5. **Tamaño:** WP **pequeño** — afecta 2 archivos principales + 1 nuevo reference. Fases: 1, 2, 6, 7.

---

## 9. Stopping Point Manifest

| SP-ID | Momento | Descripción | Estado |
|-------|---------|-------------|--------|
| SP-01 | Phase 1 → 2 | Validar análisis y dirección antes de estrategia | [ ] pendiente |
| SP-02 | Phase 5 → 6 | Autorizar inicio de ejecución | [ ] pendiente |
| SP-03 | Phase 6 → 7 | Confirmar que ejecución fue correcta | [ ] pendiente |
