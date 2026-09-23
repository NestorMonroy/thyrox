# ts2305-shell-root-green

## Qué se lanzó

`bunx tsc --noEmit` mediante `bin/thyrox-bg`, recogido por `bin/wait-jobs`.

## Qué se preguntaba

¿La superficie canónica de shell elimina las aristas del test raíz sin ocultar
el baseline?

## Qué se recogió

4 797 diagnósticos en 924 archivos, TS2305=381 y TS2307=19. Las 69 aristas
directas del test raíz quedan en cero. El exit global sigue siendo 2.
