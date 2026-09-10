// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{uZt}from"/$bunfs/root/chunk-t8q7n4ta.js";var kk={red:"red_FOR_SUBAGENTS_ONLY",blue:"blue_FOR_SUBAGENTS_ONLY",green:"green_FOR_SUBAGENTS_ONLY",yellow:"yellow_FOR_SUBAGENTS_ONLY",purple:"purple_FOR_SUBAGENTS_ONLY",orange:"orange_FOR_SUBAGENTS_ONLY",pink:"pink_FOR_SUBAGENTS_ONLY",cyan:"cyan_FOR_SUBAGENTS_ONLY"},_f=Object.keys(kk);function pP(e){return e!==void 0&&_f.includes(e)}function Ese(e){return e.userOverride??e.agentDefinitionColor}function kse(e){if(e==="general-purpose")return;let n=uZt().get(e);if(n&&_f.includes(n))return kk[n];return}function UUe(e,o){let n=uZt();if(!o){n.delete(e);return}if(_f.includes(o))n.set(e,o)}
export{kk,_f,pP,Ese,kse,UUe};
