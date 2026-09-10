```yml
type: Risk Register
created_at: 2026-04-15 02:23:24
wp: commands-rellinks
fase: FASE 38
```

# Risk Register — commands-rellinks (FASE 38)

| ID | Riesgo | Probabilidad | Impacto | Severidad | Mitigación | Estado |
|----|--------|-------------|---------|-----------|-----------|--------|
| R-1 | Path breakage post-move: commands referencian `.claude/skills/...` desde raíz; después del move deben usar `../skills/...` | Alta | Alto | **CRÍTICO** | Actualizar todos los paths en el mismo commit que el move. Verificar con `grep -r ".claude/skills" .claude/commands/` post-move | Abierto |
| R-2 | Over-conversion: convertir referencias en code blocks o ASCII trees rompe legibilidad | Media | Medio | MEDIO | Regla explícita de conversión: solo prosa, tablas "Ver también", secciones "Referencias relacionadas". NO tocar ``````` bloques ni `├──` árboles | Abierto |
| R-3 | Link a archivo inexistente post-conversión | Baja | Medio | BAJO | Correr `detect_broken_references.py` como gate después de cada batch de conversiones | Abierto |
| R-4 | `init.md` referencia `workflow_init.md` con path desde raíz; en `.claude/commands/` ambos coexisten — path cambia de `.claude/commands/workflow_init.md` a `workflow_init.md` | Media | Bajo | BAJO | Fix trivial: eliminar el prefix `.claude/commands/` | Abierto |
