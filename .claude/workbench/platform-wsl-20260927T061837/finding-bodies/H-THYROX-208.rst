Qué estaba mal
--------------

El puerto de ``@thyrox/config/platform`` tenía ``getPlatform`` y
``getWslVersion`` como dos funciones memoizadas, cada una con su propia
lectura síncrona de ``/proc/version``. La fuente (2.1.283,
``chunk-fmsbxtrp.js``) es otro flujo: un solo detector (clase ``S``, su
ejemplar ``p()``) que lee el kernel una vez (``kernelString``), y que
``init()`` ceba de forma asíncrona (``prime``) en el mismo
``Promise.all`` que los certificados de CA y mTLS. El cebado anula la
plataforma y la versión ya decididas.

Cómo se vio
-----------

Primero se buscó el literal ``/proc/version``: encuentra a quien lee el
archivo, no a quien usa el mecanismo, y el paso de las variables
``WSL_DISTRO_NAME``/``WSL_INTEROP`` y el cebado quedaron fuera de vista.
Se vio al subir desde la definición a sus usos con
``bin/binary references`` (:ref:`h-thyrox-210`): ``p`` tiene 5 usos, los
cinco envoltorios del módulo, y ``pBo`` (``.prime``) tiene uno, ``init()``.

*Métrica:* usos de ``p`` y ``pBo`` que ``references`` publica sobre los
2138 chunks de 2.1.283.
*Ciega a:* usos por acceso dinámico (``obj[nombre]``), que no son
identificadores.

Qué se hizo
-----------

``PlatformDetector`` porta la clase con fuentes inyectadas; las funciones
del módulo delegan en su único ejemplar y ``init()`` espera
``primePlatform()`` en el punto de la fuente. Banco:
``thyrox: .claude/workbench/platform-wsl-20260927T061837/``.

Control de anulación: releer ``/proc/version`` en cada método cae el caso 1;
un ``prime`` que no anula la plataforma cae el caso 2, y ninguno más.
