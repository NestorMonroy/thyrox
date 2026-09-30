// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Bt}from"/$bunfs/root/chunk-nbmjse29.js";var s=null;function F7r(e){let n=s;return s=e,n}function z5t(){return s}var r=null;function U7r(e){let n=r;return r=e,n}async function eK(e){return await r?.(e)??!1}class Tbe extends Error{consent;constructor(e){super("first-party design MCP server requires consent");this.consent=e;this.name="FirstPartyDesignNeedsConsentError"}}var t=null;function B7r(e){let n=t;return t=e,n}function sPe(){return t}function G5t(e){let n=Bt();if(n.scopeExpansionDisclosed)return;n.scopeExpansionDisclosed=!0,n.pendingScopeExpansionNotice=e}function air(){let e=Bt(),n=e.pendingScopeExpansionNotice;return e.pendingScopeExpansionNotice=void 0,n}function j7r(){let e=air();if(e)process.stderr.write(`${e}
`)}
export{F7r,z5t,U7r,eK,Tbe,B7r,sPe,G5t,air,j7r};
