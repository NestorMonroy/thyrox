```yml
created_at: 2026-06-03 05:42:51
project: THYROX
work_package: 2026-06-03-05-42-51-open-wp-automation
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
version: 1.0.0
```

# DISCOVER — open-wp.sh: matar PAT-001 (focus.md stale al abrir)

## Problema

PAT-001 confirmado ×3 (audits de WP44/46/47): al **abrir** un WP, `now.md::stage` y `focus.md`
quedan desactualizados porque la apertura es **manual**. El cierre sí es mecánico
(`close-wp.sh`), pero no hay simétrico de apertura. Disciplina manual → gap recurrente.

## Evidencia (OBSERVABLE)

- `close-wp.sh` existe y resetea now.md + limpia Contexto + llama update-state. No hay `open-wp.sh`.
- Audits ÉPICA 44/46/47: cada uno halló `focus.md` apuntando a la ÉPICA previa cerrada.
- El hook PostToolUse (`sync-wp-state.sh`) setea `current_work` al detectar el WP, pero **no**
  fija `stage` ni toca `focus.md` → el gap persiste.

## Diseño — `open-wp.sh` (inverso de close-wp.sh)

`bash .claude/scripts/open-wp.sh <nombre-kebab> [stage]`

1. Timestamp real `date +%Y-%m-%d-%H-%M-%S` (I-004) → `WP=work/<ts>-<nombre>`.
2. `mkdir -p $WP/discover`.
3. now.md: set `current_work=$WP`, `stage=${2:-"Phase 1 — DISCOVER"}`, `updated_at`, y un
   cuerpo "# Contexto" con la línea del WP (mismo estilo bash-puro que close-wp.sh).
4. focus.md: escribir el estado del WP activo en un **marcador gestionado**.
5. echo del path creado.

**Marcador gestionado en focus.md** (clave del fix de raíz): bloque
`<!-- WP-STATUS -->` … `<!-- /WP-STATUS -->` que **ambos** scripts mantienen:
- `open-wp.sh` → "WP activo: <nombre> — <stage>".
- `close-wp.sh` (se actualiza) → "Sin WP activo".
Así focus.md::WP-STATUS es mecánico y consistente en los dos extremos; el resto de focus.md
(narrativa de ÉPICAs cerradas) sigue siendo edición humana.

## Scope

IN: `open-wp.sh`; marcador WP-STATUS en focus.md; actualizar `close-wp.sh` para mantenerlo.
OUT: convertirlo en hook automático (sigue siendo invocación explícita, como close-wp.sh);
reescribir la narrativa de focus.md.

## Gate / claims

OBSERVABLE (close-wp.sh leído; PAT-001 en 3 audits). Diseño INFERRED del inverso. Validación:
ciclo open→close de prueba debe dejar focus.md y now.md consistentes en ambos extremos.

## Plan

DISCOVER → IMPLEMENT (open-wp.sh + marcador + close-wp.sh) → PILOT (ciclo open/close de prueba)
→ STANDARDIZE (lessons + nota PAT-001).

**Última actualización:** 2026-06-03 05:42:51
