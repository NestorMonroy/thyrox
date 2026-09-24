Corrección 2026-09-24T02:37:17 — sí declaran ``exports``; lo que falta es acotarlo
----------------------------------------------------------------------------------

La premisa decía *«ninguno declara ``exports``»*, y es falso. Remedido sobre
``HEAD`` con ``jq`` por manifiesto: **42 de 42** declaran ``exports`` como
objeto, con la condición ``types`` hacia ``dist/*.d.ts`` —las declaraciones que
emite ``src/typescript/emit_declarations.py``— y ``default`` hacia la fuente.
**28 de 42** incluyen además el comodín ``./*`` / ``./*.js``, que abre el árbol
entero del paquete como superficie. Las otras tres cifras de la premisa se
sostienen: 34 declaran ``main``, 8 no, y **0** declaran ``scripts.build``.

La corrección cambia la forma del sucesor, no su necesidad: el trabajo no es
*declarar* una superficie sino **acotarla** —retirar el comodín y dejar
explícitas las rutas que se consumen— y **construirla**, para que un símbolo
ausente lo reporte ``bun build`` y no la carga de un módulo en ``bun test``.

*Métrica:* tipo de ``.exports``, presencia de la clave ``./*``,
``scripts.build`` y ``main`` en los 42 ``package.json`` de ``src/packages``
versionados en ``HEAD``.
*Ciega a:* si las rutas explícitas de los 14 sin comodín son las que se
consumen — eso es otra medición, la del sucesor.

