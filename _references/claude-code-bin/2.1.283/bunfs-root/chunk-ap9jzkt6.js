// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{Ts}from"/$bunfs/root/chunk-r59cvhaf.js";function UB(e,o,t){return import.meta.require("/$bunfs/root/chunk-dzbsscat.js").mcpClientModule().invokeToolRaw(e.client,o,t)}function Uge(e,o,t){return import.meta.require("/$bunfs/root/chunk-dzbsscat.js").mcpClientModule().readResourceRaw(e.client,o,t)}function Win(e,o){return import.meta.require("/$bunfs/root/chunk-dzbsscat.js").mcpClientModule().listToolsRaw(e.client,o)}function BB(e,o,t){import.meta.require("/$bunfs/root/chunk-dzbsscat.js").mcpClientModule().onMcpNotification(e,o,t)}function Uee(e,o){Ts(e.client).onclose=o}function gCo(e,o){let t=Ts(e.client),n=t.onclose;t.onclose=()=>{n?.(),o()}}function hCo(e,o){return Ts(e.client).notification(o)}function yCo(e,o){Ts(e.client)?.transport?.onmessage?.(o)}
export{UB,Uge,Win,BB,Uee,gCo,hCo,yCo};
