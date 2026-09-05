```yml
Fecha: 2026-03-28
Tipo: Phase 7 (TRACK)
```

# Lecciones — SKILL Flow Analysis

## L-019: Cada asset necesita un "momento" en el flujo — sin referencia = invisible

6 assets existían sin estar referenciados desde ninguna fase del SKILL. El usuario no sabe que existen. La regla: si un asset no tiene un link desde una fase, es como si no existiera. Connect-not-delete.

## L-020: Mover la creación de un artefacto sin actualizar la tabla de artefactos rompe la covariancia

Moví "crear work package" de Phase 3 a Phase 1 pero la tabla seguía diciendo Phase 3. Esto es exactamente el principio de covariancia que definimos: la misma ley debe tener la misma forma en todos los archivos que la referencian.

## L-021: Backtick refs a archivos reales deben ser relative links — siempre

Cada vez que se agrega una referencia a un archivo real (.md, .template, .sh, .py), debe ser `[nombre](../path/archivo)` no `` `path/archivo` ``. La convención ya existía pero yo mismo la violé al agregar las 7 nuevas referencias de assets. El patrón: los backticks son para patrones genéricos (`work/.../plan.md`, `ERR-NNN.md`), los links son para archivos navegables.

## Resumen de correcciones

| Categoría | Cantidad |
|-----------|----------|
| Flujo de work package (P-01, P-08) | 3 ediciones |
| Phase 2 explícita (P-04) | 1 reescritura |
| Assets conectados (P-03, P-05, P-06) | 5 refs nuevas |
| Numeración Phase 6 (P-02) | 1 fix |
| Backtick → relative links (SKILL.md) | 7 conversiones |
| Backtick → relative links (11 references) | ~40 conversiones |
| **Total** | **~57 ediciones en 12 archivos** |
