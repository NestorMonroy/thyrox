// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{bs}from"/$bunfs/root/chunk-eefcekbh.js";function NF(e,o,t){return import.meta.require("/$bunfs/root/chunk-7tq2byqh.js").mcpClientModule().invokeToolRaw(e.client,o,t)}function upe(e,o,t){return import.meta.require("/$bunfs/root/chunk-7tq2byqh.js").mcpClientModule().readResourceRaw(e.client,o,t)}function c7t(e,o){return import.meta.require("/$bunfs/root/chunk-7tq2byqh.js").mcpClientModule().listToolsRaw(e.client,o)}function UL(e,o,t){import.meta.require("/$bunfs/root/chunk-7tq2byqh.js").mcpClientModule().onMcpNotification(e,o,t)}function B7(e,o){bs(e.client).onclose=o}function Qco(e,o){let t=bs(e.client),n=t.onclose;t.onclose=()=>{n?.(),o()}}function Zco(e,o){return bs(e.client).notification(o)}function edo(e,o){bs(e.client)?.transport?.onmessage?.(o)}
export{NF,upe,c7t,UL,B7,Qco,Zco,edo};
