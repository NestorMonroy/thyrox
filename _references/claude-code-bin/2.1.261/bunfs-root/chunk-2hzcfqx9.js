// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
function Xce(t,r){switch(r){case"bash":return`!${t}`;default:return t}}function Ig(t){if(t.startsWith("!"))return"bash";return"prompt"}function QS(t){if(Ig(t)==="prompt")return t;return t.slice(1)}function p0e(t){return t==="!"}
export{Xce,Ig,QS,p0e};
