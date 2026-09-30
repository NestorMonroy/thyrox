// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{x8n}from"/$bunfs/root/chunk-nvht7ckf.js";var oP={red:"red_FOR_SUBAGENTS_ONLY",blue:"blue_FOR_SUBAGENTS_ONLY",green:"green_FOR_SUBAGENTS_ONLY",yellow:"yellow_FOR_SUBAGENTS_ONLY",purple:"purple_FOR_SUBAGENTS_ONLY",orange:"orange_FOR_SUBAGENTS_ONLY",pink:"pink_FOR_SUBAGENTS_ONLY",cyan:"cyan_FOR_SUBAGENTS_ONLY"},Th=Object.keys(oP);function v$(e){return e!==void 0&&Th.includes(e)}function Yke(e){return e.userOverride??e.agentDefinitionColor}function Xke(e){if(e==="general-purpose")return;let n=x8n().get(e);if(n&&Th.includes(n))return oP[n];return}function F4e(e,o){let n=x8n();if(!o){n.delete(e);return}if(Th.includes(o))n.set(e,o)}
export{oP,Th,v$,Yke,Xke,F4e};
