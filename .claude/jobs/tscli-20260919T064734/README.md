# tscli — el typecheck del paquete de entrada, ANTES del renombre

## Qué se lanzó

```
bash src/verify/check-cli-typecheck.sh
```

## Qué se preguntaba

El estado del lado TypeScript, que bloquea `tests/session/test_generate_bin.py`
por directiva. Va a segundo plano por ser un barrido determinista.

## Qué se recogió

`done:0` — y ése es el primer aviso: el gate se corrió **sin `--strict`**, así
que su código de salida no es su veredicto. El veredicto está en el log:
`check-cli-typecheck: el paquete no compila`, con **3942** líneas de error.

Lo que destapó, y es el sujeto del banco
`.claude/workbench/alcance-de-la-fuente-en-ant-20260919T065643/`: **40** líneas
de `import` bajo `src/packages/@ant/computer-use-mcp/src/legacy/` nombran
**nuestros** paquetes con el alcance de la fuente.

*Metrica:* `grep -c 'error TS'` sobre el log, y el conteo por código.
*Ciega a:* la separación entre «el código está roto» y «no hay nada
instalado» — el gate publica un veredicto único, y `node_modules` tiene 4
entradas y **0** enlaces de workspace. Ver el README del banco.
