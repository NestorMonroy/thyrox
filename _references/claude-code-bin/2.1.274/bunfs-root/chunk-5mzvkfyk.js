// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{NEn}from"/$bunfs/root/chunk-ja309z9r.js";var pC={red:"red_FOR_SUBAGENTS_ONLY",blue:"blue_FOR_SUBAGENTS_ONLY",green:"green_FOR_SUBAGENTS_ONLY",yellow:"yellow_FOR_SUBAGENTS_ONLY",purple:"purple_FOR_SUBAGENTS_ONLY",orange:"orange_FOR_SUBAGENTS_ONLY",pink:"pink_FOR_SUBAGENTS_ONLY",cyan:"cyan_FOR_SUBAGENTS_ONLY"},$m=Object.keys(pC);function LO(e){return e!==void 0&&$m.includes(e)}function Nfe(e){return e.userOverride??e.agentDefinitionColor}function $fe(e){if(e==="general-purpose")return;let n=NEn().get(e);if(n&&$m.includes(n))return pC[n];return}function jLe(e,o){let n=NEn();if(!o){n.delete(e);return}if($m.includes(o))n.set(e,o)}
export{pC,$m,LO,Nfe,$fe,jLe};
