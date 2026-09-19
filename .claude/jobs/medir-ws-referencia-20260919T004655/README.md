# medir-ws-referencia

## Qué se lanzó

```
bash -c 
O=/home/user/nestormonroy/omniroute
echo "=== quien llama resolveEnvProxyUrl / resolveProxyForRequest ==="
grep -rn "resolveEnvProxyUrl\|resolveProxyForRequest" --include=*.ts --include=*.js "$O/open-sse" "$O/src" 2>/dev/null | grep -v node_modules
echo
echo "=== hay camino de proxy para websocket? ==="
grep -rln "wss\?://" --include=*.ts "$O/open-sse" "$O/src" 2>/dev/null | grep -v node_modules | head -20
echo
echo "=== proxyFetch: se usa para ws? ==="
grep -rn "proxyFetch\|proxyAgent\|HttpsProxyAgent\|SocksProxyAgent" --include=*.ts "$O/open-sse/utils" 2>/dev/null | head -20

```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
