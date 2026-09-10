```yml
created_at: 2026-04-17 18:51:36
project: THYROX
work_package: 2026-04-17-17-58-13-goto-problem-fix
phase: Phase 3 — DIAGNOSE
author: NestorMonroy
status: Borrador
```

# Diagnose — goto-problem-fix (ÉPICA 41)

Causa raíz y fix exacto para los 30 problemas confirmados en Stage 1 DISCOVER.

---

## Causa raíz sistémica

Todos los clusters comparten un patrón común: **migración parcial**. Cuando el framework
evoluciona (renombrar un campo, mover un directorio, cambiar la interfaz pública), se
actualiza el core (CLAUDE.md, el skill principal, los scripts más visibles) pero los
componentes secundarios quedan en el estado anterior.

| Migración incompleta | ÉPICA que migró | Qué actualizó | Qué olvidó |
|---------------------|----------------|----------------|------------|
| `phase:` → `stage:` | ÉPICA 39 | `session-start.sh` línea 48 (con fallback retrocompat) | `session-resume.sh` línea 36, `close-wp.sh` línea 18 |
| `pm-thyrox` → `thyrox` | ÉPICA 29 | CLAUDE.md, agents, registry | README.md (5 ocurrencias) |
| `.claude/context/` → `.thyrox/context/` | ÉPICA 35 | CLAUDE.md, hooks, scripts | README.md |
| 7 fases SDLC → 12 stages THYROX | ÉPICA 39 | CLAUDE.md, workflow-* skills, session-start.sh | README.md |
| `/pm-thyrox:*` → `/thyrox:*` | ÉPICA 31 | plugin.json, CLAUDE.md | README.md |
| Body de `now.md` como dato vivo | Siempre existió | nada | `close-wp.sh` no lo limpia; `state-management.md` no lo documenta |

**Diagnóstico:** No existe un proceso de "actualización de README al cerrar ÉPICA". Cada ÉPICA
actualiza `ROADMAP.md` y `CHANGELOG.md` pero no el README público. La deuda acumuló 4 ÉPICAs
(29, 31, 35, 39) sin toque al README.

---

## CLUSTER A — Análisis de cada bug con fix exacto

### A-1 | `session-start.sh` líneas 61-63 — Fallback incorrecto

**Causa raíz:**
El fallback fue diseñado para el caso donde `now.md` no existe o está corrupto.
Pero la condición `[ -z "$ACTIVE_WP" ]` es TRUE tanto cuando `now.md` no existe COMO cuando
`current_work: null`. Ambos casos ejecutan el mismo fallback — el segundo es incorrecto.

```bash
# Estado en now.md:     current_work: null  →  ACTIVE_WP = "" (correcto: no hay WP)
# Condición:            [ -z "" ] = TRUE     →  Fallback activa (incorrecto: hay null explícito)
```

**Fix exacto — eliminar bloque de fallback (líneas 61-63):**
```bash
# ELIMINAR estas 3 líneas:
if [ -z "$ACTIVE_WP" ] && [ "$PHASE" != "complete" ] && [ -d "${CONTEXT_DIR}/work" ]; then
    ACTIVE_WP=$(ls -1 "${CONTEXT_DIR}/work" 2>/dev/null | grep -E '^[0-9]{4}-' | sort -r | head -1)
fi
```

**Razonamiento:** El fallback YA no es necesario porque:
1. `now.md` siempre existe (está en git, nunca se elimina)
2. `current_work: null` es el estado oficial de "sin WP activo"
3. El script ya maneja el caso `ACTIVE_WP = ""` correctamente en las líneas 99-107

**Impacto del fix:** `session-start.sh` pasa de 129 líneas a 126 líneas (dentro del límite de 120 restringido — revisar si hay otras líneas que comprimir).

---

### A-2 | `session-resume.sh` línea 36 — Campo `phase:` obsoleto

**Causa raíz:**
`session-resume.sh` no recibió el mismo tratamiento que `session-start.sh` durante ÉPICA 39.
`session-start.sh` línea 48-49 tiene el patrón correcto: busca `stage:` primero, luego `phase:` como fallback.
`session-resume.sh` línea 36 solo busca `phase:` — no tiene el fallback.

**Fix exacto — línea 36:**
```bash
# ANTES:
PHASE=$(grep "^phase:" "${CONTEXT_DIR}/now.md" 2>/dev/null | head -1 | sed 's/phase: *//')

# DESPUÉS (mismo patrón que session-start.sh líneas 48-49):
PHASE=$(grep "^stage:" "${CONTEXT_DIR}/now.md" 2>/dev/null | head -1 | sed 's/stage: *//')
[ -z "$PHASE" ] && PHASE=$(grep "^phase:" "${CONTEXT_DIR}/now.md" 2>/dev/null | head -1 | sed 's/phase: *//')
```

---

### A-3 | `session-resume.sh` líneas 46-48 — Mismo fallback duplicado (DA-002)

**Causa raíz:**
La lógica fue copiada de `session-start.sh` pero también copió el bug A-1.
El comentario `DA-002` documenta que es intencional la duplicación — pero no que heredó el bug.

**Fix exacto — eliminar bloque de fallback (líneas 46-48), mismo que A-1:**
```bash
# ELIMINAR estas 3 líneas:
if [ -z "$ACTIVE_WP" ] && [ "$PHASE" != "complete" ] && [ -d "${CONTEXT_DIR}/work" ]; then
    ACTIVE_WP=$(ls -1 "${CONTEXT_DIR}/work" 2>/dev/null | grep -E '^[0-9]{4}-' | sort -r | head -1)
fi
```

El bloque posterior `if [ -z "$ACTIVE_WP" ]; then exit 0` en línea 51-53 ya maneja el
caso correctamente: si no hay WP, sale silenciosamente.

---

### A-4 | `close-wp.sh` línea 18 — Sed pattern `phase:` no toca `stage:`

**Causa raíz:**
`close-wp.sh` fue escrito antes de ÉPICA 39 (renaming a `stage:`). La ÉPICA 39 actualizó
el schema de `now.md` pero no actualizó el sed pattern de `close-wp.sh`.

**Fix exacto — líneas 16-19:**
```bash
# ANTES:
sed -i \
  -e "s|^current_work: .*|current_work: null|" \
  -e "s|^phase: .*|phase: null|" \
  -e "s|^updated_at: .*|updated_at: $DATE|" \
  "$NOW_FILE"

# DESPUÉS (agrega stage:, mantiene phase: para retrocompat):
sed -i \
  -e "s|^current_work: .*|current_work: null|" \
  -e "s|^stage: .*|stage: null|" \
  -e "s|^phase: .*|phase: null|" \
  -e "s|^flow: .*|flow: null|" \
  -e "s|^methodology_step: .*|methodology_step: null|" \
  -e "s|^updated_at: .*|updated_at: $DATE|" \
  "$NOW_FILE"
```

Agregamos `flow:` y `methodology_step:` que también deben limpiarse al cerrar un WP.

---

### A-5 | `close-wp.sh` — No limpia body de `now.md`

**Causa raíz:**
`close-wp.sh` fue diseñado solo para limpiar el YAML. El body `# Contexto` es gestionado
por el LLM, no por scripts — pero al cerrar un WP, el body queda con información stale
que Claude lee en la siguiente sesión y puede confundirlo.

**Fix exacto — agregar reescritura del body al final del script:**
```bash
# Agregar al final de close-wp.sh, después del sed:
# Limpiar cuerpo del now.md (evitar stale context en próxima sesión)
python3 - "$NOW_FILE" <<'PYEOF'
import sys, re
path = sys.argv[1]
content = open(path).read()
# Separar YAML (entre ``` o hasta el primer # heading)
# Preservar todo hasta y excluyendo "# Contexto" y lo que sigue
parts = re.split(r'\n# Contexto\b', content, maxsplit=1)
if len(parts) == 2:
    yaml_part = parts[0]
    new_content = yaml_part + "\n# Contexto\n\nSin WP activo.\n"
    open(path, 'w').write(new_content)
PYEOF
```

**Restricción respetada:** `close-wp.sh` debe ser bash puro. Sin embargo, la restricción
original era "sin python3 como dependencia para el sed de YAML". Para el body, python3 es
la herramienta más segura para reemplazar texto multilínea. Alternativa sin python3:

```bash
# Alternativa bash pura (printf + head):
YAML_LINES=$(grep -n "^# Contexto" "$NOW_FILE" | head -1 | cut -d: -f1)
if [ -n "$YAML_LINES" ]; then
    YAML_LINES=$((YAML_LINES - 1))
    head -n "$YAML_LINES" "$NOW_FILE" > "${NOW_FILE}.tmp"
    printf "\n# Contexto\n\nSin WP activo.\n" >> "${NOW_FILE}.tmp"
    mv "${NOW_FILE}.tmp" "$NOW_FILE"
fi
```

---

### A-6 | `close-wp.sh` — No invoca `update-state.sh`

**Causa raíz:**
`close-wp.sh` fue escrito sin incluir la actualización de `project-state.md`. La referencia
`state-management.md` documenta que al cerrar WP se debe ejecutar `update-state.sh`, pero
este paso nunca se automatizó.

**Fix exacto — agregar llamada al final:**
```bash
# Agregar al final de close-wp.sh:
# Regenerar project-state.md
if [ -f "${PROJECT_ROOT}/.claude/scripts/update-state.sh" ]; then
    bash "${PROJECT_ROOT}/.claude/scripts/update-state.sh" 2>/dev/null || true
fi
```

El `|| true` garantiza que si `update-state.sh` falla por alguna razón, `close-wp.sh`
no falla. El cierre del WP no debe depender de la generación del state.

---

## CLUSTER B — Análisis del README

**Causa raíz unificada:** El README fue creado como "template inicial" (v0.1.0, 2026-03-25)
y nunca actualizado. Las ÉPICAs 29, 31, 35, 39, 40 actualizaron CLAUDE.md, agents, scripts,
pero ninguna incluyó "actualizar README" en su task plan.

**Fix agrupado por sección:**

### B-1 + B-3 + B-5 + B-4 | Metadata y descripción general (líneas 1-44)

**Problema:** Versión 1.0, fecha 2026-03-25, "7 fases SDLC", "pm-thyrox", "19 guías + 25 templates"

**Fix:**
- Frontmatter: `Versión: 2.8.0`, `Fecha: 2026-04-17`
- Descripción: "meta-framework agentic con 11 coordinators metodológicos"
- Características: reemplazar "7 fases SDLC" por "12 stages THYROX + 11 coordinators"
- Cifras: "47 referencias + 52 templates"

### B-2 | Quick Start (líneas 92-116)

**Problema:** `bash setup-template.sh` (no existe), `pm-thyrox`, "Phase 1: ANALYZE"

**Fix:**
```bash
# ANTES:
bash setup-template.sh

# DESPUÉS:
bash bin/thyrox-init.sh
```
Reemplazar todas las referencias `pm-thyrox` → `thyrox` y actualizar comandos.

### B-6 | Estructura del directorio (líneas 48-90)

**Problema:** `.claude/context/` (migrado a `.thyrox/context/`), `pm-thyrox/` en skills

**Fix:** Reescribir el árbol de directorios con la estructura real v2.8.0:
```
.claude/
├── agents/          ← 23 agentes nativos
├── skills/
│   └── thyrox/      ← skill principal (no pm-thyrox)
│   └── workflow-*/  ← 12 skills de stages
└── scripts/

.thyrox/             ← state management (no .claude/context/)
├── context/
│   ├── now.md
│   └── work/
└── registry/
```

### B-7 | Metodología (líneas 118-146)

**Problema:** 7 fases SDLC con nombres anteriores

**Fix:** Reescribir sección "Metodología" con los 12 stages THYROX reales + sección Coordinators.

### B-4 | Comandos útiles (líneas 205-226)

**Problema:** `/task:show`, `/task:next`, `/changelog:generate`, `/status`

**Fix:** Reemplazar con comandos reales `/thyrox:*`:
```bash
# /thyrox:discover — iniciar Phase 1
# /thyrox:analyze  — Phase 3 análisis profundo
# /thyrox:execute  — Phase 10 implementar tareas
# /thyrox:track    — Phase 11 cerrar WP
```

### B-8 | Sección Coordinators (NUEVA)

El README no tiene ninguna mención de los 11 coordinators. Agregar sección nueva:

```markdown
## Coordinators Metodológicos

THYROX incluye 11 coordinators especializados. Cada uno ejecuta su metodología propia:

| Coordinator | Metodología | Fases propias | Cuándo usar |
|-------------|------------|---------------|------------|
| `babok-coordinator` | BABOK v3 | 6 knowledge areas (no-secuencial) | Análisis de negocio |
| `dmaic-coordinator` | Six Sigma DMAIC | 5 (D→M→A→I→C) | Mejora con datos estadísticos |
| `pdca-coordinator` | PDCA | 4 cíclicas | Mejora continua iterativa |
| `rup-coordinator` | RUP | 4 + milestones LCO/LCA/IOC/PD | Desarrollo de software |
| `pmbok-coordinator` | PMBOK | 5 process groups | Gestión de proyecto formal |
| `rm-coordinator` | Requirements Mgmt | 5 con retornos condicionales | Ciclo de vida de requisitos |
| `lean-coordinator` | Lean Six Sigma | 5 (D→M→A→I→C Lean) | Eliminación de desperdicios |
| `bpa-coordinator` | BPA / BPMN | 6 (identify→map→analyze→design→implement→monitor) | Rediseño de procesos |
| `pps-coordinator` | Toyota TBP / PPS | 6 + A3 Report | Resolución de problemas |
| `sp-coordinator` | Strategic Planning | 8 con ciclo estratégico | Planificación estratégica |
| `cp-coordinator` | McKinsey/BCG CP | 7 (initiation→evaluate) | Problemas complejos de consultoría |

Activar con: `claude --agent babok-coordinator` o desde `/thyrox:discover`.
```

### B-9 | Versión y fecha (línea 248)

**Fix:** `Versión: 2.8.0` · `Última actualización: 2026-04-17`

### B-10 | ARCHITECTURE.md

**Causa raíz:** ARCHITECTURE.md fue escrito en las primeras ÉPICAs (~FASE 3-5) cuando el
framework era un SDLC simple. No fue actualizado durante ninguna de las ÉPICAs de evolución.

**Fix:** Reescribir con la arquitectura real: meta-framework agentic, 4 capas (intake →
routing-rules.yml → coordinators → artifact-ready signals), diagrama de flujo.

### B-11 | Índice de ADRs

**Fix:** Crear `DECISIONS.md` en `.thyrox/context/decisions/` con tabla de los 19+ ADRs.

---

## CLUSTER D — Gaps de documentación

### D-1 | `state-management.md` no documenta el body de `now.md`

**Fix exacto — agregar sección al final de `state-management.md`:**

```markdown
## Body de now.md — sección `# Contexto`

Además del YAML, `now.md` tiene un cuerpo markdown bajo `# Contexto`.
Este cuerpo es gestionado por el LLM — describe en lenguaje natural el estado del WP activo.

**Al abrir WP (Phase 1):** El LLM escribe un resumen del WP y objetivos.
**Al cerrar WP (Phase 7):** `close-wp.sh` sobreescribe el body con "Sin WP activo."
  para evitar que información stale confunda la próxima sesión.
```

### D-2 | Guías por coordinator

**Scope:** Una página por coordinator con: qué hace, cuándo usarlo, qué produce.
Ubicación: `.thyrox/registry/methodologies/` (como `{coord}-guide.md`) o en `.claude/references/`.

### D-3 | Decision tree navegable

**Scope:** `methodology-selection-guide.md` ya existe en referencias. Verificar si cubre
los 11 coordinators o necesita actualización.

### D-4 | methodology_step documentado externamente

**Scope:** Agregar a `state-management.md` una sección sobre `now.md::coordinators` y
`methodology_step` tracking.

---

## Dependencias entre fixes

```
A-4 (close-wp body)
  └─ depende de: A-3 (sed pattern corregido) — hacer juntos

A-6 (close-wp invoca update-state)
  └─ independiente — puede hacerse solo

A-1 (session-start fallback)
  └─ independiente

A-2 + A-3 (session-resume phase→stage)
  └─ independientes entre sí pero relacionados

B-1..B-9 (README)
  └─ independientes de A, pero deben hacerse en un solo edit del README
  └─ B-8 (sección coordinators) depende de tener la tabla completa — hacer al final

D-1 (state-management.md)
  └─ mejor hacerlo junto con A-4+A-5 (misma sesión de edición)

D-3 (decision tree)
  └─ verificar methodology-selection-guide.md primero
```

---

## Orden de ejecución propuesto (Stage 10 IMPLEMENT)

**Batch 1 — Scripts (atómico, bajo riesgo):**
1. `close-wp.sh`: A-4 (sed + stage) + A-5 (body) + A-6 (update-state) — todo junto
2. `session-start.sh`: A-1 (eliminar fallback)
3. `session-resume.sh`: A-2 (phase→stage) + A-3 (eliminar fallback) — todo junto

**Batch 2 — state-management.md (D-1 + D-4 juntos):**
4. Agregar secciones de body y coordinators tracking

**Batch 3 — README (B-1..B-9 + B-8 en un solo edit completo):**
5. Reescribir secciones afectadas del README

**Batch 4 — ARCHITECTURE.md (B-10):**
6. Reescribir con arquitectura real v2.8.0

**Batch 5 — ADRs + Guías (B-11 + D-2 + D-3):**
7. DECISIONS.md índice
8. Verificar/actualizar methodology-selection-guide.md
9. Guías por coordinator (si scope lo confirma)
