```yml
type: Estrategia de Solución
work_package: 2026-04-07-18-49-50-human-gates
created_at: 2026-04-07 18:49:50
status: Aprobado
phase: Phase 2 — SOLUTION_STRATEGY
```

# Solution Strategy: human-gates

## Key Ideas

1. **Lenguaje imperativo de comportamiento, no descriptivo de estado** — las exit conditions deben decir `⏸ STOP: presentar X al usuario y esperar confirmación antes de continuar`, no `salir cuando el usuario aprobó X`.

2. **Dos tipos de gates** — distinguir:
   - **Gate de fase** (entre fases): Claude presenta el artefacto producido, para, y espera "SI"
   - **Gate de operación** (dentro de Phase 6): Claude describe la operación destructiva, para, y espera confirmación

3. **Clasificación por reversibilidad en Phase 1** — al crear el WP, clasificar su tipo. Esto calibra la rigidez de los gates en Phase 6.

4. **Phase 5 → Phase 6 es el gate más crítico** — no se puede comenzar ejecución sin que el usuario haya visto y aprobado el task-plan completo.

## Decisiones

| ID | Decisión | Justificación |
|----|----------|---------------|
| D-01 | Añadir `⏸ GATE HUMANO` en exit conditions de Phase 1, 2, 4, 5 | Lenguaje explícito de stop, no descriptivo |
| D-02 | Phase 3 ya tiene gate — reforzar su redacción pero no cambiarla | El patrón "NO declarar... hasta confirmación explícita" funciona bien |
| D-03 | Añadir clasificación de WP en Phase 1: `documentation` / `reversible` / `irreversible` | Calibra la rigidez de los gates en Phase 6 |
| D-04 | Añadir lista de operaciones destructivas en Phase 6 con instrucción de gate individual | Cubre el gap dentro de la fase |
| D-05 | Phase 7 no necesita gate — es documentación, no ejecuta cambios sobre el sistema | Phase 7 es safe by design |

## Diseño de los gates

### Gate de fase (entre fases)

Formato estándar para cada exit condition que requiere aprobación:

```
⏸ GATE HUMANO — STOP antes de continuar:
  Presentar al usuario: [qué mostrar]
  Esperar: confirmación explícita ("SI", "ok", "aprobado", o instrucción de cambio)
  NO continuar a Phase N hasta recibir respuesta.
```

### Gate de operación (dentro de Phase 6)

Para operaciones destructivas o de alto impacto:

```
⚠ GATE OPERACIÓN — antes de ejecutar [operación]:
  Describir: qué se va a hacer y qué no se puede deshacer
  Esperar: confirmación explícita del usuario
```

### Clasificación de WP

Al crear el WP en Phase 1, añadir al frontmatter:

```yaml
reversibility: documentation  # documentation | reversible | irreversible
```

- `documentation`: solo crea/modifica archivos en context/work/ o docs/. Gates de fase ligeros OK.
- `reversible`: modifica código o config, pero los cambios son recuperables vía git. Gates de fase estándar.
- `irreversible`: elimina archivos, modifica infraestructura activa, operaciones que no se deshacen con git revert. Gates duros en cada operación destructiva.
