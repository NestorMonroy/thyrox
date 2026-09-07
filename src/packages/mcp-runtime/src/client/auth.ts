/**
 * Porte COMPLETO de `ccnmt: packages/mcp-runtime/src/client/auth.ts` — sus
 * 3 exportaciones, ninguna omitida.
 *
 * Manejo de fallas de auth remota (SSE/HTTP/proxy de claude.ai) y el fetch
 * envuelto que renueva el token OAuth de claude.ai ante un 401.
 *
 * Reapuntados (pasan el filtro de dos pasos, directiva del ejecutor
 * 2026-09-07): `local-observability/logging` (`logMCPDebug`),
 * `local-observability` bare (`logEvent`) y `local-observability/compat`
 * (el tipo `AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS`).
 *
 * `checkAndRefreshOAuthTokenIfNeeded`/`getClaudeAIOAuthTokens`/
 * `handleOAuth401Error` (`@claude-code-how-works/provider/authAlias.js` —
 * `@thyrox/provider` NO declara ese subpath en su `exports`, sólo `.`,
 * `./anthropicHttp`, `./recorded`, `./sse`, `./cost/*`) se usan sólo dentro
 * de cuerpos de función (nunca a nivel de módulo), así que se envuelven con
 * `require()` diferido: un `import` estático de un paquete cuya base
 * (`@claude-code-how-works/*`) no existe en este árbol hace fallar la carga
 * del MÓDULO ENTERO (`Cannot find module`, medido con
 * `bun -e "import(...)"` antes de esta corrección), no sólo las funciones
 * que los usan. Mismo patrón que ya evita `appStateHooks.ts` de este puerto.
 *
 * Se conserva verbatim como deuda declarada, y ÉSTA SÍ sigue haciendo
 * fallar la carga del módulo aunque se difiera el `require()` de arriba —
 * es un import ESTÁTICO de un archivo LOCAL genuinamente ausente, no un
 * especificador `@claude-code-how-works/*` con sustituto diferible:
 * - `../utils.js` — `utils.ts` NO se portó en este pase (bloqueado por
 *   `@claude-code-how-works/tool-registry` y `/repl`, ninguno de los dos
 *   existe en `@thyrox/*` todavía; ver el hallazgo de esta iniciativa).
 *   Este archivo queda con su import intacto y su carga bloqueada hasta que
 *   `utils.ts` se porte — mismo patrón que documenta
 *   `@thyrox/app-host: src/runtime/installPluginBindings.ts` para un caso
 *   análogo.
 * - `@modelcontextprotocol/sdk/shared/transport.js` — declarado en
 *   `package.json`, sin `node_modules` enlazado todavía (hueco de entorno
 *   preexistente, no del porte).
 */
import type { FetchLike } from "@modelcontextprotocol/sdk/shared/transport.js";
import { logMCPDebug } from "@thyrox/local-observability/logging";
import { getLoggingSafeMcpBaseUrl } from "../utils.js";
import type { MCPServerConnection, ScopedMcpServerConfig } from "../types.js";
import { logEvent } from '@thyrox/local-observability'
import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '@thyrox/local-observability/compat'
import { setMcpAuthCacheEntry } from "./authCache.js";

function requireProviderAuthAlias(): {
	checkAndRefreshOAuthTokenIfNeeded: () => Promise<void>;
	getClaudeAIOAuthTokens: () => { accessToken?: string } | undefined;
	handleOAuth401Error: (sentToken?: string) => Promise<boolean>;
} {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	return require("@thyrox/provider/authAlias.js");
}

export function mcpBaseUrlAnalytics(serverRef: ScopedMcpServerConfig): {
	mcpServerBaseUrl?: AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS;
} {
	const url = getLoggingSafeMcpBaseUrl(serverRef);
	return url
		? {
				mcpServerBaseUrl:
					url as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
			}
		: {};
}

export function handleRemoteAuthFailure(
	name: string,
	serverRef: ScopedMcpServerConfig,
	transportType: "sse" | "http" | "claudeai-proxy",
): MCPServerConnection {
	logEvent("tengu_mcp_server_needs_auth", {
		transportType:
			transportType as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
		...mcpBaseUrlAnalytics(serverRef),
	});
	const label: Record<typeof transportType, string> = {
		sse: "SSE",
		http: "HTTP",
		"claudeai-proxy": "claude.ai proxy",
	};
	logMCPDebug(name, `Authentication required for ${label[transportType]} server`);
	setMcpAuthCacheEntry(name);
	return { name, type: "needs-auth", config: serverRef };
}

export function createClaudeAiProxyFetch(innerFetch: FetchLike): FetchLike {
	return async (url, init) => {
		const doRequest = async () => {
			await requireProviderAuthAlias().checkAndRefreshOAuthTokenIfNeeded();
			const currentTokens = requireProviderAuthAlias().getClaudeAIOAuthTokens();
			if (!currentTokens) {
				throw new Error("No claude.ai OAuth token available");
			}
			const headers = new Headers(init?.headers);
			headers.set("Authorization", `Bearer ${currentTokens.accessToken}`);
			const response = await innerFetch(url, { ...init, headers });
			return { response, sentToken: currentTokens.accessToken };
		};

		const { response, sentToken } = await doRequest();
		if (response.status !== 401) return response;

		const tokenChanged = await requireProviderAuthAlias().handleOAuth401Error(sentToken).catch(() => false);
		logEvent("tengu_mcp_claudeai_proxy_401", {
			tokenChanged:
				tokenChanged as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
		});
		if (!tokenChanged) {
			const now = requireProviderAuthAlias().getClaudeAIOAuthTokens()?.accessToken;
			if (!now || now === sentToken) {
				return response;
			}
		}

		try {
			return (await doRequest()).response;
		} catch {
			return response;
		}
	};
}
