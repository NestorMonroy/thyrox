# ident-baseline

## Qué se lanzó

```
bash -c cd /home/user/thyrox && PYTHONPATH=src python3 src/verify/check_identifier_language.py --write-baseline; wc -l < .claude/baselines/identifier_language_baseline.txt; grep -c '\.py::' .claude/baselines/identifier_language_baseline.txt; PYTHONPATH=src python3 src/verify/check_identifier_language.py | tail -1
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
