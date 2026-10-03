// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{xs}from"/$bunfs/root/chunk-s4k6xz83.js";function XL(e,t,o){return import.meta.require("/$bunfs/root/chunk-e83xnjx0.js").mcpClientModule().invokeToolRaw(e.client,t,o)}function Iye(e,t,o){return import.meta.require("/$bunfs/root/chunk-e83xnjx0.js").mcpClientModule().readResourceRaw(e.client,t,o)}function Fdn(e,t){return import.meta.require("/$bunfs/root/chunk-e83xnjx0.js").mcpClientModule().listToolsRaw(e.client,t)}function H1(e,t,o){import.meta.require("/$bunfs/root/chunk-e83xnjx0.js").mcpClientModule().onMcpNotification(e,t,o)}function tne(e,t){xs(e.client).onclose=t}function XHo(e,t){let o=xs(e.client),n=o.onclose;o.onclose=()=>{n?.(),t()}}function JHo(e,t){return xs(e.client).notification(t)}function QHo(e,t){xs(e.client)?.transport?.onmessage?.(t)}
export{XL,Iye,Fdn,H1,tne,XHo,JHo,QHo};
