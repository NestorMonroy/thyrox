# math-authority-health

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --task TASK-THYROX-0911 --kind test --env THYROX_EXECUTION_ENTRY -- bash -c cd /home/user/thyrox/src/packages; for t in model-artifacts/__tests__/modelQualification.test.ts model-artifacts/__tests__/modelResolver.test.ts model-artifacts/__tests__/modelCatalog.test.ts local-models/__tests__/qualifyCommand.test.ts local-models/__tests__/qualificationStore.test.ts local-models/__tests__/externalArtifact.test.ts local-models/__tests__/ensureModel.test.ts artifact-registry/__tests__/diskAdmission.test.ts provider/__tests__/recommendExecution.test.ts; do d=${t%%/*}; f=${t#*/}; n=$(basename $t .test.ts); (cd $d && bun test $f) > /home/user/thyrox/.claude/workbench/math-specialist-capability-20261002T211311/outputs/health-$n.log 2>&1; rc=$?; echo "$t rc=$rc $(grep -E '^ *[0-9]+ (pass|fail)' /home/user/thyrox/.claude/workbench/math-specialist-capability-20261002T211311/outputs/health-$n.log | tr '\n' ' ')"; done
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
