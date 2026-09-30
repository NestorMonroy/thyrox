set -u
cd /home/user/thyrox/src/packages/provider
bun test src/accounts/refresh/__tests__/tokenRefreshSharedLease.test.ts src/proxy/resilience/__tests__/credentialCooldownShared.test.ts src/proxy/resilience/__tests__/rateLimitManagerSharedWindow.test.ts < /dev/null 2>&1 | tail -4
echo "--- tests existentes de los tres archivos"
bun test $(git ls-files 'src/**/__tests__/*' '__tests__/*' | grep -iE "tokenRefresh|credentialCooldown|rateLimitManager" | grep -v Shared) < /dev/null 2>&1 | tail -4
cd /home/user/thyrox && timeout 500 bash bin/check_package_typecheck --strict provider < /dev/null 2>&1 | tail -3
