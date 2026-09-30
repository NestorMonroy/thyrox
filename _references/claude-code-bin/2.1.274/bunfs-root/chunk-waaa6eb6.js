// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{Wt}from"/$bunfs/root/chunk-da71yq24.js";var s=null;function vSr(e){let n=s;return s=e,n}function SPt(){return s}var r=null;function ESr(e){let n=r;return r=e,n}async function X2(e){return await r?.(e)??!1}class pue extends Error{consent;constructor(e){super("first-party design MCP server requires consent");this.consent=e;this.name="FirstPartyDesignNeedsConsentError"}}var t=null;function kSr(e){let n=t;return t=e,n}function cSe(){return t}function wPt(e){let n=Wt();if(n.scopeExpansionDisclosed)return;n.scopeExpansionDisclosed=!0,n.pendingScopeExpansionNotice=e}function NMn(){let e=Wt(),n=e.pendingScopeExpansionNotice;return e.pendingScopeExpansionNotice=void 0,n}function ASr(){let e=NMn();if(e)process.stderr.write(`${e}
`)}
export{vSr,SPt,ESr,X2,pue,kSr,cSe,wPt,NMn,ASr};
