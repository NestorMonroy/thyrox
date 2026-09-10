// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{jt}from"/$bunfs/root/chunk-p3zwp1vp.js";var s=null;function W2n(e){let n=s;return s=e,n}function adt(){return s}var r=null;function V2n(e){let n=r;return r=e,n}async function dF(e){return await r?.(e)??!1}class Gee extends Error{consent;constructor(e){super("first-party design MCP server requires consent");this.consent=e;this.name="FirstPartyDesignNeedsConsentError"}}var t=null;function q2n(e){let n=t;return t=e,n}function Sce(){return t}function ldt(e){let n=jt();if(n.scopeExpansionDisclosed)return;n.scopeExpansionDisclosed=!0,n.pendingScopeExpansionNotice=e}function fsn(){let e=jt(),n=e.pendingScopeExpansionNotice;return e.pendingScopeExpansionNotice=void 0,n}function K2n(){let e=fsn();if(e)process.stderr.write(`${e}
`)}
export{W2n,adt,V2n,dF,Gee,q2n,Sce,ldt,fsn,K2n};
