# Validador de Referencias - THYROX

Script Python para validar que todas las referencias a archivos en documentación existan realmente.

## Instalación

No requiere instalaciones externas. Solo necesita Python 3.6+

## Uso Básico

```bash
# Validar desde directorio actual
python3 validate-references.py

# Validar directorio específico
python3 validate-references.py /home/thyrox/.claude/skills/pm-thyrox

# Modo verbose (muestra referencias correctas también)
python3 validate-references.py --verbose

# Desde cualquier lugar con ruta relativa
python3 validate-references.py .claude/skills/pm-thyrox
```

## Salida

El script genera:

1. **Console output**: Reporte en tiempo real con referencias rotas
2. **reference-validation-report.txt**: Archivo con resumen completo

## Cómo Interpreta Referencias

### Detecta automáticamente:

- **Links Markdown**: `[texto](ruta/archivo.md)`
- **Rutas a archivos**: Cualquier ruta terminada en `.md`, `.template`, `.json`, `.txt`
- **Rutas relativas**: Comenzando con `./` o `../`

### Ignora automáticamente:

- URLs externas (empiezan con `http`)
- Placeholders: `YYYY-MM-DD`, `NOMBRE`, `PROYECTO`, `TASK-NNN`, etc.
- Referencias documentales (ejemplos de estructura)

## Ejemplo de Salida

```
Escaneando archivos...
  Encontrados: 22 archivos

Validando referencias...

  ✓ SKILL.md                                 → references/introduction.md
  ✗ SKILL.md                                 → requirements-specification.md
  ! epic.md                                  → decisions.md (FileNotFoundError)

================================================================================
RESUMEN DE VALIDACIÓN DE REFERENCIAS - THYROX
================================================================================

Total referencias validadas: 201
  ✓ Válidas:                  63
  ✗ Rotas:                    138

Tasa de éxito: 31.3%
Status: ✗ REQUIERE ATENCIÓN (<85% válidas)

Archivos analizados: 22 con referencias

Archivos con más referencias:
  • SKILL.md                                      61 referencias
  • skill-authoring.md                            26 referencias

================================================================================
```

## Interpretación de Resultados

| Estado | Significado | Acción |
|--------|-------------|--------|
| ✓ OK | Archivo existe y referencia es válida | Ninguna |
| ✗ Error | Archivo no existe | Revisar referencia o crear archivo |
| ! Warning | Error al verificar | Revisar ruta y permisos |

## Status de Éxito

- **100%**: Todas las referencias son válidas
- **95-99%**: Excelente, casi sin problemas
- **85-94%**: Bueno, pero hay algunas referencias rotas
- **<85%**: Requiere atención

## Casos de Uso Reales

### Después de renombrar un archivo:

```bash
python3 validate-references.py
```

Si renombraste `requirements.md` a `requirements-analysis.md`, el script detectará que la vieja ruta está rota.

### Al consolidar documentación:

```bash
python3 validate-references.py --verbose
```

Usa verbose para ver TODAS las referencias (OK y rotas) y asegurar que los links internos están correctos.

### En CI/CD:

```bash
python3 validate-references.py .claude/skills/pm-thyrox
exit_code=$?

if [ $exit_code -ne 0 ]; then
    echo "Broken references found!"
    exit 1
fi
```

El script devuelve exit code 0 si TODAS las referencias son válidas, 1 si hay rotas.

## Archivos Generados

### reference-validation-report.txt

Reporte detallado con:
- Estadísticas generales
- Listado de referencias rotas
- Error específico de cada referencia

Útil para:
- Archivar en Git
- Compartir en comentarios de PR
- Referencia histórica

## Limitaciones

- No valida rutas absolutas desde root del sistema (`/etc/...`)
- No valida URLs externas (intencional)
- Algunos patrones de referencia pueden no detectarse si están muy personalizados

## Cómo Funciona Internamente

1. **Scaneo**: Recorre todos los `.md` y `.json` del directorio
2. **Extracción**: Usa regex para encontrar referencias a archivos
3. **Filtrado**: Ignora placeholders y referencias documentales
4. **Validación**: Resuelve cada referencia a ruta absoluta y verifica que existe
5. **Reporte**: Genera salida consola + archivo de reporte

## Ejemplos Adicionales

### Validar solo referencias rotas (sin verbose):

```bash
python3 validate-references.py .claude
```

Mostrará solo las referencias que NO existen.

### Exportar a archivo para análisis:

```bash
python3 validate-references.py /ruta > reporte.txt 2>&1
```

### Validar archivos específicos:

El script valida automáticamente solo archivos `.md` y `.json`, ignorando otros tipos.

---

## Notas

- El script es **idempotente**: puedes ejecutarlo múltiples veces sin efectos secundarios
- El archivo de reporte se sobrescribe cada ejecución
- Los placeholders se ignoran automáticamente para que no haya falsos positivos
- La resolución de rutas sigue la lógica estándar: relativas a archivo, no a root del proyecto

## Solución de Problemas

**P: ¿Por qué dice que una referencia existe pero realmente no?**
A: Probablemente la ruta es relativa a otro directorio. Verifica desde dónde ejecutas el script.

**P: ¿Qué pasa si tengo rutas con espacios?**
A: El script las soporta. Asegúrate de citarlas correctamente en el markdown.

**P: ¿Cómo ignoro un archivo específico?**
A: Actualmente no hay filtro integrado, pero puedes modificar el script agregando a `SKIP_FILES`.

---

Script escrito para: **THYROX - PM Framework**  
Version: 2.0  
Requiere: Python 3.6+
