```yml
type: Lecciones Aprendidas
work_package: 2026-04-09-07-15-48-assets-restructure
fase: FASE 25
created_at: 2026-04-09 23:00:00  # hora estimada — corregido FASE 35 (2026-04-14), WP histórico sin hora original
version: 2.2.0
```

# Lecciones Aprendidas — FASE 25: assets-restructure

## Resumen

FASE 25 distribuyó 37 de 38 templates desde `pm-thyrox/assets/` a 7 directorios `workflow-*/assets/`. 5 commits atómicos (C-A..C-E). 1 enmienda en C-A (decisions.md fix). 2 correcciones extra encontradas con grep final (incremental-correction.md + docs/architecture/decisions/README.md).

---

## L-102: Los workflow-*/SKILL.md y referencias ya tenían paths correctos — el move es la solución, no el problema

**Observación:** A diferencia de FASE 24 donde había que actualizar 50+ links al mover archivos, en FASE 25 los archivos `workflow-*/SKILL.md` y `workflow-*/references/*.md` ya usaban `assets/X.md.template` y `../assets/X.md.template` — paths que resuelven a sus propios directorios `workflow-*/assets/`. Esos directorios simplemente no existían.

**Implicación:** Crear los directorios y mover los archivos FIX las referencias automáticamente, sin edición de esos archivos.

**Lección para futuros restructures:** Antes de planificar "qué archivos necesito actualizar", verificar si los destinos de las referencias YA existen en el codebase. El costo de actualización puede ser 0 si la estructura ya está implícitamente asumida.

---

## L-103: now.md — `current_work` debe ser relativo a `.claude/context/`, no al repo root

**Observación:** `validate-session-close.sh` construye `WORK_PATH = "${CONTEXT_DIR}/${CURRENT_WORK}"`. Si `CURRENT_WORK` incluye `context/` en la ruta, el path se duplica: `.claude/context/context/work/...`.

**Causa:** now.md tenía `current_work: context/work/2026-04-09-07-15-48-assets-restructure/` en lugar de `work/2026-04-09-07-15-48-assets-restructure/`.

**Fix aplicado:** Corregido el path en now.md.

**Lección:** El campo `current_work` en now.md debe ser relativo a `.claude/context/`. El prefijo correcto es `work/TIMESTAMP-nombre/`, no `context/work/TIMESTAMP-nombre/`. Verificar en futuros WPs al escribir now.md.

---

## L-104: Grep post-move debe cubrir todos los archivos con paths absolutos, no solo los planificados

**Observación:** La task plan (T-022) cubría `reference-validation.md` para actualizar menciones de `pm-thyrox/assets/`. Sin embargo, el grep final encontró 2 paths adicionales en `incremental-correction.md` (execution-log, final-report con cp commands) y 1 en `docs/architecture/decisions/README.md` (adr.md.template). Estos no estaban en el plan.

**Causa:** El análisis de Phase 1 identificó los archivos con links Markdown formales `[texto](ruta)`, pero no capturó todos los comandos `cp` en bloques de código dentro de archivos de referencia.

**Lección:** El grep de verificación final (`grep -r "pm-thyrox/assets"`) siempre revelará referencias no planificadas. Es el último safety net — ejecutarlo con `--include="*.sh" --include="*.md" --include="*.json"` antes del commit final.

---

## L-105: validate-session-close.sh `--since=TIMESTAMP` falla cuando el WP tiene commits del mismo día pero anteriores a la hora del check

**Observación:** El script usa `TODAY=$(date '+%Y-%m-%d %H:%M:%S')` y luego `git log --since="$TODAY"`. Esto solo encuentra commits POSTERIORES a la hora de ejecución del script — no todos los commits del día.

**Causa:** El script debería usar `--since="YYYY-MM-DD"` (solo fecha) para capturar todos los commits del día.

**Estado:** Aceptado como pre-existing behavior. El warn se resuelve haciendo el commit de Phase 7 (que sí es posterior al check).

---

## Métricas de la FASE

| Métrica | Valor |
|---------|-------|
| Templates distribuidos | 37 (de 38) |
| Directorios creados | 7 |
| Commits atómicos | 5 (C-A..C-E) |
| Enmiendas | 1 (decisions.md en C-A) |
| Archivos con updates manuales | 9 |
| Links actualizados | ~30 |
| Referencias extra encontradas con grep final | 3 |
| Regresiones en archivos operacionales | 0 |
