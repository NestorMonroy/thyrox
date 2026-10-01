# forceExit de producción (2.1.283)

`bin/binary literal SIGKILL` (59 declaraciones, `literal-SIGKILL.txt`)
incluye la clase `Zmo` de `chunk-csayct82.js`; `bin/binary symbol
chunk-csayct82.js Zmo` la extrae entera (`symbol-Zmo.txt`). Su `forceExit`:

    forceExit(e){ limpia el failsafe; try{ drainStdin() }catch{}
      try{ process.exit(e) }catch(n){ process.kill(process.pid,"SIGKILL") }
      throw Error("unreachable") }

El porte anterior añadía dos ramas por `NODE_ENV=test`: re-lanzar el error
de `process.exit` en vez de SIGKILL, y volver en silencio si `process.exit`
volvía. Eran conducta que sólo existía en las pruebas, y el comentario
atribuía el fallo de `exit` a un «probablemente EIO». Portado tal cual el
ejecutable; las pruebas sustituyen `process.exit` y `process.kill` por
espías y observan la conducta real.

`shutdownSync` de 2.1.283 también llama a `forceExit` desde su manejador de
fallo; con una salida sustituida que vuelve, sale dos veces. La prueba lo
afirma en vez de ocultarlo.

Deriva que queda fuera de este paso: 2.1.283 convirtió el módulo en una
clase (`claimShutdown`, `armFailsafeAndDrainStdout`, `waitForHeldOAuthRefresh`,
presupuesto `max(5000, hook + 5000)` en vez de `+ 3500`...).
