```yml
created_at: 2026-04-20 13:43:15
project: THYROX
author: NestorMonroy
status: Borrador
```

# CAD — Calibración Asincrónica por Dominio

## Definición operacional

CAD = patrón donde distintos dominios internos de un artefacto tienen calibración significativamente diferente.

Ejemplo: un análisis con score global 0.72 puede tener especificación técnica 0.91 y casos de uso proyectados 0.43. El score global oculta la distribución real de riesgo.

## Señales de detección

- El score global es ≥0.75 pero algún dominio individual es <0.50
- Secciones con "proyectado", "estimado", "futuro" tienen calibración distinta a secciones con "medido", "observado", "ejecutado"
- El análisis combina datos históricos (alta calibración) con proyecciones (baja calibración) sin distinguirlos

## Umbrales CAD

| Métrica | Umbral |
|---------|--------|
| Score global | ≥0.75 |
| Mínimo por dominio | ≥0.60 |
| Rango (Máx − Mín) | ≤0.35 |

Si el rango > 0.35, el artefacto tiene CAD activo — reportar por dominio, no solo globalmente.

## Criterios de uso en Stage 3 DIAGNOSE

- Claims del dominio bien calibrado (>0.85) pueden usarse como fundamento de gate
- Claims del dominio pobremente calibrado (<0.50) requieren validación adicional antes del gate
- Al reportar calibración, SIEMPRE incluir score por dominio cuando el rango > 0.15

## Regla para scores cuantitativos propios

Cuando se producen scores cuantitativos propios:
- Los cálculos deben ser verificables aritméticamente (mostrar la fórmula y los valores de entrada)
- El criterio de scoring NO puede cambiar silenciosamente entre dominios del mismo análisis
- Si el scoring de un dominio cambia, declararlo explícitamente con justificación
