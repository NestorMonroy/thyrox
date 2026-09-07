/**
 * Porte COMPLETO de `ccnmt: packages/mcp-runtime/src/client/authCache.ts` —
 * sus 4 exportaciones, ninguna omitida.
 *
 * Cache en disco de "este servidor MCP necesita autenticación", con TTL de
 * 15 minutos, para no repetir el chequeo de auth en cada reconexión.
 *
 * `@thyrox/local-observability/slowOperations.js` SÍ resuelve (pasa el
 * filtro de dos pasos: declara el subpath y exporta `jsonParse`/
 * `jsonStringify`, verificado en runtime con `Bun.resolveSync`) —
 * reapuntado, directiva del ejecutor 2026-09-07.
 *
 * `@claude-code-how-works/config/env/utils` NO se reapunta: aunque
 * `@thyrox/config` declara el subpath `./env/utils`, ese módulo es un
 * PORTE PARCIAL declarado (TASK-DOCS-0200) que sólo trae 3 de los 17
 * símbolos de la fuente — `isEnvTruthy`, `readEnv`, `getAllEnv` — y
 * `getClaudeConfigHomeDir` está explícitamente entre los 14 omitidos. El
 * especificador de la fuente se conserva verbatim como deuda declarada
 * (no basta con que el subpath exista; el símbolo tiene que existir en él
 * — la segunda mitad del filtro de dos pasos).
 */
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import { dirname } from "path";
import { jsonParse, jsonStringify } from "@thyrox/local-observability/slowOperations.js";
import { getClaudeConfigHomeDir } from "@claude-code-how-works/config/env/utils";

const MCP_AUTH_CACHE_TTL_MS = 15 * 60 * 1000;

type McpAuthCacheData = Record<string, { timestamp: number }>;

export function getMcpAuthCachePath(): string {
	return `${getClaudeConfigHomeDir()}/mcp-needs-auth-cache.json`;
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
