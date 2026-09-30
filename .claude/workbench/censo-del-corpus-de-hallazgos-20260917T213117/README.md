# El censo del corpus de hallazgos

La regla `hallazgos-documentacion-obligatoria.md` llevaba once cifras de este
corpus. `calibration-verified-numbers.md` prohíbe esa forma desde 2026-08-13 por
su corolario —*si el número lo produce un comando, la prosa nombra el comando*—
y hasta hoy ese comando no existía.

## La mitad roja

`outputs/mitad-roja.txt` — `ImportError: cannot import name 'census_findings'`,
antes de escribir una línea del mecanismo.

## El control que discrimina

`outputs/anulacion-lista-cerrada.txt` — sustituida la derivación de prefijo y de
raíz por las seis conocidas, la suite cae de 19/19 a **13/19**. Las seis que caen
son exactamente las que dependen de la derivación; las trece restantes —monolitos,
suelto, mediana, corpus vacío— sobreviven porque no dependen de ella.

Esa es la exigencia del censo: el mecanismo es del **proveedor** y el corpus del
**consumidor**, así que una lista cerrada dejaría fuera en silencio a un
consumidor con un prefijo inédito, con el total pareciendo sano.

## El censo contra el árbol real

`outputs/censo-real.txt`, y los 22 trabajos del pool que lo precedieron.

## Reproducir

    cd /home/user/thyrox && python3 tests/hallazgo/test_census_findings.py
    cd /home/user/kaupamex-docs && bash /home/user/thyrox/bin/census_findings
