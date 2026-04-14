```yml
Fecha: 2026-03-28
Tipo: Phase 3 (PLAN)
Work: Multi-Interaction Evals — 23 escenarios, 7 automatizados, 16 manuales
```

# Plan: Multi-Interaction Evals

## Scope

Implementar y ejecutar 23 escenarios de evaluación multi-interacción para verificar que pm-thyrox funciona end-to-end, no solo en primera interacción.

**In scope:**
- 7 evals automatizados con contexto simulado
- 16 evals documentados como test cases manuales
- Script de ejecución automatizada
- JSON con todos los escenarios
- Resultados documentados

**Out of scope:**
- Modificar SKILL.md basado en resultados (siguiente work package)
- Ejecutar los 16 evals manuales (requieren sesión interactiva)
- Description optimization con run_loop.py

---

## Tasks

### Bloque 1: Crear el JSON de evals (T-001 a T-003)

- [x] [T-001] Crear `evals/multi-interaction-evals.json` con los 23 escenarios
  - Formato por escenario:
    ```json
    {
      "id": "MI-01",
      "category": "continuity",
      "prompt": "...",
      "context_setup": { "files": [...], "description": "..." },
      "expected_behavior": "...",
      "expectations": ["...", "..."],
      "automated": true/false,
      "priority": 1/2/3
    }
    ```
  - Los 7 automatizados tienen `context_setup` con archivos a crear
  - Los 16 manuales tienen `automated: false` y `context_setup: null`

- [x] [T-002] Definir archivos de contexto para cada eval automatizado
  - MI-01 (reanudar trabajo):
    ```
    context/focus.md → "Dirección: migración de base de datos"
    context/now.md → "current_work: work/2026-03-25-migración-db/, phase: execute"
    context/work/2026-03-25-migración-db/plan.md →
      "- [x] T-001 Backup de datos
       - [x] T-002 Crear schema nuevo
       - [x] T-003 Migrar tabla usuarios
       - [x] T-004 Migrar tabla productos
       - [x] T-005 Verificar integridad"
    ```
  - MI-02 (cold boot existente):
    ```
    context/focus.md → "5 work packages completados. Proyecto activo."
    context/now.md → "cold_boot: true, last_session: 2026-03-20"
    context/work/ → 5 directorios vacíos con nombres de trabajo
    ROADMAP.md → con items marcados [x] y [ ]
    ```
  - MI-05 (Phase 6 interrumpida):
    ```
    context/work/2026-03-27-auth-system/plan.md →
      "- [x] T-001 Setup proyecto
       - [x] T-002 Schema de usuarios
       - [x] T-003 Endpoint de registro
       - [x] T-004 Endpoint de login
       - [x] T-005 JWT generation
       - [x] T-006 Refresh tokens
       - [x] T-007 Roles y permisos
       - [x] T-008 Tests de integración
       - [x] T-009 Documentación API
       - [x] T-010 Code review"
    context/focus.md → "Auth system en Phase 6. T-005 completado."
    ```
  - MI-13 (implementación falló):
    ```
    context/work/2026-03-27-auth-system/plan.md → (mismo que MI-05)
    context/focus.md → "Auth system. T-006 refresh tokens FALLÓ. Error: token expiry no se calcula correctamente."
    ```
  - MI-21 (segunda interacción FE-01):
    ```
    context/work/2026-03-28-inventario/spec.md →
      "# Análisis: Sistema de Inventario
       ## Respuestas del usuario
       - Tienda de ropa, 500 productos, 2 empleados
       - Necesita: stock, alertas, reportes, solo web
       - Stack: por definir
       ## Requisitos identificados
       - R-01: Gestión de productos (CRUD)
       - R-02: Control de stock (entradas/salidas)
       - R-03: Alertas de stock bajo
       - R-04: Reportes básicos"
    context/focus.md → "Inventario. Phase 1 ANALYZE completado."
    ```
  - MI-22 (status con plan.md activo):
    ```
    context/work/2026-03-26-cache-system/plan.md →
      "- [x] T-001 Evaluar Redis vs Memcached (R-01)
       - [x] T-002 Instalar Redis (R-01)
       - [x] T-003 Implementar cache de sesiones (R-02)
       - [x] T-004 Implementar cache de queries DB (R-03)
       - [x] T-005 Configurar TTL por tipo de dato (R-04)
       - [x] T-006 Tests de invalidación (R-05)
       - [x] T-007 Monitoreo de hit rate (R-06)"
    context/focus.md → "Cache system en Phase 6."
    context/now.md → "current_work: work/2026-03-26-cache-system/, phase: execute"
    ```
  - MI-23 (descomposición con trazabilidad):
    ```
    No necesita archivos de contexto — el prompt es explícito:
    "Descompón la implementación de un sistema de búsqueda con Elasticsearch.
     Requisitos: R-01 búsqueda full-text, R-02 filtros facetados, R-03 autocompletado.
     Necesito poder rastrear cada tarea hasta su requisito original."
    ```

- [x] [T-003] Definir expectations para cada eval automatizado
  - MI-01 expectations:
    - "Lee o menciona focus.md, now.md, o plan.md"
    - "Identifica el work package activo de migración"
    - "Identifica T-003 como siguiente tarea"
    - "NO propone empezar de nuevo o crear nuevo work package"
  - MI-02 expectations:
    - "Menciona que hay work packages existentes"
    - "Lee focus.md o now.md"
    - "NO propone crear estructura desde cero"
    - "Identifica la sesión como cold boot o retorno"
  - MI-05 expectations:
    - "Identifica T-006 como siguiente tarea (no T-001)"
    - "Menciona que T-001 a T-005 ya están completados"
    - "NO propone re-analizar ni re-descomponer"
    - "Continúa desde donde se quedó"
  - MI-13 expectations:
    - "Identifica que T-006 falló"
    - "NO continúa con T-007 sin resolver T-006"
    - "Investiga o pregunta sobre el error"
    - "Puede sugerir volver a Phase 4 si el spec es incorrecto"
  - MI-21 expectations:
    - "Propone crear work package o pasar a Phase 3 PLAN"
    - "NO hace más preguntas de análisis (ya están respondidas)"
    - "Usa los requisitos R-01 a R-04 identificados"
    - "Puede sugerir solution strategy o ir directo a plan"
  - MI-22 expectations:
    - "Identifica T-004 como siguiente tarea específica"
    - "Reporta progreso: 3/7 completadas"
    - "Menciona el contexto del cache system"
    - "Dice explícitamente qué hacer ahora"
  - MI-23 expectations:
    - "Tareas tienen IDs con formato [T-NNN] o similar"
    - "Cada tarea referencia su requisito (R-01, R-02, R-03)"
    - "Hay trazabilidad visible entre tasks y requirements"
    - "Orden lógico de implementación"

### Bloque 2: Crear script de ejecución (T-004 a T-005)

- [x] [T-004] Crear `scripts/run-multi-evals.sh`
  - Para cada eval automatizado:
    1. Crear directorio temporal `/tmp/thyrox-eval-workspace/MI-NN/`
    2. Crear estructura `.claude/` con CLAUDE.md y SKILL.md (copiar del real)
    3. Crear archivos de contexto específicos del escenario
    4. Ejecutar `claude -p --add-dir /tmp/thyrox-eval-workspace/MI-NN/ "prompt"`
    5. Capturar respuesta
    6. Verificar expectations con grep
    7. Reportar PASS/FAIL por expectation
    8. Limpiar directorio temporal
  - Output: tabla de resultados por eval + overall pass rate

- [x] [T-005] Crear setup de archivos de contexto como funciones en el script
  - `setup_MI01()` — crea focus.md + now.md + plan.md parcial
  - `setup_MI02()` — crea 5 work packages + ROADMAP
  - `setup_MI05()` — crea plan.md con 5 de 10 tasks completadas
  - `setup_MI13()` — como MI05 pero con error en focus.md
  - `setup_MI21()` — crea spec.md con análisis completado
  - `setup_MI22()` — crea plan.md con 3 de 7 tasks completadas
  - `setup_MI23()` — no necesita setup (prompt explícito)

### Bloque 3: Ejecutar y documentar (T-006 a T-008)

- [x] [T-006] Ejecutar los 7 evals automatizados — 20/26 (76.9%) (2026-03-28)
  - `bash scripts/run-multi-evals.sh`
  - Capturar output completo

- [x] [T-007] Documentar resultados en plan.md (2026-03-28)
  - Tabla de resultados por eval
  - Análisis de fallos
  - Comparación con functional evals de primera interacción (78.6%)

- [x] [T-008] Crear lessons.md con hallazgos
  - ¿Los multi-interaction evals tienen mayor pass rate que first-interaction?
  - ¿Qué gaps del SKILL se revelaron?
  - ¿Qué cambios necesita el SKILL basado en los resultados?

### Bloque 4: Actualizar estado (T-009)

- [x] [T-009] Actualizar focus.md + now.md con resultados finales

---

## Acceptance Criteria

- [x] `evals/multi-interaction-evals.json` tiene 23 escenarios con formato completo
- [x] 7 escenarios tienen `context_setup` con archivos exactos a crear
- [x] 7 escenarios tienen `expectations` verificables con grep
- [x] `scripts/run-multi-evals.sh` ejecuta los 7 automatizados
- [x] Script crea y limpia workspace temporal
- [x] Resultados documentados con pass rate overall
- [x] lessons.md documenta hallazgos
- [x] Cada tarea commiteada inmediatamente después de completarse

---

## Estimaciones

| Bloque | Tasks | Estimación |
|--------|-------|-----------|
| JSON de evals | T-001 a T-003 | 20 min |
| Script de ejecución | T-004 a T-005 | 30 min |
| Ejecutar y documentar | T-006 a T-008 | 25 min |
| Actualizar estado | T-009 | 5 min |
| **Total** | **9 tasks** | **~80 min** |

---

## Dependencias

```
T-001 → T-002 → T-003 (JSON secuencial)
T-004 → T-005 (script secuencial)
T-003 + T-005 → T-006 (ejecutar necesita JSON + script)
T-006 → T-007 → T-008 → T-009 (documentar secuencial)
```

Los bloques 1 y 2 pueden hacerse en paralelo.

---

## Riesgos

| Riesgo | Mitigación |
|--------|-----------|
| `claude -p` no lee archivos de directorio temporal | Usar `--add-dir` flag para dar acceso |
| Respuestas varían entre ejecuciones | Ejecutar cada eval 1 vez (no estadístico, cualitativo) |
| Script de setup es frágil | Funciones separadas por eval, fácil de debuggear |
| Timeout en `claude -p` | 120s timeout por eval |
