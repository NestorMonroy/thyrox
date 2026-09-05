```yml
type: Lecciones Aprendidas
work_package: 2026-04-09-03-17-55-skill-references-restructure
fase: FASE 24
created_at: 2026-04-09 23:00:00  # hora estimada — corregido FASE 35 (2026-04-14), WP histórico sin hora original
version: 2.1.0
```

# Lecciones Aprendidas — FASE 24: skill-references-restructure

## Resumen

FASE 24 reestructuró 24 references y 20 scripts desde `pm-thyrox/references/` y `pm-thyrox/scripts/` a 3 niveles arquitectónicos. 6 commits atómicos (C-A..C-F). 4 rondas de enmiendas post-validación.

---

## L-098: detect_broken_references.py solo escanea .md y .json — no .sh

**Observación:** El validador no detectó las rutas rotas en `setup-template.sh` hasta que se hizo grep manual. El array `CORE_FILES` en setup-template.sh listaba 11 rutas viejas de `pm-thyrox/references/` para sustitución con `sed -i`, pero el validador nunca las flaggó.

**Causa:** `detect_broken_references.py` solo abre archivos `.md` y `.json`. Los archivos `.sh` quedan fuera del scope del validador.

**Acción correctiva aplicada:** Grep manual de `pm-thyrox` en todos los archivos del repo al final de cada Batch encontró las rutas en setup-template.sh.

**Lección:** Siempre incluir `.sh` en el grep de verificación post-move:
```bash
grep -r "skills/pm-thyrox/references" . --include="*.sh" --include="*.md" --include="*.json"
```

---

## L-099: Las referencias cruzadas entre Batches requieren fixes intermedios en 2 pasos

**Observación:** `commit-helper.md` (movido en Batch A a `workflow-execute/references/`) tenía un link a `./conventions.md` — que no se movía hasta Batch B. Esto creó un estado donde el Batch A commit habría dejado el link roto entre commits.

**Solución aplicada (T-003b + T-009b):**
- Batch A: cambiar el link a la ruta temporal `../../pm-thyrox/references/conventions.md` (sigue existiendo en ese momento)
- Batch B: actualizar la ruta al destino final `../../../references/conventions.md`

**Lección:** Al mover archivos en batches que tienen dependencias cruzadas, el análisis de Phase 5 debe identificar explícitamente los "cross-batch links" y planificar fixes en 2 pasos. La tarea T-003b surgió post-análisis y tuvo que ser añadida al task-plan durante la ejecución.

**Pattern para futuros restructures:** Antes de definir los batches, construir un grafo de dependencias entre los archivos a mover y verificar si algún archivo en Batch N apunta a un archivo en Batch M (N < M).

---

## L-100: Grep de verificación ANTES del commit es obligatorio — no solo el validador

**Observación:** Batches A, B y D requirieron enmiendas porque el validador no detectó todas las referencias rotas (algunas eran en archivos .sh, otras eran referencias a archivos que el validador no rastreaba como rotas por su lógica de clasificación documental).

**Patrón de errores encontrados:**
- Batch A amendment: `decisions.md` + `adr-003.md` → referencias a `pm-thyrox/references/commit-convention.md`
- Batch B amendment: `registry/agents/README.md` → referencia a `pm-thyrox/references/agent-spec.md`; `setup-template.sh` → 11 rutas; `CONTRIBUTING.md` → path con typo (`./claude/` sin punto inicial)
- Batch D amendment: `registry/agents/README.md` → referencia a `pm-thyrox/scripts/lint-agents.py`; `setup-template.sh` → 2 script paths

**Lección:** El checkpoint VAL debe siempre incluir:
```bash
# 1. Validador oficial
python3 .claude/scripts/detect_broken_references.py

# 2. Grep directo para los paths específicos movidos
grep -r "skills/pm-thyrox/references" . --include="*.md" --include="*.json" --include="*.sh"
grep -r "pm-thyrox/scripts" . --include="*.md" --include="*.json" --include="*.sh"
```

El grep directo es más confiable que el validador para detectar referencias rotas a archivos específicos que acaban de moverse.

---

## L-101: git rm falla cuando todos los archivos ya fueron movidos con git mv

**Observación:** `git rm -r .claude/skills/pm-thyrox/references/` falló con "pathspec did not match any files" porque todos los archivos habían sido staged como renames via `git mv`. Git no rastreo el directorio vacío resultante.

**Causa:** Git no rastrea directorios vacíos. Después de `git mv` todos los archivos, el directorio está vacío en el índice. `git rm -r` no tiene nada que eliminar.

**Solución aplicada:** `rmdir .claude/skills/pm-thyrox/references/` para eliminar el directorio del filesystem (no del índice, que ya estaba limpio).

**Lección:** Después de `git mv` de todos los archivos de un directorio, usar `rmdir` (no `git rm -r`) para limpiar el directorio vacío del filesystem. Git ya tiene los renames correctamente staged.

---

## Métricas de la FASE

| Métrica | Valor |
|---------|-------|
| Commits atómicos | 6 (C-A, C-B, C-C, C-D, C-F + task-plan fix) |
| Enmiendas requeridas | 4 (Batches A, B, D + task-plan) |
| Archivos movidos | 24 references + 15 scripts = 39 |
| Links actualizados | ~50 en 18 archivos |
| Archivos con fixes manuales (fuera del validador) | 4 (setup-template.sh, decisions.md, adr-003.md, CONTRIBUTING.md) |
| Tests pasados | 28/39 (11 pre-existing failures en test-skill-mapping, no regresiones nuevas) |
| Deuda técnica resuelta | TD-020 (CLAUDE.md ## Estructura) |
