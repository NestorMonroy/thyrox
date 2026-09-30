# Predicciones ANTES del barrido

Se escriben antes de correr nada: una prediccion redactada despues del
resultado no puede fallar, y un control que no puede fallar no discrimina.

## Fase A — emision

- **39 de 42 emiten.** Los tres que NO: `agent`, `cli`, `bridge`, porque su
  programa importa fuera de su `rootDir` y el preflight los rehusa antes de
  derramar un `.d.ts` junto a la fuente ajena.

## Fase B — repunte, y su medicion

- **El cubo `sibling` cae a ~0 en todo paquete repuntado.** Es el caso que
  discrimina: si alguno sigue publicando miles de errores de hermano, su
  repunte es INERTE — la trampa de `exports` sombreando a `types` que ya se
  midio sobre `storage`.
- **`check-cli-typecheck` cae de 2821 a ~= propio de cli (1319) + propio de
  agent (463) + propio de bridge, porque esos dos siguen resolviendo a
  fuente.** Si aterriza en otra cifra, se movio algo mas y hay que medirlo
  antes de declarar nada.
- **El `own` de algun paquete CAMBIA entre los dos congelados.** Ese es el
  hallazgo real: la declaracion no llevo lo que el compilador infirio de la
  fuente. El contraste solo existe si el primer baseline no se sobreescribe.

## Lo que NO se hace

- **No se corre `--strict` contra el baseline pre-barrido.** Su referente
  cambia: se midio con los hermanos como `.ts` y despues seran `.d.ts`.
  Compararlos seria medir dos fenomenos bajo un rotulo, que es el
  sub-patron A otra vez.
