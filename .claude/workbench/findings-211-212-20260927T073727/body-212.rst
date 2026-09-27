Evidencia
---------

``bin/binary references chunk-z4sfgzqt.js v`` sobre 2.1.283 daba *0 uso(s)*
de ``microphoneAuthorizationStatus``. El consumidor existe:
``chunk-11jfjeh3.js`` define el cargador ``f`` con
``r=await import("/$bunfs/root/chunk-z4sfgzqt.js")`` y lo usa desde
``me``, ``ve``, ``we`` y ``F`` como ``(await f(o)).isNativeAudioAvailable()`` o
``i=await f(n); i.startNativeRecording(…)``. Tras el cambio,
``references chunk-z4sfgzqt.js c`` da 5 usos en 1 chunk.

*Métrica:* usos de los nombres exportados por el chunk, seguidos por import
con nombre y por namespace, dentro del alcance léxico de cada ligadura.
*Ciega a:* el namespace guardado en una propiedad (``e.audioNapi=r``) y leído
después por esa propiedad, y los cargadores que no lo devuelven por
``return``.

Control de anulación
(``src/packages/binary/__tests__/namespaceReferences.test.ts``): sin
``import*as`` cae el caso 1; sin ``import()``, los casos 2 a 5; sin cargador o
sin ligado, los casos 3 a 5; sin alcance léxico, sólo el 3.
