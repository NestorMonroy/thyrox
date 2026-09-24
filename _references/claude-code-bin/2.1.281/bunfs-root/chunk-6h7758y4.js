// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Ut}from"/$bunfs/root/chunk-dzhe9h05.js";var s=null;function r4r(e){let n=s;return s=e,n}function KGt(){return s}var r=null;function o4r(e){let n=r;return r=e,n}async function lq(e){return await r?.(e)??!1}class Bye extends Error{consent;constructor(e){super("first-party design MCP server requires consent");this.consent=e;this.name="FirstPartyDesignNeedsConsentError"}}var t=null;function s4r(e){let n=t;return t=e,n}function JRe(){return t}function YGt(e){let n=Ut();if(n.scopeExpansionDisclosed)return;n.scopeExpansionDisclosed=!0,n.pendingScopeExpansionNotice=e}function x7n(){let e=Ut(),n=e.pendingScopeExpansionNotice;return e.pendingScopeExpansionNotice=void 0,n}function i4r(){let e=x7n();if(e)process.stderr.write(`${e}
`)}
export{r4r,KGt,o4r,lq,Bye,s4r,JRe,YGt,x7n,i4r};
