// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{xYt}from"/$bunfs/root/chunk-b1z7jvb2.js";var lA={red:"red_FOR_SUBAGENTS_ONLY",blue:"blue_FOR_SUBAGENTS_ONLY",green:"green_FOR_SUBAGENTS_ONLY",yellow:"yellow_FOR_SUBAGENTS_ONLY",purple:"purple_FOR_SUBAGENTS_ONLY",orange:"orange_FOR_SUBAGENTS_ONLY",pink:"pink_FOR_SUBAGENTS_ONLY",cyan:"cyan_FOR_SUBAGENTS_ONLY"},sp=Object.keys(lA);function xR(e){return e!==void 0&&sp.includes(e)}function Mre(e){return e.userOverride??e.agentDefinitionColor}function Ore(e){if(e==="general-purpose")return;let n=xYt().get(e);if(n&&sp.includes(n))return lA[n];return}function tYe(e,o){let n=xYt();if(!o){n.delete(e);return}if(sp.includes(o))n.set(e,o)}
export{lA,sp,xR,Mre,Ore,tYe};
