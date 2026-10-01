// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{h7n}from"/$bunfs/root/chunk-d37h8mav.js";var gI={red:"red_FOR_SUBAGENTS_ONLY",blue:"blue_FOR_SUBAGENTS_ONLY",green:"green_FOR_SUBAGENTS_ONLY",yellow:"yellow_FOR_SUBAGENTS_ONLY",purple:"purple_FOR_SUBAGENTS_ONLY",orange:"orange_FOR_SUBAGENTS_ONLY",pink:"pink_FOR_SUBAGENTS_ONLY",cyan:"cyan_FOR_SUBAGENTS_ONLY"},Fh=Object.keys(gI);function Z$(e){return e!==void 0&&Fh.includes(e)}function rAe(e){return e.userOverride??e.agentDefinitionColor}function oAe(e){if(e==="general-purpose")return;let n=h7n().get(e);if(n&&Fh.includes(n))return gI[n];return}function d3e(e,o){let n=h7n();if(!o){n.delete(e);return}if(Fh.includes(o))n.set(e,o)}
export{gI,Fh,Z$,rAe,oAe,d3e};
