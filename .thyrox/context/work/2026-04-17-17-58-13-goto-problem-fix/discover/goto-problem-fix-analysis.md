```yml
created_at: 2026-04-17 17:58:13
project: THYROX
analysis_version: 1.0
author: NestorMonroy
status: Borrador
```

# Análisis — goto-problem-fix (ÉPICA 41)

## Visión General

ÉPICA 41 aborda la brecha entre **lo que THYROX es** (v2.8.0: meta-framework con 12 stages, 11 coordinators, routing automático) y **cómo se presenta** (README v0.1.0: template SDLC de 7 fases). El problema tiene dos capas: bugs en scripts de sesión (GO-TO problem inmediato) y deuda documental acumulada desde ÉPICA 29-40.

**Nota de alcance:** el usuario indicó que el alcance se irá descubriendo. Este análisis documenta el estado inicial; stages posteriores profundizarán.

---

## 1. Objetivo / Por qué importa

**Problema 1 — GO-TO scripts:** Al iniciar una sesión con WP cerrado, el hook muestra:
```
Work package activo: context/work/2026-04-16-18-54-38-multi-methodology/
Stage actual: null
```
`current_work: null` → WP cerrado. Pero el fallback de `session-start.sh` lo muestra como "activo". Claude lee señales contradictorias y puede retomar trabajo ya completado.

**Problema 2 — README v0.1.0 vs framework v2.8.0:** README (fecha: 2026-03-25) fue escrito antes de ÉPICA 29 (rename pm-thyrox), ÉPICA 35 (migración context/), ÉPICA 39 (12 stages), ÉPICA 40 (11 coordinators). Describe un sistema que ya no existe.

**Impacto combinado:** Un nuevo usuario que clone THYROX hoy: (a) sigue instrucciones rotas, (b) no sabe que existe un sistema de coordinators, (c) no puede orientarse por la documentación pública.

---

## 2. Stakeholders

| Stakeholder | Necesidad |
|-------------|-----------|
| **NestorMonroy (mantenedor)** | Sesiones sin confusión al inicio; README que refleje la realidad |
| **Claude (asistente)** | GO-TO determinístico: un solo punto de verdad para "¿qué hago ahora?" |
| **Usuarios futuros (adopters)** | README correcto como punto de entrada; guía de coordinators |

---

## 3. Análisis del informe externo recibido

El usuario proporcionó un **análisis crítico externo** ("ANÁLISIS CRÍTICO: THYROX — Inconsistencias Documentadas", 2026-04-17). Evaluación por cluster:

### 3.1 Hallazgos CORRECTOS y verificados (README real)

| Claim del informe | Verificación | Evidencia |
|-------------------|-------------|-----------|
| README dice "pm-thyrox" | ✅ CORRECTO | README líneas 67, 108, 115, 120, 138 |
| README dice "setup-template.sh" | ✅ CORRECTO | README línea 102 — archivo no existe |
| README dice "7 fases SDLC" | ✅ CORRECTO | README líneas 38, 68 |
| README dice "19 guías + 25 templates" | ✅ CORRECTO (desactualizado) | Actual: 47 references + 52 templates |
| README muestra `/task:show`, `/task:next` | ✅ CORRECTO | README líneas 210, 213 — obsoletos |
| README dice "Phase 1: ANALYZE" | ✅ CORRECTO (obsoleto) | Ahora es Stage 1: DISCOVER |
| README menciona `.claude/context/` | ✅ CORRECTO (incorrecto) | Migrado a `.thyrox/context/` en ÉPICA 35 |
| README omite coordinators | ✅ CORRECTO | Cero referencias a los 11 coordinators |
| README versión 1.0, fecha 2026-03-25 | ✅ CORRECTO | Framework es v2.8.0, 2026-04-17 |
| ARCHITECTURE.md de 85 líneas, sin meta-framework | ✅ PROBABLEMENTE CORRECTO | pendiente verificar |
| ADRs sin índice centralizado | ✅ CORRECTO | 19 ADRs en decisions/ sin DECISIONS.md |

### 3.2 Hallazgos DESACTUALIZADOS — ya resueltos en ÉPICA 39/40

| Claim del informe | Estado real | Evidencia |
|-------------------|-------------|-----------|
| "12 fases aprobado pero NO implementado" | ❌ INCORRECTO | ÉPICA 39 implementó los 12 stages completos. Los 12 workflow-* skills existen. |
| "ps8.yml en registry" | ❌ INCORRECTO | Renombrado a `pps.yml` en ÉPICA 40 T-001 |
| "7 coordinators" | ❌ INCORRECTO | Son 12: lean, pps, sp, cp, bpa + pdca, dmaic, rup, rm, pm, ba + thyrox-coordinator |
| "Routing logic NOT implemented" | ❌ PARCIALMENTE INCORRECTO | `routing-rules.yml` creado (T-027), `thyrox-coordinator` reworked con 5 preguntas diagnósticas (T-028) |
| "Artifact tracking NOT implemented" | ❌ PARCIALMENTE INCORRECTO | `artifact-registry.md.template` (T-024), artifact-ready signals en 11 coordinators (T-026) |
| "Inter-coordinator protocol missing" | ❌ PARCIALMENTE INCORRECTO | artifact-ready signals + `now.md::coordinators` tracking implementados |

### 3.3 Hallazgos VÁLIDOS no cubiertos por los scripts GO-TO

| Gap | Prioridad | ÉPICA sugerida |
|-----|-----------|----------------|
| No existe guía de usuario por coordinator | Alta | ÉPICA 41 o 42 |
| No existe decision tree navegable para usuarios | Alta | ÉPICA 41 |
| README no describe lo que THYROX realmente es | Alta | ÉPICA 41 |
| ARCHITECTURE.md no documenta meta-framework | Media | ÉPICA 41 o 42 |
| No existe índice de ADRs, referencias, agents | Media | ÉPICA 42 |
| Multi-coordinator orchestration automática | Baja (largo plazo) | ÉPICA 43+ |

### 3.4 Hallazgos NO mencionados en el informe externo (descubiertos en ÉPICA 41 Stage 1)

| Gap | Impacto | Fix |
|-----|---------|-----|
| `session-start.sh` fallback muestra WP cerrado como activo | 🔴 Alto | Eliminar fallback de directorio cuando `current_work: null` |
| `session-resume.sh` usa `phase:` (obsoleto, debería ser `stage:`) | 🔴 Alto | Una línea: `grep "^phase:"` → `grep "^stage:"` |
| `close-wp.sh` no limpia cuerpo de `now.md` (stale) | 🔴 Alto | Sobreescribir `# Contexto` al cerrar |
| `close-wp.sh` no invoca `update-state.sh` | 🟠 Medio | Agregar llamada al final del script |

---

## 4. Uso operacional

**Sesión típica de inicio:**
1. Hook `session-start.sh` lee `now.md::current_work` y `now.md::stage`
2. Si `current_work: null` → muestra "Sin WP activo" (con el fix propuesto)
3. Usuario dice "arranca ÉPICA 41" → Claude crea WP y actualiza now.md

**Sesión de nuevo usuario:**
1. Clona repo → lee README → sigue instrucciones → falla en `bash setup-template.sh`
2. No sabe que existe `bin/thyrox-init.sh` ni los coordinators
3. El framework no tiene onboarding funcional

---

## 5. Atributos de calidad prioritarios

- **Determinismo**: GO-TO de sesión debe producir el mismo output dado el mismo `now.md`
- **Corrección**: README debe describir el sistema real (v2.8.0)
- **Completitud**: La historia de coordinators debe ser accesible sin explorar agents/

---

## 6. Restricciones

- `close-wp.sh` usa `sed -i` — solución de bash pura, sin python3 como dependencia
- `session-start.sh` debe mantenerse ≤120 líneas (legibilidad del hook)
- README no puede reescribirse completamente en una sola sesión — requiere scope acotado por iteración
- No cambiar el schema de `now.md` YAML (campos: `current_work`, `stage`, `flow`, `methodology_step`) — son compatibles con hooks y scripts existentes

---

## 7. Contexto / sistemas vecinos

```
session-start.sh     → lee now.md::current_work, stage
session-resume.sh    → lee now.md::phase (BUG: debería ser stage)
sync-wp-state.sh     → escribe now.md::current_work en PostToolUse Write
close-wp.sh          → actualiza now.md YAML pero NO el cuerpo
update-state.sh      → regenera project-state.md (no llamado automáticamente)
README.md            → punto de entrada para nuevos usuarios — desactualizado
ARCHITECTURE.md      → descripción arquitectónica — incompleta
```

---

## 8. Fuera de alcance (ÉPICA 41)

- Multi-coordinator orchestration automática (ÉPICA 43+)
- Reescritura completa del README (scope incremental: fixes críticos + sección coordinators)
- Índice centralizado de ADRs/referencias (ÉPICA 42)
- Coordinator user guides individuales (ÉPICA 42)

---

## 9. Criterios de éxito

| Criterio | Métrica |
|----------|---------|
| GO-TO determinístico | `session-start.sh` muestra "Sin WP activo" cuando `current_work: null` |
| `session-resume.sh` funcional | Lee `stage:` correctamente |
| `close-wp.sh` completo | Limpia body de now.md + invoca update-state.sh |
| README funcional | `bash setup-template.sh` → error documentado + alternativa correcta |
| README describe coordinators | Nueva sección "Coordinators" con tabla de 11 + cuándo usar |

---

## Stopping Point Manifest

| SP | Stage | Tipo | Evento | Acción requerida |
|----|-------|------|--------|-----------------|
| SP-01 | 1→3 | gate-fase | Análisis completo | Usuario aprueba hallazgos y priorización |
| SP-02 | 3→8 | gate-decision | Scope acotado | Confirmar qué entra en ÉPICA 41 vs 42 |
| SP-03 | 8→10 | gate-fase | Plan de tareas presentado | Aprobación explícita antes de modificar scripts y README |
| SP-04 | Pre-scripts | gate-operacion | Modificar session-start.sh, session-resume.sh, close-wp.sh | Confirmar cada cambio de script individualmente |
