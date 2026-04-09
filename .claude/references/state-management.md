```yml
type: Referencia — Gestión de Estado de Sesión
category: Cross-phase
version: 1.0
purpose: Define cuándo y cómo actualizar los archivos de estado del proyecto
updated_at: 2026-04-08
owner: pm-thyrox (cross-phase)
```

# State Management — Archivos de Estado del Proyecto

## Los 3 archivos de estado

| Archivo | Pregunta que responde | Quién lo lee |
|---------|----------------------|-------------|
| `context/now.md` | ¿Qué WP está activo y en qué Phase? | `session-start.sh` (hook), Claude al iniciar sesión |
| `context/focus.md` | ¿En qué estamos trabajando y qué se completó? | Claude al iniciar sesión, `.claude/skills/workflow-track/scripts/validate-session-close.sh` |
| `context/project-state.md` | ¿Qué hay en el framework hoy? | Claude al necesitar contexto del proyecto |

---

## Tabla de triggers

| Evento | `now.md` | `focus.md` | `project-state.md` |
|--------|---------|-----------|-------------------|
| **Phase 1: WP creado** | ✓ Actualizar `current_work` + `phase: Phase 1` | ✓ Mencionar WP abierto | — |
| **Transición de Phase (1→2, 2→3…)** | ✓ Actualizar `phase: Phase N` | — | — |
| **Phase 7: WP cerrado** | ✓ `current_work: null`, `phase: null` | ✓ FASE completada + próximo paso | ✓ Ejecutar `update-state.sh` |
| **Nuevo agente añadido** | — | — | ✓ Ejecutar `update-state.sh` |
| **Nueva versión en CHANGELOG** | — | — | ✓ Ejecutar `update-state.sh` |

---

## Contenido mínimo por archivo

### `now.md` — al crear WP (Phase 1)
```yaml
current_work: context/work/{timestamp}-{nombre}/
phase: Phase 1
updated_at: YYYY-MM-DD HH:MM:SS
```

### `now.md` — al cerrar WP (Phase 7)
```yaml
current_work: null
phase: null
updated_at: YYYY-MM-DD HH:MM:SS
```

### `focus.md` — al abrir WP (Phase 1)
```markdown
## WP activo
{nombre-wp} — Phase 1: ANALYZE en curso

## Completado recientemente
FASE N-1: {descripción breve}
```

### `focus.md` — al cerrar WP (Phase 7)
```markdown
## Completado
FASE N: {nombre-wp} — {descripción de qué se logró}

## Sin WP activo
Framework en v{version}. Próximo paso: {siguiente item en ROADMAP o "sin pendientes"}
```

### `project-state.md` — generado por script
Ejecutar: `bash .claude/skills/pm-thyrox/scripts/update-state.sh`
El script lee el estado real del repo y sobreescribe `project-state.md`.

---

## Script de actualización automática

```bash
# Generar project-state.md desde el repo real:
bash .claude/skills/pm-thyrox/scripts/update-state.sh

# Ver qué escribiría sin modificar el archivo:
bash .claude/skills/pm-thyrox/scripts/update-state.sh --dry-run
```

---

## Regla de oro

> `now.md` es la fuente de verdad para `session-start.sh`.
> Si `now.md::current_work` es incorrecto, el hook arranca con el WP equivocado.
> Actualizar `now.md` es la operación de mayor impacto en la continuidad de sesión.
