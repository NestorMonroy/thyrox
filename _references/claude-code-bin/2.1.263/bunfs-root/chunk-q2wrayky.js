// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{DXt}from"/$bunfs/root/chunk-k6vqz9fa.js";var VE={red:"red_FOR_SUBAGENTS_ONLY",blue:"blue_FOR_SUBAGENTS_ONLY",green:"green_FOR_SUBAGENTS_ONLY",yellow:"yellow_FOR_SUBAGENTS_ONLY",purple:"purple_FOR_SUBAGENTS_ONLY",orange:"orange_FOR_SUBAGENTS_ONLY",pink:"pink_FOR_SUBAGENTS_ONLY",cyan:"cyan_FOR_SUBAGENTS_ONLY"},ep=Object.keys(VE);function EI(e){return e!==void 0&&ep.includes(e)}function Zre(e){return e.userOverride??e.agentDefinitionColor}function eoe(e){if(e==="general-purpose")return;let n=DXt().get(e);if(n&&ep.includes(n))return VE[n];return}function pNe(e,o){let n=DXt();if(!o){n.delete(e);return}if(ep.includes(o))n.set(e,o)}
export{VE,ep,EI,Zre,eoe,pNe};
