/**
 * Porte COMPLETO de `ccnmt: packages/mcp-runtime/src/client/auth.ts` — sus
 * 3 exportaciones, ninguna omitida.
 *
 * Manejo de fallas de auth remota (SSE/HTTP/proxy de claude.ai) y el fetch
 * envuelto que renueva el token OAuth de claude.ai ante un 401.
 *
 * De `@thyrox/local-observability`: `./logging` (`logMCPDebug`), `.`
 * (`logEvent`) y `./compat` (el tipo
 * `AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS`).
 *
 * `checkAndRefreshOAuthTokenIfNeeded`/`getClaudeAIOAuthTokens`/
 * `handleOAuth401Error` (`@thyrox/provider/authAlias.js`) se usan sólo
 * dentro de cuerpos de función y se leen por `require()` diferido, al primer
 * uso.
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
