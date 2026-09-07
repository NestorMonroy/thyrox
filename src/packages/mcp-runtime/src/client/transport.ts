/**
 * Porte COMPLETO de `ccnmt: packages/mcp-runtime/src/client/transport.ts` —
 * sus 5 exportaciones, ninguna omitida.
 *
 * Helpers de transporte: cliente WebSocket Node vía `ws` (import dinámico,
 * verbatim de la fuente), timeout de conexión/petición y tamaños de lote
 * de conexión.
 *
 * `@modelcontextprotocol/sdk` y `ws` están declarados en `package.json`
 * (mismas versiones que fija `ccnmt: package.json` para el monorepo:
 * `^1.29.0` y `^8.21.0`) pero **no resuelven todavía** en este árbol — no
 * hay `node_modules/@modelcontextprotocol` ni `node_modules/ws` en ningún
 * paquete de `@thyrox/*` (verificado, ninguno de los dos aparece bajo
 * `src/packages/*/package.json`). Es la misma clase de deuda que
 * `command-runtime::@anthropic-ai/sdk` ya congela en
 * `tests/package/dependencies_baseline.txt` — tercero real, declarado,
 * pendiente de instalar.
 */
import type { FetchLike } from "@modelcontextprotocol/sdk/shared/transport.js";

export type WsClientLike = {
	readonly readyState: number;
	close(): void;
	send(data: string): void;
};

export const MCP_REQUEST_TIMEOUT_MS = 60000;
const MCP_STREAMABLE_HTTP_ACCEPT = "application/json, text/event-stream";

export async function createNodeWsClient(
	url: string,
	options: Record<string, unknown>,
): Promise<WsClientLike> {
	const wsModule = await import("ws");
	const WS = wsModule.default as unknown as new (
		url: string,
		protocols: string[],
		options: Record<string, unknown>,
	) => WsClientLike;
	return new WS(url, ["mcp"], options);
}

export function getConnectionTimeoutMs(): number {
	return Number.parseInt(process.env.MCP_TIMEOUT || "", 10) || 30000;
}

export function wrapFetchWithTimeout(
	baseFetch: FetchLike,
	timeoutMs = MCP_REQUEST_TIMEOUT_MS,
): FetchLike {
	return async (url: string | URL, init?: RequestInit) => {
		const method = (init?.method ?? "GET").toUpperCase();
		if (method === "GET") {
			return baseFetch(url, init);
		}

		const headers = new Headers(init?.headers);
		if (!headers.has("accept")) {
			headers.set("accept", MCP_STREAMABLE_HTTP_ACCEPT);
		}

		const controller = new AbortController();
		const timer = setTimeout(
			abortController =>
				abortController.abort(
					new DOMException("The operation timed out.", "TimeoutError"),
				),
			timeoutMs,
			controller,
		);
		timer.unref?.();

		const parentSignal = init?.signal;
		const abort = () => controller.abort(parentSignal?.reason);
		parentSignal?.addEventListener("abort", abort);
		if (parentSignal?.aborted) {
			controller.abort(parentSignal.reason);
		}

		const cleanup = () => {
			clearTimeout(timer);
			parentSignal?.removeEventListener("abort", abort);
		};

		try {
			const response = await baseFetch(url, {
				...init,
				headers,
				signal: controller.signal,
			});
			cleanup();
			return response;
		} catch (error) {
			cleanup();
			throw error;
		}
	};
}

export function getMcpServerConnectionBatchSize(): number {
	return Number.parseInt(process.env.MCP_SERVER_CONNECTION_BATCH_SIZE || "", 10) || 3;
}

export function getRemoteMcpServerConnectionBatchSize(): number {
	return (
		Number.parseInt(process.env.MCP_REMOTE_SERVER_CONNECTION_BATCH_SIZE || "", 10) ||
		20
	);
}
