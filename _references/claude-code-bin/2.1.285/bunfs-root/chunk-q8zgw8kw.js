// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{YJn}from"/$bunfs/root/chunk-bxhyh54r.js";var cP={red:"red_FOR_SUBAGENTS_ONLY",blue:"blue_FOR_SUBAGENTS_ONLY",green:"green_FOR_SUBAGENTS_ONLY",yellow:"yellow_FOR_SUBAGENTS_ONLY",purple:"purple_FOR_SUBAGENTS_ONLY",orange:"orange_FOR_SUBAGENTS_ONLY",pink:"pink_FOR_SUBAGENTS_ONLY",cyan:"cyan_FOR_SUBAGENTS_ONLY"},Nh=Object.keys(cP);function V$(e){return e!==void 0&&Nh.includes(e)}function uTe(e){return e.userOverride??e.agentDefinitionColor}function pTe(e){if(e==="general-purpose")return;let n=YJn().get(e);if(n&&Nh.includes(n))return cP[n];return}function Q4e(e,o){let n=YJn();if(!o){n.delete(e);return}if(Nh.includes(o))n.set(e,o)}
export{cP,Nh,V$,uTe,pTe,Q4e};
