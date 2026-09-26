# ledger-split-suites

## Qué se lanzó

```
bash -c cat .claude/workbench/prompt-cache-ttl-port-20260926T032009/ledger-suites.txt | parallel -j4 -k 'case {} in *.py) r=$(PYTHONPATH=src timeout 600 python3 {} 2>&1 | tail -1);; *) r=$(timeout 600 bash {} 2>&1 | tail -1);; esac; echo "{}	exit=$?	$r"' > .claude/workbench/prompt-cache-ttl-port-20260926T032009/ledger-suites.out 2>&1
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
