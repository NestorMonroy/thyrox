// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Rs}from"/$bunfs/root/chunk-a93jn6pd.js";function n1(e,o,t){return import.meta.require("/$bunfs/root/chunk-43sph2xd.js").mcpClientModule().invokeToolRaw(e.client,o,t)}function $he(e,o,t){return import.meta.require("/$bunfs/root/chunk-43sph2xd.js").mcpClientModule().readResourceRaw(e.client,o,t)}function ocn(e,o){return import.meta.require("/$bunfs/root/chunk-43sph2xd.js").mcpClientModule().listToolsRaw(e.client,o)}function r1(e,o,t){import.meta.require("/$bunfs/root/chunk-43sph2xd.js").mcpClientModule().onMcpNotification(e,o,t)}function wte(e,o){Rs(e.client).onclose=o}function eIo(e,o){let t=Rs(e.client),n=t.onclose;t.onclose=()=>{n?.(),o()}}function tIo(e,o){return Rs(e.client).notification(o)}function nIo(e,o){Rs(e.client)?.transport?.onmessage?.(o)}
export{n1,$he,ocn,r1,wte,eIo,tIo,nIo};
