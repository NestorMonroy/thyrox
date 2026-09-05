```yml
type: Solution Strategy
project: THYROX
created_at: 2026-04-07 01:47:07
version: 1.0
author: Claude
status: Propuesta
```

# Solution Strategy: Metadata Keys Standardization

## Key Ideas

### Idea 1: Migración por capas con contratos explícitos

No todas las capas tienen el mismo riesgo ni el mismo valor. Migrar de la fuente
hacia afuera: primero los templates (fuente de todos los artefactos futuros), luego
el framework activo (leído cada sesión), luego los documentos de referencia.
Los artefactos históricos no se migran — se declaran legacy con una nota en conventions.md.

**Impacto:** Cada capa es un commit atómico. Si algo falla, el rollback es quirúrgico.

### Idea 2: Script de transformación reproducible > edits manuales

35 templates × N keys cada uno = ~200+ substituciones. Hacerlo manualmente con Edit
introduce errores por omisión. Un script `migrate-metadata-keys.sh` con un mapa
explícito `español → inglés` es reproducible, auditable y ejecutable en dry-run primero.

**Impacto:** El script es el contrato. Si el mapa está bien, la migración está bien.
El script queda en el repo como documentación ejecutable de la decisión.

### Idea 3: Sed acotado al bloque YAML — nunca en cuerpo markdown

El riesgo R-02 del análisis es que `Tipo:` o `Versión:` aparezcan en el cuerpo
de un documento (en tablas, ejemplos, texto explicativo). Un sed global rompería eso.
La solución: reemplazar únicamente dentro del bloque de frontmatter YAML
(entre la primera y segunda ocurrencia de ` ``` `).

**Impacto:** Cero falsos positivos. El cuerpo markdown queda intacto.

---

## Unknowns investigados

### Unknown 1 — ¿Cómo delimitar el frontmatter YAML en sed?

El frontmatter está entre la primera ` ```yml ` y el siguiente ` ``` ` de cierre.
Las opciones fueron:

| Enfoque | Pros | Contras |
|---------|------|---------|
| `sed` con address range `/^```yml/,/^```/` | Nativo, sin deps | Requiere GNU sed; falla si el bloque tiene ` ``` ` internos antes del cierre |
| Python con `re` + split por ` ``` ` | Preciso, legible, portable | Requiere Python (disponible en el entorno) |
| `awk` con flag de bloque | Portable | Más verboso que Python |

**Decisión: Python.** El entorno tiene Python 3. El script puede usar `re.sub` sobre
el bloque extraído entre las primeras dos ocurrencias de ` ``` `, sin tocar el resto.
Más seguro que sed para este caso multiline.

### Unknown 2 — ¿Migrar artefactos del WP activo (thyrox-capabilities-integration)?

Los ~10 artefactos del WP activo tienen keys en español. Opciones:

| Enfoque | Pros | Contras |
|---------|------|---------|
| Migrar junto con templates | Consistencia total desde el día 1 | Riesgo: contexto aún activo, el hook de sesión los lee |
| Migrar en tarea separada al final | Sin riesgo de ruptura de sesión activa | Pequeña ventana de inconsistencia |
| No migrar (legacy como los históricos) | Cero riesgo | Inconsistencia visible en el WP más reciente |

**Decisión: Migrar en tarea separada, al final del proceso**, después de verificar que
templates y framework activo funcionan correctamente. Es el WP más reciente y vale
la consistencia.

### Unknown 3 — ¿Cómo verificar que la migración está completa?

Opciones:

| Enfoque | Descripción |
|---------|-------------|
| `grep` post-migración | `grep -r "^Tipo:\|^Versión:\|^Fecha " assets/` — cualquier hit es un error |
| Test script | Script que valida que ningún template tiene keys en español |
| Revisión manual | Costoso, propenso a omisión |

**Decisión: grep de verificación** ejecutado al final de cada capa. Si hay hits → falla.
El script de migración incluye una fase de verificación al final.

---

## Decisiones fundamentales

### D-01: Python sobre sed para la transformación

**Elegido:** Script Python `scripts/migrate-metadata-keys.py`

**Razón:** Permite delimitar el frontmatter con precisión (split por ` ``` ` al inicio
del archivo), manejar el mapa de ~50 keys como un diccionario, y ejecutar en dry-run
antes de aplicar cambios. Sed no ofrece dry-run nativo.

**Formato del script:**
```python
KEY_MAP = {
    "Tipo": "type",
    "Categoría": "category",
    "Versión": "version",
    # ... mapa completo
    "Fecha creación": "created_at",
    "Fecha actualización": "updated_at",
    # ...
}
```

### D-02: Orden de migración por capas

```
Capa 1: assets/*.template, assets/*.md.template     (35 archivos — fuente)
Capa 2: skills/pm-thyrox/references/*.md             (~20 archivos — framework activo)
Capa 3: skills/pm-thyrox/SKILL.md + conventions.md  (motor del framework)
Capa 4: context/ framework files                      (focus.md, now.md, project-state.md,
                                                        technical-debt.md, decisions.md)
Capa 5: context/decisions/adr-*.md                   (13 ADRs)
Capa 6: context/errors/ERR-*.md                      (28 error reports)
Capa 7: WP activo thyrox-capabilities-integration    (10 artefactos — opcional al final)
Capa 8: project-status.sh                            (fix patrones sed)
```

Cada capa = un commit atómico. Verificación grep entre capas.

### D-03: conventions.md como contrato de referencia

El mapa completo `español → inglés` vive en `conventions.md` bajo una sección
`## Metadata Keys`. Así cualquier herramienta futura o persona nueva puede leer
el contrato sin buscar en el historial de git.

### D-04: Nota legacy en conventions.md

Agregar explícitamente:
> "Artefactos en `context/work/` anteriores a 2026-04-07 usan keys en español
> (legacy). No se migran. Claude los entiende en ambos formatos."

### D-05: Formato de timestamp definitivo

- Valores de metadata: `YYYY-MM-DD HH:MM:SS` → `date '+%Y-%m-%d %H:%M:%S'`
- Nombres de directorio: `YYYY-MM-DD-HH-MM-SS` → `date +%Y-%m-%d-%H-%M-%S`
- SKILL.md Phase 1 step 2: actualizar con ambos comandos

---

## Pre-design check

Verificación contra principios del proyecto (CLAUDE.md Locked Decisions):

| Principio | ¿Respeta? | Nota |
|-----------|:---------:|------|
| ANALYZE first | ✓ | Phase 1 completada con inventario completo |
| Git as persistence | ✓ | Cada capa = commit atómico, sin backups |
| Markdown only | ✓ | No se introduce ningún formato nuevo |
| Conventional Commits | ✓ | `refactor(metadata): migrate keys capa N` |
| Single skill | ✓ | El script queda en `scripts/` del skill |

---

## Post-design re-check

El script de migración en `scripts/migrate-metadata-keys.py` necesita:
1. Dry-run mode (`--dry-run`) para preview antes de aplicar
2. Modo por capa (`--layer 1`) para poder aplicar incrementalmente
3. Verificación integrada: al final lista los archivos modificados y hace grep de validación

Sin estas tres capacidades el script no es seguro para usar. Se incluyen como
requisitos en la spec de Phase 4.
