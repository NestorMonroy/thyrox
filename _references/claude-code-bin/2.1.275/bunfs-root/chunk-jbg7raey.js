// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{YCn}from"/$bunfs/root/chunk-4qqe0nh4.js";var UC={red:"red_FOR_SUBAGENTS_ONLY",blue:"blue_FOR_SUBAGENTS_ONLY",green:"green_FOR_SUBAGENTS_ONLY",yellow:"yellow_FOR_SUBAGENTS_ONLY",purple:"purple_FOR_SUBAGENTS_ONLY",orange:"orange_FOR_SUBAGENTS_ONLY",pink:"pink_FOR_SUBAGENTS_ONLY",cyan:"cyan_FOR_SUBAGENTS_ONLY"},Km=Object.keys(UC);function lM(e){return e!==void 0&&Km.includes(e)}function Zme(e){return e.userOverride??e.agentDefinitionColor}function ege(e){if(e==="general-purpose")return;let n=YCn().get(e);if(n&&Km.includes(n))return UC[n];return}function M$e(e,o){let n=YCn();if(!o){n.delete(e);return}if(Km.includes(o))n.set(e,o)}
export{UC,Km,lM,Zme,ege,M$e};
