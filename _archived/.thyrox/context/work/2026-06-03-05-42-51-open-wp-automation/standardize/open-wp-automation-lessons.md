```yml
created_at: 2026-06-03 05:42:51
project: THYROX
work_package: 2026-06-03-05-42-51-open-wp-automation
phase: Phase 12 — STANDARDIZE
author: NestorMonroy
status: Borrador
version: 1.0.0
```

# Lessons learned — open-wp-automation (mata PAT-001)

## Resultado

Creado `.claude/scripts/open-wp.sh` (inverso de `close-wp.sh`): al abrir un WP fija el
timestamp real (I-004), crea `work/{ts}-nombre/discover/`, y actualiza **de una vez**
`now.md` (`current_work` + `stage` + cuerpo Contexto) y el marcador `WP-STATUS` de `focus.md`.
`close-wp.sh` ahora también mantiene ese marcador ("Sin WP activo"). Propagado al flujo en
`workflow-discover/SKILL.md` (paso 2: usar el script, no manual).

**PAT-001 eliminado de raíz:** el gap "focus.md/stage stale al abrir" era manual; ahora es
mecánico en ambos extremos (open y close gestionan el mismo marcador).

## Pilot (resultado)

Ciclo open→close de prueba (`pilot-test`), con backup/restore del estado real:
- `open-wp.sh pilot-test` → `now.md::current_work` y `stage` fijados; `focus.md::WP-STATUS` =
  "WP activo: pilot-test — Phase 1 — DISCOVER"; dir `discover/` creado. ✓
- `close-wp.sh` → `now.md` reseteado a null; `focus.md::WP-STATUS` = "Sin WP activo." ✓
- Validación de nombre: rechaza no-kebab-case (rc=2). ✓
- Estado real restaurado, WP de prueba eliminado. Sin efectos colaterales.

## Lecciones

### L-1 — La simetría open/close cierra el gap que la disciplina no podía
PAT-001 reincidió 3 veces (WP44/46/47) porque solo el cierre era mecánico. Un sistema con
estado debe gestionarlo **en ambas transiciones**. La asimetría (close automatizado, open
manual) era la causa estructural, no el descuido puntual.

### L-2 — Mismo principio que ERR-002 y que COSMIC
Tres fixes de esta sesión comparten patrón: lo **recurrente** necesita un **contrapeso
mecánico**, no más disciplina. ERR-002/006 → señal funcional objetiva; errores de suma →
`tally-cfp.py`; PAT-001 → `open-wp.sh`. Es la misma tesis: medir/automatizar lo que el humano
estima/recuerda mal.

### L-3 — Marcador gestionado > parsear narrativa
focus.md es narrativo (variable). Un bloque `<!-- WP-STATUS -->…<!-- /WP-STATUS -->` da un
punto mecánico estable sin tocar la narrativa humana alrededor. Patrón reusable para estado
en archivos mixtos humano/máquina.

## Propagación

- `.claude/scripts/open-wp.sh` (nuevo) · `.claude/scripts/close-wp.sh` (A-7: marcador).
- `.thyrox/context/focus.md` — marcador WP-STATUS añadido.
- `workflow-discover/SKILL.md` — paso 2 usa open-wp.sh.
- PAT-001 mitigado de raíz (ver audits WP44/46/47).

**Última actualización:** 2026-06-03 05:42:51
