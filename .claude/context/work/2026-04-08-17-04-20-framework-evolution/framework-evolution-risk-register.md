```yml
type: Risk Register
work_package: 2026-04-08-17-04-20-framework-evolution
created_at: 2026-04-08 17:04:20
updated_at: 2026-04-08 17:04:20
```

# Risk Register: Framework Evolution (FASE 22)

| ID | Riesgo | Prob | Impacto | Estado | Mitigación |
|----|--------|------|---------|--------|------------|
| R-01 | Migrar commands → skills hidden rompe invocación `/<name>` | Baja | Medio | Abierto | Spike: verificar comportamiento en la práctica antes de migrar los 7 |
| R-02 | Context overflow en TD-008 (7 archivos + sincronización de contenido) | Alta | Bajo | Abierto | Batch 2-3 tareas/sesión (L-085) |
| R-03 | ADR-016 requiere análisis más profundo del estimado | Media | Medio | Abierto | Mantener ADR-016 separado del sync de contenido |
| R-04 | TD-008 (Bloque C) desplaza indefinidamente a TD-007 (Bloque D) | Media | Bajo | Abierto | Ejecutar TD-011 (Bloque B) de forma independiente |
| R-05 | stop-hook-git-check.sh entra en loop infinito (no verifica `stop_hook_active`) | Media | Medio | **ACTIVO** | TD-013 en Bloque E — ejecutar antes que cualquier otro bloque |
