# huerfanos-tras-repunte

## Qué se lanzó

```
cd /home/user/kaupamex-docs && bash /home/user/thyrox/bin/census_scripts --huerfanos
```

Con el cwd en el **consumidor**: `consumer_root()` asciende desde el directorio
de invocación y rehúsa si aterriza en el proveedor.

## Qué se preguntaba

`test_censar_scripts` fallaba con *«el generador declara una ruta anterior a la
mudanza; --huerfanos lee 0 en baseline»*. Tras repuntar `baseline_path()` a
`.claude/baselines/`, **¿cuántas entradas carga el gate de verdad?**

La aserción del test sólo mide **existencia** del archivo. Que exista no prueba
que el gate lo lea: un verde de `exists()` no distingue «el gate carga el
baseline» de «el gate apunta a algo que está ahí». Esta medición es la que sí
lo separa.

## Qué se recogió

```
censar-scripts: 0 huérfano(s) nuevo(s)
  (alcance medido: 9 guiones; 0 huérfanos en total; 5 en baseline)
```

**5 en baseline**, contra los 0 de antes — y coinciden exactamente con las
cinco entradas no-comentario que la sonda midió en el archivo real.

*Métrica:* entradas del baseline que el gate carga, y huérfanos nuevos sobre
su alcance medido.

*Ciega a:* si esas cinco entradas congeladas siguen siendo los guiones
correctos. El gate mide que no haya huérfanos **nuevos**, no que el baseline
esté al día — los cinco se congelaron al cerrar #912 y ninguno se ha
re-verificado desde la mudanza.
