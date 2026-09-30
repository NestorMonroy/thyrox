// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{As}from"/$bunfs/root/chunk-5f4k10yd.js";function yL(e,o,t){return import.meta.require("/$bunfs/root/chunk-3kkwf2my.js").mcpClientModule().invokeToolRaw(e.client,o,t)}function uhe(e,o,t){return import.meta.require("/$bunfs/root/chunk-3kkwf2my.js").mcpClientModule().readResourceRaw(e.client,o,t)}function hin(e,o){return import.meta.require("/$bunfs/root/chunk-3kkwf2my.js").mcpClientModule().listToolsRaw(e.client,o)}function XB(e,o,t){import.meta.require("/$bunfs/root/chunk-3kkwf2my.js").mcpClientModule().onMcpNotification(e,o,t)}function ite(e,o){As(e.client).onclose=o}function BAo(e,o){let t=As(e.client),n=t.onclose;t.onclose=()=>{n?.(),o()}}function jAo(e,o){return As(e.client).notification(o)}function WAo(e,o){As(e.client)?.transport?.onmessage?.(o)}
export{yL,uhe,hin,XB,ite,BAo,jAo,WAo};
