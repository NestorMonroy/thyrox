```yml
created_at: 2026-04-17 20:00:00
project: THYROX
work_package: 2026-04-17-17-58-13-goto-problem-fix
phase: Phase 3 — DIAGNOSE
author: deep-review agent
status: Completado
version: 1.0.0
veredicto: GO CONDICIONAL — 3 gaps bloqueantes, 4 no bloqueantes
```

# Deep-Review: Cobertura Task Plan — goto-problem-fix (ÉPICA 41)

**Veredicto: GO CONDICIONAL**

El task plan cubre los 30 problemas identificados (30/30). Los 3 gaps bloqueantes son
modificaciones de texto a tareas existentes — no requieren nuevas tareas de larga duración.

---

## Cobertura de los 30 problemas

| Problema | Tarea | Estado |
|----------|-------|--------|
| A-1 session-start.sh fallback | T-002 | ✅ |
| A-2 session-resume.sh phase→stage | T-003 | ✅ |
| A-3 session-resume.sh fallback duplicado | T-003 | ✅ |
| A-4 close-wp.sh sed pattern | T-001 | ✅ |
| A-5 close-wp.sh body cleanup | T-001 | ✅ con gap de detalle (Gap 1) |
| A-6 close-wp.sh update-state.sh | T-001 | ✅ con gap de infra (Gap 1) |
| GAP-02 session-start.sh ≤120 líneas | T-002 | ✅ |
| B-1..B-9 README fixes | T-009 | ✅ con gap operacional (Gap 3) |
| B-10 ARCHITECTURE.md | T-011 | ✅ con gap de especificación (Gap 4) |
| B-11 DECISIONS.md | T-013 | ✅ con gap de destino (Gap 2) |
| D-1 state-management.md body | T-006 | ✅ |
| D-2 methodology-selection-guide | T-014 | ✅ |
| D-3 coordinator-integration guide | T-015 | ✅ |
| D-4 methodology_step namespacing | T-007 | ✅ con gap de ubicación (Gap 5) |

---

## Gaps bloqueantes (resolver antes de Stage 10)

### Gap 1 — T-001: `close-wp.sh` no declara `PROJECT_ROOT`

`close-wp.sh` usa `NOW_FILE=".thyrox/context/now.md"` (ruta relativa). El fix A-6
agrega `bash ${PROJECT_ROOT}/.claude/scripts/update-state.sh` pero `PROJECT_ROOT` no
está declarado en el script. Si el hook se invoca fuera del root del repo, falla
silenciosamente.

**Fix:** Agregar al inicio de `close-wp.sh` (antes de `NOW_FILE`):
```bash
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NOW_FILE="${PROJECT_ROOT}/.thyrox/context/now.md"
```
Y la llamada a `update-state.sh` usa `${PROJECT_ROOT}/.claude/scripts/update-state.sh`.

### Gap 2 — T-013: destino ambiguo y verbo incorrecto para `DECISIONS.md`

T-013 dice "Actualizar `DECISIONS.md`" pero el archivo **no existe** en el repo.
Debe decir "Crear `DECISIONS.md`" en la **raíz del proyecto** (`/DECISIONS.md`),
con una tabla-índice que enlaza los 22 ADRs en `.thyrox/context/decisions/`.

### Gap 3 — T-009: 9 fixes en un solo Edit sin leer el estado actual — riesgo alto

README.md tiene ~248 líneas con cambios en secciones no-contiguas. Aplicar 9 fixes
en un Edit sin leer el estado actual puede fallar o introducir regresiones.

**Fix:** Agregar prerequisito explícito: leer README.md completo justo antes del Edit.
Si el Edit falla por extensión, dividir en T-009a (fixes puntuales B-1/B-2/B-3/B-4/B-5/B-6/B-9)
y T-009b (reescritura de secciones B-7/B-8 — contenido extenso).

---

## Gaps no bloqueantes

### Gap 4 — T-011: "Patrón 3 + Patrón 5" son identificadores opacos

No aparecen en ningún artefacto del WP. El ejecutor puede inventar contenido.
**Fix:** Reemplazar por la descripción del diagnose: "4 capas: intake → routing-rules.yml
→ coordinators → artifact-ready signals".

### Gap 5 — T-007: "archivo de referencia apropiado" es ambiguo

D-4 va en `state-management.md` (mismo archivo que T-006), no en un archivo nuevo.
**Fix:** Especificar "en `state-management.md`, agregar subsección `### methodology_step — namespacing`".

### Gap 6 — ROADMAP.md no se actualiza al cierre

ÉPICA 41 tiene entrada en ROADMAP.md con estado desactualizado. Sin una tarea de
actualización, se reproduce el mismo patrón de "migración parcial" que esta ÉPICA corrige.
**Fix:** Agregar T-020 en el bloque Cierre.

### Gap 7 — `focus.md` no se actualiza al cerrar

El flujo de sesión (CLAUDE.md) requiere actualizar `focus.md` + `now.md` al cierre.
T-018 solo actualiza `now.md`.
**Fix:** Agregar actualización de `focus.md` en T-018 o en T-020.

---

## Verificación de archivos reales

| Archivo | Estado | Fix requerido |
|---------|--------|--------------|
| `.claude/scripts/close-wp.sh` | 20 líneas, sin PROJECT_ROOT, sin stage:/flow: | T-001 |
| `.claude/scripts/session-start.sh` | 129 líneas, fallback activo L61-63 | T-002 |
| `.claude/scripts/session-resume.sh` | 82 líneas, `grep "^phase:"` en L36, fallback L46-48 | T-003 |
| `README.md` | ~248 líneas, todos B-1..B-9 activos | T-009 |
| `ARCHITECTURE.md` | Existe, 112 líneas | T-011 |
| `DECISIONS.md` (raíz) | **No existe** | T-013 (Crear) |
| `.claude/references/state-management.md` | Existe, sin body/methodology_step | T-006 + T-007 |
| `ROADMAP.md` | ÉPICA 41 desactualizado | T-020 (nuevo) |
