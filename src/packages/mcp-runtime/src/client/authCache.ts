/**
 * Porte COMPLETO de `ccnmt: packages/mcp-runtime/src/client/authCache.ts` —
 * sus 4 exportaciones, ninguna omitida.
 *
 * Cache en disco de "este servidor MCP necesita autenticación", con TTL de
 * 15 minutos, para no repetir el chequeo de auth en cada reconexión.
 *
 * `jsonParse`/`jsonStringify` vienen de
 * `@thyrox/local-observability/slowOperations.js` y `getConfigHomeDir` de
 * `@thyrox/config/env/utils`.
 */
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import { dirname } from "path";
import { jsonParse, jsonStringify } from "@thyrox/local-observability/slowOperations.js";
import { getConfigHomeDir } from "@thyrox/config/env/utils";

const MCP_AUTH_CACHE_TTL_MS = 15 * 60 * 1000;

type McpAuthCacheData = Record<string, { timestamp: number }>;

export function getMcpAuthCachePath(): string {
	return `${getConfigHomeDir()}/mcp-needs-auth-cache.json`;
}

let authCachePromise: Promise<McpAuthCacheData> | null = null;

export function getMcpAuthCache(): Promise<McpAuthCacheData> {
	if (!authCachePromise) {
		authCachePromise = readFile(getMcpAuthCachePath(), "utf-8")
			.then((data) => jsonParse(data) as McpAuthCacheData)
			.catch(() => ({}));
	}
	return authCachePromise;
}

export async function isMcpAuthCached(serverId: string): Promise<boolean> {
	const cache = await getMcpAuthCache();
	const entry = cache[serverId];
	if (!entry) return false;
	return Date.now() - entry.timestamp < MCP_AUTH_CACHE_TTL_MS;
}

let writeChain = Promise.resolve();

export function setMcpAuthCacheEntry(serverId: string): void {
	writeChain = writeChain
		.then(async () => {
			const cache = await getMcpAuthCache();
			cache[serverId] = { timestamp: Date.now() };
			const cachePath = getMcpAuthCachePath();
			await mkdir(dirname(cachePath), { recursive: true });
			await writeFile(cachePath, jsonStringify(cache));
			authCachePromise = null;
		})
		.catch(() => {});
}

export function clearMcpAuthCache(): void {
	authCachePromise = null;
	void unlink(getMcpAuthCachePath()).catch(() => {});
}
