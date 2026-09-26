// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{JKn}from"/$bunfs/root/chunk-zwm3fybx.js";var bI={red:"red_FOR_SUBAGENTS_ONLY",blue:"blue_FOR_SUBAGENTS_ONLY",green:"green_FOR_SUBAGENTS_ONLY",yellow:"yellow_FOR_SUBAGENTS_ONLY",purple:"purple_FOR_SUBAGENTS_ONLY",orange:"orange_FOR_SUBAGENTS_ONLY",pink:"pink_FOR_SUBAGENTS_ONLY",cyan:"cyan_FOR_SUBAGENTS_ONLY"},lh=Object.keys(bI);function uN(e){return e!==void 0&&lh.includes(e)}function Gve(e){return e.userOverride??e.agentDefinitionColor}function Vve(e){if(e==="general-purpose")return;let n=JKn().get(e);if(n&&lh.includes(n))return bI[n];return}function dqe(e,o){let n=JKn();if(!o){n.delete(e);return}if(lh.includes(o))n.set(e,o)}
export{bI,lh,uN,Gve,Vve,dqe};
