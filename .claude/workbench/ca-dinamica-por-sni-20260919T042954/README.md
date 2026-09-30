# CA dinamica por SNI — escalon 1 del inspector MITM

Cita durable: **TASK-THYROX-0207** (board #516, decidido SI por el ejecutor).
Sucesor declarado: **TASK-THYROX-0213**.

## La pregunta

Un inspector que intercepta hosts **arbitrarios** no puede llevar un
certificado estatico: no sabe de antemano que SNI le van a pedir. Necesita una
CA local que emita la hoja en el momento. Este escalon entrega esa pieza y
nada mas — la que se puede medir sin levantar un listener.

## La decision: el mecanismo de la fuente, no una reimplementacion

`porte-completo-no-parcial.md` admite construir el mecanismo **cuando el stack
no lo trae**. Aqui si lo trae, y eso se midio antes de decidir:

| Via | Medido |
|---|---|
| `selfsigned` v5 (lo que usa la fuente) | instalable: `bun add selfsigned@5.5.0` -> 46 paquetes en 94 ms |
| `node:crypto` de Node 22 | `X509Certificate` existe y es **solo de lectura**; no hay API de emision |
| `openssl` 3.0.13 | presente, y emite CA + hoja firmada con SAN (`openssl verify` -> OK) |

Con la dependencia disponible, la fidelidad al porte gana: el modulo es
`omniroute: src/mitm/tproxy/dynamicCert.ts` con el alcance reescrito y los
comentarios en español. `openssl` **no se descarta** — pasa a ser el
verificador del control, que es donde rinde.

### Divergencia de sitio, declarada

La fuente parte el subsistema en dos porque conserva los dos: `mitm/cert/`
para el certificado estatico heredado y `mitm/tproxy/` para el dinamico. Aqui
llega **solo el dinamico**, asi que el nivel `tproxy/` no tendria hermano con
el que contrastar y el modulo vive en `provider/src/mitm/` a secas. El hogar
es `provider` porque ahi vive `proxy.ts`, con `shouldBypassProxy` y
`matchesCidrBlock` (TASK-THYROX-0204).

## El control: el verificador es OTRO programa

Comprobar que `tls.createSecureContext` acepta el PEM mide que el PEM
**parsea**, no que la cadena **valide**. Un contexto se construye igual con
una hoja autofirmada que no encadena a la CA. Por eso la cadena la verifica
`openssl verify -CAfile`, que es una implementacion independiente de la que
emite.

**Anulacion.** Retirado el `ca:` de `issueLeafCert` —la hoja queda
autofirmada— cae **exactamente 1 de los 8 casos**: el de `openssl verify`. Los
otros 7 siguen verdes, y entre ellos los **dos de cache**, que construyen un
`SecureContext` sin quejarse de que la cadena este rota.

Ese contraste es el resultado, no un tramite: un control que solo hubiera
usado `createSecureContext` habria publicado verde con el firmado roto — el
sub-patron D de `metrica-decide-la-conclusion.md` con este modulo como sujeto.

| Momento | Veredicto |
|---|---|
| sin modulo | 0 pass, 1 fail, 1 error (`Cannot find module`) |
| tras el porte | **8 pass, 0 fail**, 12 `expect()` |
| con el firmado anulado | 7 pass, **1 fail** — solo `openssl verify` |
| restaurado (`diff -q` byte a byte) | 8 pass, 0 fail |

*Metrica:* el veredicto de `openssl verify` y el texto de `openssl x509 -text`.
*Ciega a:* si un cliente TLS real acepta la hoja en un apreton de manos —
eso exige un listener, y es TASK-THYROX-0213; y la politica de confianza del
sistema operativo, que este modulo no toca.

## El manifiesto: al consumidor, no a la raiz

`bun add` puso `selfsigned` en la **raiz** con pin exacto, creando ahi un
bloque `dependencies` que **no existia** (la raiz tenia cero), y de paso
desescapo un em-dash del `description`. Se restauro la raiz entera con
`git checkout` y se declaro `^5.5.0` en `src/packages/provider/package.json`,
que es la forma que este pase ya uso cuatro veces. Izar a la raiz es
**TASK-THYROX-0098**: decision futura, no practica de hoy.

## Episodio, registrado porque es el defecto de esta misma sesion

Tres veces en este pase, y la tercera **sin suerte**:

1. `TASK-THYROX-0213` se escribio en el docstring **antes** de acuñarla. Al
   acuñarla coincidio — y coincidir no es metodo.
2. Antes, `0210` y `0211`, igual, tambien con suerte.
3. En la primera version de este banco se escribieron `TASK-THYROX-0186` y
   `TASK-THYROX-0190` **de memoria**. Las dos **resuelven** —a *«shouldBypassProxy
   es ciego a tres formas»* y a *«ningun gate mide identificadores dentro de un
   `.sh`»*— y **ninguna nombra el sujeto pretendido**. Las reales son **0207**
   (el inspector MITM) y **0204** (la ceguera IPv6), halladas por **sujeto** con
   una consulta al store.

Ese tercer caso es la evidencia de que la prosa de **H-THYROX-111** no previene
su propio defecto: el gate mide **resolucion** y hace falta uno que mida el
**sujeto**. Queda bajo **TASK-DOCS-0434**.

## Lo que este escalon NO cierra — TASK-THYROX-0213

Emite y cachea; **no** instala la CA en el almacen de confianza del sistema ni
levanta ningun listener. La fuente tiene las dos piezas
(`cert/install.ts`, `tproxy/tlsCapture.ts`) y quedan fuera a proposito:
instalar una CA que firma cualquier host es una capacidad poderosa y un acto
explicito, no un efecto colateral de portar un modulo.
