# Validación de Referencias THYROX v3

Archivo de índice rápido para acceder a los reportes y documentación.

## Archivo Rápido

**Estado actual**: 259 referencias analizadas
- Válidas: 102 (39.4%)
- Documentales: 91 (35.1%)
- Rotas: 66 (25.5%)
- **Integridad: 74.5%**

## Acceso Rápido a Documentos

### Para entender el estado actual
1. **[VALIDATION-STATUS.md](VALIDATION-STATUS.md)** - Estado del proyecto + instrucciones
2. **[VALIDATION-ANALYSIS.md](VALIDATION-ANALYSIS.md)** - Análisis de hallazgos

### Para usar el validador
**[VALIDATE-REFERENCES-v3-GUIDE.md](VALIDATE-REFERENCES-v3-GUIDE.md)** - Manual completo

### Para ver detalles técnicos
**[reference-validation-report.txt](reference-validation-report.txt)** - Reporte completo (2,847 líneas)

## Comandos Útiles

Ver solo referencias rotas:
```bash
grep "ROTA" reference-validation-report.txt
```

Regenerar reporte:
```bash
python3 validate-references-v3.py
```

Con más detalle:
```bash
python3 validate-references-v3.py --debug
```

## Archivos Generados

- `validate-references-v3.py` - Script de validación (340 líneas)
- `reference-validation-report.txt` - Reporte completo
- `VALIDATION-STATUS.md` - Estado y acciones
- `VALIDATION-ANALYSIS.md` - Análisis
- `VALIDATE-REFERENCES-v3-GUIDE.md` - Guía de uso
- `README-VALIDATION.md` - Este archivo

## Próximos Pasos

1. Leer **[VALIDATION-STATUS.md](VALIDATION-STATUS.md)**
2. Decidir: ¿Crear archivos o actualizar referencias?
3. Ejecutar soluciones (ver instrucciones en VALIDATION-STATUS.md)
4. Regenerar reporte: `python3 validate-references-v3.py`

---

Ver **[VALIDATION-STATUS.md](VALIDATION-STATUS.md)** para instrucciones paso a paso.
