# Superficie pública raíz de shell

## Pregunta

¿Los imports fallidos del test público de shell corresponden a módulos ausentes
o a implementaciones canónicas ocultas por un barrel parcial?

## Evidencia

Los 69 símbolos solicitados por el control ya existen en módulos canónicos no
legacy. Tras portar shellQuote, la prueba roja falló por el root que aún no
publicaba `tryParseShellCommand`; la siguiente discriminación encontró también
`getCommandSpec` oculto.

## Implementación

El root publica explícitamente tipos y funciones desde parser, commands,
prefix, providers, discovery, snapshots, execution y ShellCommand. No usa
`export *` sobre copias legacy ni duplica implementaciones.

## Resultado

Las 42 pruebas del contrato raíz pasan. El typecheck baja de 4 879 diagnósticos
en 924 archivos a 4 797 en 924; TS2305 baja de 464 a 381 y las 69 aristas
directas del test raíz quedan en cero. La caída TS2305 adicional corresponde a
consumidores internos que comparten ese mismo barrel.

*Métrica:* prueba pública completa, aristas TS2305 y cabeceras globales.
*Ciega a:* side effects de comandos reales; cada módulo conserva sus suites.
