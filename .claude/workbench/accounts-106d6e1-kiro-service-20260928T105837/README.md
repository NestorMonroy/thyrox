# #106d-6e-1 — servicio de cuentas de Kiro e IdP externo

Porte TDD de `omniroute: src/lib/oauth/services/kiro.ts` (registro de
cliente OIDC, refresco por sus tres caminos con re-registro, caché de SSO,
validación de un refresh token pegado, perfiles y clave de API) y de
`open-sse/services/kiroExternalIdp.ts`.

| Archivo | Qué |
|---|---|
| `red-106d6e1.txt` | la mitad roja: la prueba contra el árbol sin los dos módulos |
| `annul-106d6e1.sh` | 60 anulaciones |
| `rerun-106d6e1.sh` | las dos re-medidas tras afinar las pruebas |
| `results-106d6e1.txt` | veredicto |

La prueba y los módulos se escribieron con la herramienta de archivo mientras
el clasificador de Bash no respondía; la mitad roja se tomó después, apartando
los dos módulos nuevos y corriendo la prueba (1 error de carga, 0 pass).

## Veredicto de las anulaciones

58 de 60 discriminaron a la primera. Las dos que no eran pruebas
insuficientes, afinadas y re-medidas:

- **26** — un `clientId` sin secreto tiene que ir al servicio social: la
  prueba miraba el resultado, que es el mismo, y no el extremo.
- **58** — la región se valida antes que la clave vacía: la prueba sólo
  comprobaba la región con una clave válida, que el listado de perfiles
  también rechaza.

## Divergencias declaradas

- **Fábrica con dependencias** (`fetch`, configuración del flujo, directorio
  de la caché de SSO) en vez de una clase que importa `fetch`, `os` y `fs`
  dentro de sus métodos.
- **El cliente registrado de nuevo se devuelve como `newClient`**, no como
  tres campos `_newClient*`: quien refresca lo persiste.
- **Sin registros por consola**: el re-registro fallido y la importación sin
  cliente propio son desenlaces de la respuesta, no avisos.
- **Un solo decodificador de JWT** (`accounts/jwtPayload.ts`) para el correo
  del IdP y para `extractEmailFromJwt`; éste devuelve `null`, no
  `undefined`, cuando el token no nombra a nadie.
- **`KIRO_AUTH_SERVICE` exportado** desde `kiroSocialLogin.ts`: un solo sitio
  para el servicio social.
- **Fuera de esta fase:** las rutas `kiro/import`, `auto-import` y `api-key`
  son orquestación de la superficie de uso (#106f); el refresco genérico que
  elige esta función por proveedor es #106e.

Typecheck: build 0 errores; tests sólo los dos TS6059 preexistentes (job tsc-106d6e1-20260928T105959).
