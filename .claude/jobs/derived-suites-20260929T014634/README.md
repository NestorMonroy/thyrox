# derived-suites

## Qué se lanzó

```
bash -c cd /home/user/thyrox && PYTHONPATH=src bash bin/parallel_map 'case {} in *.py) python3 {} ;; *) bash {} ;; esac > .claude/workbench/parallel-map-20260929T013858/suite-$(basename {}).log 2>&1; echo "{} exit=$?"' :::: .claude/cache/derived-run.txt
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
