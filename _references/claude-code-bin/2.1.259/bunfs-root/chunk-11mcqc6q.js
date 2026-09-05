// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{qJt}from"/$bunfs/root/chunk-x1rrg5j2.js";var SA={red:"red_FOR_SUBAGENTS_ONLY",blue:"blue_FOR_SUBAGENTS_ONLY",green:"green_FOR_SUBAGENTS_ONLY",yellow:"yellow_FOR_SUBAGENTS_ONLY",purple:"purple_FOR_SUBAGENTS_ONLY",orange:"orange_FOR_SUBAGENTS_ONLY",pink:"pink_FOR_SUBAGENTS_ONLY",cyan:"cyan_FOR_SUBAGENTS_ONLY"},dp=Object.keys(SA);function YR(e){return e!==void 0&&dp.includes(e)}function Loe(e){return e.userOverride??e.agentDefinitionColor}function Poe(e){if(e==="general-purpose")return;let n=qJt().get(e);if(n&&dp.includes(n))return SA[n];return}function BXe(e,o){let n=qJt();if(!o){n.delete(e);return}if(dp.includes(o))n.set(e,o)}
export{SA,dp,YR,Loe,Poe,BXe};
