# Censo de `.json` versionados, antes de convertir ninguno

La tarea TASK-THYROX-0066 («en thyrox ya no vamos a usar json vamos a usar
JSONL») declara su condicion de cierre asi: *el censo con su clasificacion por
bucket persistido en el banco ANTES de convertir ningun archivo*. Este banco es
ese censo. **Cero archivos convertidos hasta aqui.**

## El criterio de clasificacion es QUIEN LEE, no la extension

Un `.json` versionado se convierte si y solo si el unico lector es thyrox. Si lo
lee un tercero —`bun`, `tsc`, el cliente de Claude Code, `claude plugin eval`—
su formato es un contrato ajeno y convertirlo lo rompe sin ganar nada.

| Bucket | Que es | Archivos |
|---|---|---|
| **A** | contrato de tercero — NO se convierte | 57 |
| **B** | ya es JSONL | 3 |
| **C** | propiedad de thyrox — candidato | 92 |
| **D** | evidencia capturada — NO se convierte | 314 |

El desglose vive en `censo-por-bucket.txt`; lo reproduce `python3 censo.py`
desde la raiz de thyrox.

## El cuarto bucket no estaba en el encuadre de partida, y es el mayor

El esquema con que se abrio la tarea tenia tres clases: tercero, ya-JSONL, y
nuestro. **314 archivos no caben en ninguna de las tres**, y son el 67 % del
universo: son volcados **verbatim** de la salida de un tercero, escritos por
nosotros dentro de `outputs/` de un banco. 297 de ellos son un solo volcado del
board del cliente.

Los escribimos, asi que no son bucket A. Y convertirlos destruiria exactamente
lo que los hace evidencia: su identidad byte a byte con lo que el tercero
emitio. Un volcado reformateado ya no prueba que el tercero emitiera eso.

## El bucket A es cinco veces mayor de lo que el encuadre suponia

El encuadre de partida nombraba «cinco escritores de `settings.json`». Medido,
el bucket A son **57** archivos y `settings.json` no es su forma dominante:

```
package.json  31   ·   tsconfig*.json  21   ·   evals*.json  4   ·   plugin.json  1
```

`package.json` y `tsconfig*.json` los lee la toolchain (`bun`, `tsc`); los
`evals*.json`, `claude plugin eval`. Ninguno admite JSONL.

## Lo que el censo NO decide, y es la pregunta siguiente

El censo mide **de quien es** cada archivo. No mide **si JSONL le sirve**, que
es otro eje. `forma-de-la-raiz.txt` lo mide para los cinco nombres del bucket C,
y el resultado no es uniforme: cuatro de los cinco son un **documento unico**,
no una coleccion de registros. Sobre un documento unico, JSONL degenera a n=1
—una sola linea— y lo unico que cambia es perder el sangrado.

Y «`manifest.json` ×87» es a su vez **dos poblaciones** con formas distintas: 46
manifiestos de job (2 claves) y 41 de banco (5-9 claves). Contarlos juntos es el
sub-patron A de `metrica-decide-la-conclusion.md` dentro del propio censo.

Igual el conteo de lectores de `manifest.json`: tres artefactos distintos
comparten ese nombre —el manifiesto de banco (nuestro), el manifiesto DXT
(contrato de Anthropic, `src/packages/config/dxt/helpers.ts`) y un manifiesto de
release que se descarga por HTTP y ni siquiera esta en el arbol
(`src/packages/updater/src/nativeInstaller/download.ts:333`)—. Por eso el censo
publica ahora **la lista** y la rotula `nombran<=N`: el conteo es una cota
superior del radio de la conversion, no su medida, y solo se lee bien mirando
quien lo compone. El primer grep contaba ademas dos `.d.ts` de `node_modules`
que ni siquiera son codigo nuestro.

*Metrica:* `git ls-files` menos `_references/`, `_archived/` y `node_modules`,
clasificado por lector; mas `json.load` sobre un ejemplar de cada nombre del
bucket C.
*Ciega a:* si algun lector de bucket A acepta JSONL (no se probo, se infirio del
formato que su documentacion declara); a si un archivo de bucket D se puede
regenerar en vez de conservarse; a la forma interna de los 297 volcados del
board, clasificados por su ruta y no por su contenido; y al **uso** de JSON en
tiempo de ejecucion — un `json.dump` o un `JSON.stringify` que emite a una ruta
gitignored es «usar JSON» sin dejar archivo versionado, y `git ls-files` no lo
puede ver.
