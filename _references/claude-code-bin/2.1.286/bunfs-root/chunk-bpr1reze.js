// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{ner}from"/$bunfs/root/chunk-hbjpbz2q.js";var CP={red:"red_FOR_SUBAGENTS_ONLY",blue:"blue_FOR_SUBAGENTS_ONLY",green:"green_FOR_SUBAGENTS_ONLY",yellow:"yellow_FOR_SUBAGENTS_ONLY",purple:"purple_FOR_SUBAGENTS_ONLY",orange:"orange_FOR_SUBAGENTS_ONLY",pink:"pink_FOR_SUBAGENTS_ONLY",cyan:"cyan_FOR_SUBAGENTS_ONLY"},ty=Object.keys(CP);function kF(e){return e!==void 0&&ty.includes(e)}function TAe(e){return e.userOverride??e.agentDefinitionColor}function AAe(e){if(e==="general-purpose")return;let n=ner().get(e);if(n&&ty.includes(n))return CP[n];return}function u6e(e,o){let n=ner();if(!o){n.delete(e);return}if(ty.includes(o))n.set(e,o)}
export{CP,ty,kF,TAe,AAe,u6e};
