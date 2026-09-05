```yml
Fecha: 2026-03-31
Tipo: Phase 7 (TRACK)
```

# Lecciones — Consistencia del SKILL

## L-022: Si el framework define una convención, debe cumplirla al 100% — no al 90%

3 de 33 assets usaban SCREAMING_SNAKE mientras el SKILL define kebab-case. El 90% de compliance es 0% de credibilidad. Si el creador no sigue sus propias reglas, los usuarios tampoco lo harán. Misma lección que L-017 pero aplicada a naming.

## L-023: Separar framework decisions de project decisions — el template no es el proyecto

Los 12 ADRs en `context/decisions/` eran decisiones del framework (markdown only, conventional commits), no del proyecto del usuario. Cuando alguien usa el template para su e-commerce, esos ADRs confunden. Las locked decisions en CLAUDE.md ya codifican las mismas reglas — duplicación que genera confusión.

## L-024: Un framework opcional es un framework ignorado

Si CLAUDE.md dice "Consultar SKILL" sin decir que es obligatorio, Claude puede ignorar el framework completo cuando el usuario dice "arregla este bug". La corrección fue explícita: "Todo trabajo pasa por el SKILL — incluso un bug fix usa fases 1,2,6,7."

## Resumen

| Corrección | Archivos | Cambio |
|-----------|----------|--------|
| 3 assets renombrados a kebab-case | 3 assets + 5 refs | Naming 100% consistente |
| setup-template.sh limpia decisions/ | 1 script | Template limpio |
| CLAUDE.md flujo reescrito | 1 archivo | SKILL unavoidable |
