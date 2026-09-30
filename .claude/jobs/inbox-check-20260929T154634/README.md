# inbox-check

## Qué se lanzó

```
bash -c cd src/packages && (cd agent && bun test __tests__/resetTaskList.test.ts __tests__/systemInitUdsInbox.test.ts) && (cd local-observability && bun test __tests__/udsMessaging.test.ts) && (cd app-host && bun test --feature=UDS_INBOX src/runtime/__tests__/messagingInboxAtLaunch.test.ts) && (cd cli && bun test --feature=UDS_INBOX __tests__/messagingInboxAtLaunch.e2e.test.ts __tests__/runStreamingUdsInbox.test.ts __tests__/print.test.ts); echo rc=$?; git -C /home/user/thyrox status --porcelain -- .claude/cache | head
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
