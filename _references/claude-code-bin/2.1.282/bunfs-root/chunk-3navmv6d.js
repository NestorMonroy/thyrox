// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{bs}from"/$bunfs/root/chunk-4acscd1c.js";function bU(e,o,t){return import.meta.require("/$bunfs/root/chunk-e4pagdg8.js").mcpClientModule().invokeToolRaw(e.client,o,t)}function Lfe(e,o,t){return import.meta.require("/$bunfs/root/chunk-e4pagdg8.js").mcpClientModule().readResourceRaw(e.client,o,t)}function fnn(e,o){return import.meta.require("/$bunfs/root/chunk-e4pagdg8.js").mcpClientModule().listToolsRaw(e.client,o)}function SU(e,o,t){import.meta.require("/$bunfs/root/chunk-e4pagdg8.js").mcpClientModule().onMcpNotification(e,o,t)}function sZ(e,o){bs(e.client).onclose=o}function Fyo(e,o){let t=bs(e.client),n=t.onclose;t.onclose=()=>{n?.(),o()}}function Uyo(e,o){return bs(e.client).notification(o)}function Byo(e,o){bs(e.client)?.transport?.onmessage?.(o)}
export{bU,Lfe,fnn,SU,sZ,Fyo,Uyo,Byo};
