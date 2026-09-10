// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{zt}from"/$bunfs/root/chunk-rb08vpfw.js";var s=null;function v2n(e){let n=s;return s=e,n}function Uct(){return s}var r=null;function k2n(e){let n=r;return r=e,n}async function cF(e){return await r?.(e)??!1}class Uee extends Error{consent;constructor(e){super("first-party design MCP server requires consent");this.consent=e;this.name="FirstPartyDesignNeedsConsentError"}}var t=null;function T2n(e){let n=t;return t=e,n}function nce(){return t}function jct(e){let n=zt();if(n.scopeExpansionDisclosed)return;n.scopeExpansionDisclosed=!0,n.pendingScopeExpansionNotice=e}function won(){let e=zt(),n=e.pendingScopeExpansionNotice;return e.pendingScopeExpansionNotice=void 0,n}function C2n(){let e=won();if(e)process.stderr.write(`${e}
`)}
export{v2n,Uct,k2n,cF,Uee,T2n,nce,jct,won,C2n};
