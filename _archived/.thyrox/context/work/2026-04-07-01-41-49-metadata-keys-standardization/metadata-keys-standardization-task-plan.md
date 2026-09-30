```yml
type: Task Plan
work_package_id: 2026-04-07-01-41-49-metadata-keys-standardization
created_at: 2026-04-07 02:01:15
updated_at: 2026-04-07 02:01:15
total_tasks: 13
status: pending
```

# Task Plan — Estandarización de Keys de Metadata YAML

## Orden de ejecución

Las capas deben ejecutarse en secuencia. El script (T-001) es prerequisito de
todas las capas batch. T-010 (conventions.md) debe ir antes que T-011 (SKILL.md)
porque conventions.md es el contrato que SKILL.md referencia.

---

## Tareas

- [ ] [T-001] Crear `scripts/migrate-metadata-keys.py` con KEY_MAP completo (~70 entries), lógica de frontmatter delimiter, orden de aplicación por longitud descendente, flags --dry-run / --layer / --file / --all / --verify-only (SPEC-001)

- [ ] [T-002] Ejecutar dry-run sobre Capa 1 (`assets/`) y verificar diff antes de aplicar: `python scripts/migrate-metadata-keys.py --layer 1 --dry-run` (SPEC-002)

- [ ] [T-003] Aplicar migración Capa 1 y verificar: `python scripts/migrate-metadata-keys.py --layer 1` + grep de validación sobre `assets/` (SPEC-002)

- [ ] [T-004] Aplicar migración Capa 2 y verificar: `python scripts/migrate-metadata-keys.py --layer 2` + grep sobre `references/` (SPEC-003)

- [ ] [T-005] Migrar `CLAUDE.md` — frontmatter propio: `Tipo` → `type`, `Versión` → `version`, `Fecha actualización` → `updated_at` con timestamp real (SPEC-011)

- [ ] [T-006] Migrar `conventions.md` — frontmatter + agregar sección `## Metadata Keys` con tabla mapa completo español→inglés + nota legacy pre-2026-04-07 + dos formatos de fecha (SPEC-004, SPEC-010)

- [ ] [T-007] Migrar `SKILL.md` — frontmatter propio + Phase 1 step 2: agregar comando `date '+%Y-%m-%d %H:%M:%S'` para valores de metadata diferenciado del comando de directorios (SPEC-004, SPEC-011)

- [ ] [T-008] Aplicar migración Capa 4 y verificar: `python scripts/migrate-metadata-keys.py --layer 4` sobre `focus.md`, `now.md`, `project-state.md`, `technical-debt.md`, `decisions.md` (SPEC-005)

- [ ] [T-009] Aplicar migración Capa 5 y verificar: `python scripts/migrate-metadata-keys.py --layer 5` sobre `context/decisions/adr-*.md` (SPEC-006)

- [ ] [T-010] Aplicar migración Capa 6 y verificar: `python scripts/migrate-metadata-keys.py --layer 6` sobre `context/errors/ERR-*.md` (SPEC-007)

- [ ] [T-011] Aplicar migración Capa 7 y verificar: `python scripts/migrate-metadata-keys.py --layer 7` sobre WP activo `thyrox-capabilities-integration` (SPEC-008)

- [ ] [T-012] Fix `scripts/project-status.sh` línea 35: reemplazar patrones sed `/^Tipo:/d`, `/^Versión:/d`, `/^Última/d` por `/^type:/d`, `/^version:/d`, `/^updated_at:/d` (SPEC-009)

- [ ] [T-013] Verificación final completa: `python scripts/migrate-metadata-keys.py --verify-only --all` + grep manual sobre templates + references + SKILL.md + conventions.md → confirmar cero keys en español (todas las SPECs)

---

## Dependencias

```
T-001 → T-002 → T-003 → T-004
                      → T-008 → T-009 → T-010 → T-011
T-005 (independiente — edición manual)
T-006 → T-007 (conventions antes que SKILL por referencia cruzada)
T-012 (independiente — fix puntual)
T-013 (al final — depende de T-003..T-012)
```

## Checkpoints de validación

- Después de T-003: grep cero en `assets/` → continuar Capa 2
- Después de T-004: grep cero en `references/` → continuar Capa 3
- Después de T-007: verificar que SKILL.md menciona ambos comandos `date`
- Después de T-011: grep sobre todo el proyecto para detectar residuos
- T-013: gate final antes de cerrar el WP
