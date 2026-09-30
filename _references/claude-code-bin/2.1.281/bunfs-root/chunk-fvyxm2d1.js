// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Qi}from"/$bunfs/root/chunk-byb3fx4c.js";function Pqr(t){if(Qi())return;return t.standaloneAgentContext?.name}function vRe(t,n){let e=t.standaloneAgentContext;if(!Object.keys(n).some((o)=>e?.[o]!==n[o]))return t;return{...t,standaloneAgentContext:{...e,name:e?.name??"",...n}}}
export{Pqr,vRe};
