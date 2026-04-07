```yml
type: Risk Register
work_package_id: 2026-04-07-01-41-49-metadata-keys-standardization
created_at: 2026-04-07 01:41:49
status: active
open_risks: 3
closed_risks: 0
```

# Risk Register: Metadata Keys Standardization

| ID | Descripción | Probabilidad | Impacto | Mitigación | Estado |
|----|-------------|:---:|:---:|---|:---:|
| R-01 | `project-status.sh:35` usa `/^Tipo:/d` y `/^Versión:/d` para filtrar frontmatter del output. Post-migración esas líneas no matchean → el script muestra metadata en el output del status | Confirmado | Bajo | Actualizar los patrones sed a `/^type:/d` y `/^version:/d` en la misma tarea que migra `focus.md` | Abierto |
| R-02 | sed en masa corrompe contenido que contiene `Tipo:`, `Versión:` etc. en el cuerpo del documento (no solo frontmatter) | Baja | Medio | Limitar sustituciones a líneas dentro del bloque YAML (entre ``` `` `yml` `` y ``` `` ` `` ``). Verificar con grep post-migración | Abierto |
| R-03 | Inconsistencia temporal durante la migración — si una sesión comienza mientras se están aplicando cambios, el session-start hook puede leer frontmatter en estado mixto | Baja | Bajo | Hacer la migración en un solo commit atómico por capa. No hacer commits parciales dentro de una capa | Abierto |
