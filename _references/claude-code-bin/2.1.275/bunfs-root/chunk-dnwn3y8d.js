// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Ut}from"/$bunfs/root/chunk-nbfvjj3w.js";var s=null;function LAr(e){let n=s;return s=e,n}function S0t(){return s}var r=null;function NAr(e){let n=r;return r=e,n}async function Pz(e){return await r?.(e)??!1}class mde extends Error{consent;constructor(e){super("first-party design MCP server requires consent");this.consent=e;this.name="FirstPartyDesignNeedsConsentError"}}var t=null;function $Ar(e){let n=t;return t=e,n}function vwe(){return t}function w0t(e){let n=Ut();if(n.scopeExpansionDisclosed)return;n.scopeExpansionDisclosed=!0,n.pendingScopeExpansionNotice=e}function P$n(){let e=Ut(),n=e.pendingScopeExpansionNotice;return e.pendingScopeExpansionNotice=void 0,n}function FAr(){let e=P$n();if(e)process.stderr.write(`${e}
`)}
export{LAr,S0t,NAr,Pz,mde,$Ar,vwe,w0t,P$n,FAr};
