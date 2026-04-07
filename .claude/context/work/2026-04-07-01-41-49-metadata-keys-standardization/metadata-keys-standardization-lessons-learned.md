```yml
type: Lessons Learned
work_package_id: 2026-04-07-01-41-49-metadata-keys-standardization
created_at: 2026-04-07 02:22:27
closed_at: 2026-04-07 02:22:27
project: THYROX
source_phase: Phase 7 — TRACK
total_lessons: 4
author: Claude
```

# Lessons Learned: Metadata Keys Standardization

## Propósito

Capturar qué aprendió el equipo durante la FASE 12 — migración de keys de
metadata YAML de español a inglés snake_case en el framework THYROX.

---

## Lecciones

### L-035: KEY_MAP incompleto — keys extra detectados en verify post-capa

**Qué pasó**

El KEY_MAP fue construido a partir del inventario de Phase 1 (grep sobre
frontmatter). Al aplicar Capa 1 y correr verify, 3 archivos fallaron con keys
residuales no cubiertos: `Sistemas externos`, `Última actualización integración`,
`Cambios relacionados a`, `Total archivos`, `Archivos agregados/modificados/eliminados`.
Fueron 12 keys faltantes en total, no detectados en el análisis inicial.

**Raíz**

El grep de inventario en Phase 1 buscó patrones comunes (`^Tipo:`, `^Fecha `, etc.)
pero no extrajo la lista exhaustiva de TODOS los keys únicos presentes en los
archivos. Algunos keys de baja frecuencia (1-2 ocurrencias) quedaron fuera.

**Fix aplicado**

Agregar Grupo G al KEY_MAP con los 12 keys faltantes. Re-aplicar Capa 1.
Verify OK en el segundo intento.

**Regla**

Cuando se construye un mapa de sustitución exhaustivo, extraer los keys con
`grep -oh "^[^:]*:" *.template | sort -u` para obtener la lista completa,
no solo los patrones previstos. Luego cruzar contra el KEY_MAP antes de ejecutar.

---

### L-036: ROOT path errado en el script — detectado en T-002 (dry-run)

**Qué pasó**

El script calculó `ROOT` como 4 niveles desde el archivo (`parent x4`), que apunta
a `.claude/` en lugar de `thyrox/`. El dry-run mostró `0 archivos` en Capa 1,
lo que reveló el error antes de aplicar cambios.

**Raíz**

La ruta del script es `.claude/skills/pm-thyrox/scripts/migrate-metadata-keys.py`.
Desde el archivo, subir 4 niveles llega a `.claude/`, no a `thyrox/`. Se necesitan
5 niveles. El error fue aritmético al contar la jerarquía de directorios.

**Fix aplicado**

Cambiar `parent.parent.parent.parent` a `parent.parent.parent.parent.parent`
(o calcular como `Path(__file__).parent.parent.parent` que apunta a `.claude/skills`
y luego `.parent.parent` para llegar al root). Detectado en T-002 antes de T-003.

**Regla**

Cuando un script calcula ROOT con múltiples `.parent`, verificar el path resultante
con un print antes de ejecutar sobre archivos reales. El dry-run cumplió exactamente
este propósito: `0 archivos procesados` es la señal de alerta correcta.

---

### L-037: Archivos con encoding corrupto — sed como fallback quirúrgico

**Qué pasó**

Dos archivos (`commit-helper.md`, `long-context-tips.md`) fallaron con
`UnicodeDecodeError` en el script Python porque tienen bytes UTF-8 inválidos
en el cuerpo (no en el frontmatter). El frontmatter era válido UTF-8 pero
Python rechazaba el archivo completo.

El fallback a `latin-1` migró el frontmatter correctamente en `long-context-tips.md`
pero dejó keys residuales porque los keys con tildes (`Categoría`, `Versión`)
quedaron como secuencias latin-1 que no matchearon el KEY_MAP (que usa UTF-8).

**Fix aplicado**

Usar `sed` acotado al bloque frontmatter (`sed -i '1,/^```$/s/^Categ[^:]*:/category:/'`)
con regex que matchea el prefijo sin la tilde. Efectivo y no toca el cuerpo del documento.

**Regla**

Para archivos con encoding mixto o corrupto en el cuerpo, sed con regex sin tildes
(`Categ[^:]*:`, `Vers[^:]*:`) es más robusto que Python sobre el archivo completo.
Alternativa preventiva: convertir todos los archivos a UTF-8 limpio antes de migrar
(`iconv -f latin-1 -t utf-8`).

---

### L-038: Dry-run como gate obligatorio antes de apply — validado en este WP

**Qué pasó**

El task-plan incluía T-002 (dry-run Capa 1) explícitamente antes de T-003 (apply).
El dry-run detectó el ROOT errado (L-036) antes de modificar ningún archivo.
Sin T-002, el script habría procesado 0 archivos silenciosamente y T-003 habría
parecido exitoso con 0 cambios.

**Raíz**

No hubo error en el proceso — fue un diseño correcto. El dry-run funcionó como
se especificó en SPEC-001.

**Fix aplicado**

N/A — el patrón funcionó. Documentar para reforzarlo en futuros WPs de migración.

**Regla**

En cualquier WP que implique modificaciones en masa (batch), incluir siempre una
tarea explícita de dry-run antes del apply. El dry-run no es opcional ni una
"buena práctica" — es el gate que separa "planeado" de "ejecutado".

---

## Patrones identificados

| Patrón | Lecciones | Acción sistémica |
|--------|-----------|-----------------|
| Inventario incompleto en Phase 1 → keys faltantes en script | L-035 | En WPs de migración: extraer lista exhaustiva con `grep -oh "^[^:]*:"` antes de construir el mapa |
| Script con path calculado manualmente → error silencioso | L-036 | Verificar ROOT con print/assert antes del primer run |
| Dry-run como detector de errores de setup | L-036, L-038 | Formalizar en SKILL.md: WPs de migración batch siempre incluyen tarea de dry-run |

---

## Qué replicar

- **Verificación integrada en el script**: el script corre `verify_files()` automáticamente
  post-apply. Detectó los 3 archivos residuales de Capa 1 sin intervención manual.
  Patrón a mantener en todos los scripts de migración.

- **Commits por capa**: cada capa fue un commit atómico. Cuando L-035 requirió
  re-aplicar Capa 1, el rollback hubiera sido a un commit específico, no al inicio.

- **KEY_MAP como diccionario ordenado por longitud**: el ordenamiento descendente
  por longitud previno sustituciones parciales (`Fecha` antes que `Fecha creación`).
  Sin esto, `"Fecha creación"` habría quedado como `"created_at creación"`.

---

## Deuda pendiente

| ID | Descripción | Prioridad |
|----|-------------|-----------|
| T-DT-010 | Los 2 archivos con encoding corrupto (`commit-helper.md`, `long-context-tips.md`) tienen bytes UTF-8 inválidos en el cuerpo. Convertir a UTF-8 limpio con `iconv`. | baja |
| T-DT-011 | Agregar al KEY_MAP en el script el comando de extracción exhaustiva como comentario: `grep -roh "^[^:]*:" assets/ \| sort -u` para facilitar auditorías futuras. | baja |

---

## Checklist de cierre

- [x] Cada lección tiene raíz identificada (no solo síntoma)
- [x] Cada lección tiene regla generalizable
- [x] Patrones sistémicos documentados
- [x] Deuda técnica registrada con prioridad
- [x] Documento commiteado
