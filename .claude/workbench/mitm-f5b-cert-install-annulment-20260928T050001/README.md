# Anulación — F5b: la confianza del sistema en la CA del MITM

Sujeto: `src/packages/mitm/src/cert/install.ts`.

Método: cada mitad de juicio se retira con `bin/replace_literal`, se corren
`__tests__/cert/install.test.ts` y `trustTarget.test.ts`, y se restaura.
Resultados verbatim en `results.txt`. Los comandos del sistema son ejecutables
falsos en el PATH que registran su argv; el directorio del almacén, la
elevación de Windows y HOME se inyectan, así que ninguna prueba toca el
almacén de confianza real (el contenedor corre como root y tiene
`update-ca-certificates`).

Cada anulación tumba su caso: el `chmod 0644` tras `cp` y su reparación
(#9442), la normalización de la huella de macOS, la huella en la consulta de
Windows (#7275), la clasificación de la cancelación, la bandera
`THYROX_MITM_SKIP_SYSTEM_TRUST`, la vuelta sin `--fresh` al retirar y el alta
en NSS.

La elección del candidato de Linux NO discriminaba con un solo candidato
inyectado; se añadió el caso de dos (el primero sin directorio) y ahora cae
exactamente ese caso.

Métrica: casos `(fail)` de bun:test por anulación.
Ciega a: el comportamiento real de `certutil`, `security` y
`update-ca-certificates` (sólo se mide qué se invoca y en qué orden), y a
Windows y macOS reales (la plataforma se simula).
