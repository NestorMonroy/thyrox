# clasdeps

## Qué se lanzó

```
bash -c cd /home/user/thyrox && python3 .claude/workbench/izar-dependencias-a-la-raiz-20260919T103301/probes/classify_undeclared_deps.py > .claude/workbench/izar-dependencias-a-la-raiz-20260919T103301/outputs/antes.txt 2>&1; echo EXIT=$?
```

## Qué se preguntaba

El censo de dependencias sin declarar de los 19 paquetes restantes
(`TASK-THYROX-0224`), con las tres cegueras del instrumento anterior ya
cerradas: el `import()` dinámico, la autorreferencia de un paquete con
`exports`, y el izado a la raíz —que obliga a medir la resolución **por
conducta** (`bun -e "await import(X)"`) en vez de inferirla del manifiesto.

Corre en segundo plano porque lanza un subproceso `bun` por cada par
(paquete, nombre): es determinista y largo, así que es un proceso, no un
agente.

## Qué se recogió

`EXIT=0`. El censo aterrizó en `outputs/antes.txt` del banco; su lectura y el
reparto en cinco clases viven en el `README.md` de
`.claude/workbench/izar-dependencias-a-la-raiz-20260919T103301/`, que es donde
se cita.

La cifra de cabecera —**122 → 25** dependencias sin declarar, y las 25
restantes todas `ref:ninguno`— es propiedad del banco, no de este registro:
aquí sólo consta que la corrida asentó limpia.

*Metrica:* código de salida del guion, recogido por el marcador del ledger.
*Ciega a:* si el censo midió bien — el exit 0 dice que terminó, no que su
clasificación sea correcta. Eso lo mide el propio instrumento contra la
resolución por conducta, no este trabajo.
