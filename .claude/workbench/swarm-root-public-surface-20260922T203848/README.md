# Superficie pública raíz de swarm

## Pregunta

¿Los 81 `TS2305` de `@thyrox/swarm` representan código no portado o un barrel
que todavía oculta implementaciones existentes?

## Evidencia

El censo concurrente localizó todos los símbolos solicitados dentro de módulos
canónicos de swarm: mailbox, permissions, worktree, teammate tasks, detection,
layout, reconnection e initialization. La prueba roja falló primero porque
`IT2_COMMAND` no estaba exportado por `src/index.ts`.

## Implementación

El barrel republica explícitamente los símbolos consumidos desde su módulo
canónico. No se usa `export *` sobre módulos con colisiones (`isInsideTmux` e
`isTmuxAvailable`) y no se duplican funciones. `TeammateMessage` se publica
como type desde mailbox, no con el alias de backend que significa otra cosa.

## Resultado

La prueba pública pasa. El typecheck bajó de 5 050 diagnósticos en 946 archivos a 4 971 en 941; TS2305 bajó de 619 a 538 y las 81 aristas atribuidas a `@thyrox/swarm` quedaron en cero. El total neto baja 79 porque resolver el barrel permitió a TypeScript revelar errores de contrato aguas abajo; no se ocultan como regresión.

*Métrica:* aristas TS2305 del provider y cabeceras TypeScript totales.

*Ciega a:* operaciones reales de git/tmux/mailbox, cubiertas por las suites de
sus módulos; este control mide la frontera pública raíz.
