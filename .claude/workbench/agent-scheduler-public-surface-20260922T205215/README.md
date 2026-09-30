# Superficie pública de agent scheduler

## Pregunta

¿Las 21 aristas `TS2305` de `@thyrox/agent/scheduler` representan código no
portado o un facade que no publica sus módulos internos ya implementados?

## Evidencia

Todos los símbolos solicitados existen en `cronCore`, `cronTasksCore`,
`cronSchedulerCore`, `loopDynamicCore` o `loopSentinelCore`. La prueba roja
falló primero por `addCronTask` ausente del facade.

## Implementación

`scheduler.ts` publica explícitamente los contratos canónicos de los seis
módulos del scheduler. No duplica algoritmos ni crea stubs.

## Resultado

La prueba pública pasa. El typecheck bajó de 4 946 diagnósticos en 941 archivos
a 4 919 en 936; TS2305 bajó de 516 a 495 y las 21 aristas atribuidas a
`@thyrox/agent/scheduler` quedaron en cero.

*Métrica:* aristas TS2305 del provider, prueba pública y cabeceras TypeScript.
*Ciega a:* efectos de filesystem y timers del scheduler, cubiertos por sus
suites de comportamiento.

El typecheck completo no se copia al workbench: su salida autoritativa vive en
`.claude/jobs/ts2305-agent-scheduler-green-20260922T205249/outputs/salida.log`.
