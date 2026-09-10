// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{jt}from"/$bunfs/root/chunk-9ep9p4b1.js";var s=null;function K2n(e){let n=s;return s=e,n}function ldt(){return s}var r=null;function Y2n(e){let n=r;return r=e,n}async function fF(e){return await r?.(e)??!1}class Wee extends Error{consent;constructor(e){super("first-party design MCP server requires consent");this.consent=e;this.name="FirstPartyDesignNeedsConsentError"}}var t=null;function X2n(e){let n=t;return t=e,n}function Hce(){return t}function cdt(e){let n=jt();if(n.scopeExpansionDisclosed)return;n.scopeExpansionDisclosed=!0,n.pendingScopeExpansionNotice=e}function psn(){let e=jt(),n=e.pendingScopeExpansionNotice;return e.pendingScopeExpansionNotice=void 0,n}function J2n(){let e=psn();if(e)process.stderr.write(`${e}
`)}
export{K2n,ldt,Y2n,fF,Wee,X2n,Hce,cdt,psn,J2n};
