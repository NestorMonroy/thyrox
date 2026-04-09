```yml
type: Solution Strategy
work_package: 2026-04-09-17-28-34-auto-operations
fase: FASE 28
created_at: 2026-04-09 20:00:00
```

# Estrategia de solucion — auto-operations

## Deep review de Phase 1 (instruccion del usuario)

Antes de disenar la solucion, revision exhaustiva de lo que Phase 1 identifico vs lo
que se descubrio al iniciar Phase 2.

### Lo que Phase 1 identifico correctamente

- Bug 1: `echo >>` crea duplicado fuera del frontmatter YAML
- Bug 2: `current_work` no se actualiza via hook (solo via instruccion LLM)
- Bug 3: `focus.md` sin mecanismo reactivo
- Root cause: hooks imperativos vs hooks reactivos (PostToolUse)
- create-wp.sh es incorrecto como solucion primaria
- Checkpointing no captura cambios bash → documentado en checkpointing.md

### Gap critico descubierto en Phase 2

**Phase 1 identifico el bug solo en `workflow-analyze/SKILL.md`.**

Al buscar el patron en todos los skills se encontro que el Bug 1 existe en los
7 archivos de workflow-*:

| Skill | Hook actual (bug) |
|-------|------------------|
| workflow-analyze | `echo 'phase: Phase 1' >> .claude/context/now.md` |
| workflow-strategy | `echo 'phase: Phase 2' >> .claude/context/now.md` |
| workflow-plan | `echo 'phase: Phase 3' >> .claude/context/now.md` |
| workflow-structure | `echo 'phase: Phase 4' >> .claude/context/now.md` |
| workflow-decompose | `echo 'phase: Phase 5' >> .claude/context/now.md` |
| workflow-execute | `echo 'phase: Phase 6' >> .claude/context/now.md` |
| workflow-track | `echo 'phase: Phase 7' >> .claude/context/now.md` |

El scope del fix es 7x mayor al estimado en Phase 1.

### Implicacion de alcance

Phase 1 tambien no considero que el cierre del WP (workflow-track) tambien es
LLM-dependiente: `current_work: null` y `phase: null` estan en instrucciones de texto,
no en un hook. Este es un Bug 4 no identificado:

**Bug 4:** El cierre del WP al finalizar Phase 7 no tiene hook reactivo — depende de que
Claude siga instrucciones de workflow-track/SKILL.md para limpiar `now.md`.

---

## Decisiones de diseno

### D-01: Un script central, 7 callers

En lugar de crear 7 scripts distintos, un solo script con argumento:

```bash
# Llamado por cada workflow-*/SKILL.md:
bash .claude/scripts/set-session-phase.sh "Phase N"
```

El script usa `sed -i` con anchor `^` para reemplazar el campo en el frontmatter:

```bash
#!/bin/bash
PHASE="$1"
DATE=$(date '+%Y-%m-%d %H:%M:%S')
sed -i \
  -e "s|^phase: .*|phase: $PHASE|" \
  -e "s|^updated_at: .*|updated_at: $DATE|" \
  .claude/context/now.md
```

El anchor `^` garantiza que solo se reemplaza la linea que comienza con `phase:`,
no ocurrencias en cuerpo del documento.

### D-02: sync-wp-state.sh como PostToolUse reactivo

Script que recibe JSON de PostToolUse Write y sincroniza `now.md::current_work`:

```bash
#!/bin/bash
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Filtrar: solo archivos en context/work/
if [[ "$FILE_PATH" != *"/.claude/context/work/"* ]]; then
  exit 0
fi

# Extraer WP path relativo a context/
WP_PATH=$(echo "$FILE_PATH" | grep -oP 'work/[^/]+/')

if [ -z "$WP_PATH" ]; then
  exit 0
fi

# Leer current_work actual
CURRENT=$(grep "^current_work:" .claude/context/now.md | sed 's/current_work: //')

# Solo actualizar si cambio el WP
if [ "$CURRENT" = "$WP_PATH" ]; then
  exit 0
fi

DATE=$(date '+%Y-%m-%d %H:%M:%S')
sed -i \
  -e "s|^current_work: .*|current_work: $WP_PATH|" \
  -e "s|^updated_at: .*|updated_at: $DATE|" \
  .claude/context/now.md
```

No actualiza `phase` — eso lo hace `set-session-phase.sh`. Solo sincroniza `current_work`.

### D-03: No inferir phase desde archivo en sync-wp-state.sh

Phase 1 propuso inferir la phase del WP desde el nombre del archivo escrito.
Esta idea se descarta en D-03 porque:

1. **Riesgo de regresion**: si Claude escribe un sub-analisis durante Phase 6, el hook
   incorrectamente setaria `phase: Phase 1`.
2. **Responsabilidad separada**: `phase` es responsabilidad de los hooks de los workflow-*
   SKILL.md; `current_work` es responsabilidad del PostToolUse hook.
3. **Un hook, una responsabilidad**: mas simple, menos superficie de error.

### D-04: close-wp.sh para el cierre de Phase 7

Nuevo script para Bug 4 (cierre LLM-dependiente):

```bash
#!/bin/bash
# Llamado desde instruccion de workflow-track (no como hook sino como comando explicito)
DATE=$(date '+%Y-%m-%d %H:%M:%S')
sed -i \
  -e "s|^current_work: .*|current_work: null|" \
  -e "s|^phase: .*|phase: null|" \
  -e "s|^updated_at: .*|updated_at: $DATE|" \
  .claude/context/now.md
```

Opcion A: agregar como hook UserPromptSubmit en workflow-track (automatico al invocar /workflow-track).
Opcion B: instruccion explicita en workflow-track SKILL.md para llamar el script.

Ambas opciones corrigen el bug, pero la Opcion A requiere GATE OPERACION en workflow-track.
La Opcion B es mas intencionada: el cierre del WP requiere que Claude lo haga
deliberadamente, no que se auto-cierre al invocar el skill.

**Decision: Opcion B** — instruccion en workflow-track para llamar `bash .claude/scripts/close-wp.sh`.
El cierre del WP es una accion semanticamente importante y debe ser intencional.

### D-05: focus.md — alcance reducido

Phase 1 incluia focus.md como Bug 3. Despues del deep review, la actualizacion
de focus.md queda fuera del PostToolUse hook por dos razones:

1. **El contenido de focus.md es semantico**, no un campo simple. El hook no puede
   saber que escribir en `## WP activo` o `## Completado` sin contexto de negocio.
2. **La actualizacion de focus.md ocurre en 2 momentos**: apertura (Phase 1) y cierre
   (Phase 7). El hook PostToolUse no distingue cual es cual.

Resolucion: focus.md permanece como instruccion en los SKILL.md de workflow-analyze y
workflow-track. Se mejora la instruccion para que sea mas explicita (checklist). Esto
es Automatico-B parcial — mejor que hoy pero no completamente deterministico.

### D-06: settings.json — hook con filtro if

Usar el campo `if` para evitar spawnar el script en cada Write del proyecto:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "if": "Write(/.claude/context/work/*)",
            "command": "bash .claude/scripts/sync-wp-state.sh"
          }
        ]
      }
    ]
  }
}
```

Si `if` con path profundo no funciona como esperado, el script tiene su propio filtro
interno (D-02) como fallback — doble proteccion.

---

## Archivos afectados

| Archivo | Cambio | Tipo de edicion |
|---------|--------|----------------|
| `.claude/scripts/set-session-phase.sh` | Nuevo | Creacion |
| `.claude/scripts/sync-wp-state.sh` | Nuevo | Creacion |
| `.claude/scripts/close-wp.sh` | Nuevo | Creacion |
| `.claude/settings.json` | Agregar PostToolUse hook | Config framework → GATE OPERACION |
| `workflow-analyze/SKILL.md` | Fix hook command | Config framework → GATE OPERACION |
| `workflow-strategy/SKILL.md` | Fix hook command | Config framework → GATE OPERACION |
| `workflow-plan/SKILL.md` | Fix hook command | Config framework → GATE OPERACION |
| `workflow-structure/SKILL.md` | Fix hook command | Config framework → GATE OPERACION |
| `workflow-decompose/SKILL.md` | Fix hook command | Config framework → GATE OPERACION |
| `workflow-execute/SKILL.md` | Fix hook command | Config framework → GATE OPERACION |
| `workflow-track/SKILL.md` | Fix hook command + instruccion close-wp | Config framework → GATE OPERACION |

Total: 3 scripts nuevos + 1 settings.json + 7 SKILL.md = 11 archivos.

**Todos los SKILL.md y settings.json requieren GATE OPERACION** (edicion decision).
Se agrupan en un solo gate antes de Phase 6 EXECUTE.

---

## Reclasificacion del tamano

Phase 1 clasifico el WP como "pequeno" (2 archivos). Post deep review:

| Dimension | Phase 1 | Phase 2 (revisado) |
|-----------|---------|-------------------|
| Scripts | 2 | 3 |
| SKILL.md afectados | 1 | 7 |
| settings.json | 1 | 1 |
| Total archivos | 3 | 11 |
| Tamano | pequeno | mediano |

Fases activas: 1 (hecho), 2 (esto), 5 (task plan — necesario dado el scope), 6, 7.
Se agrega Phase 5 DECOMPOSE para trackear los 11 cambios individualmente.

---

## Secuencia de implementacion

1. Crear los 3 scripts (sin GATE — son scripts nuevos, no edicion de config)
2. GATE OPERACION: editar settings.json + 7 SKILL.md (todos en un batch)
3. Validar con una sesion de prueba
4. Commit + push
