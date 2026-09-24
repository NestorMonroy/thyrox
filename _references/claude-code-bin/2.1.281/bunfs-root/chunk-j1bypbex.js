// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
function WCe(t,r){switch(r){case"bash":return`!${t}`;default:return t}}function bh(t){if(t.startsWith("!"))return"bash";return"prompt"}function aA(t){if(bh(t)==="prompt")return t;return t.slice(1)}function M8e(t){return t==="!"}function azr({nextValue:t,value:r,cursorOffset:n,mode:o}){let e=bh(t);if(n!==0||e==="prompt"||e===o)return!1;return t.length===r.length+1||r.length===0}
export{WCe,bh,aA,M8e,azr};
