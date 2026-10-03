// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Bt}from"/$bunfs/root/chunk-0wj52kch.js";var s=null;function ngo(e){let n=s;return s=e,n}function Z7t(){return s}var r=null;function rgo(e){let n=r;return r=e,n}async function j5(e){return await r?.(e)??!1}class TEe extends Error{consent;constructor(e){super("first-party design MCP server requires consent");this.consent=e;this.name="FirstPartyDesignNeedsConsentError"}}var t=null;function ogo(e){let n=t;return t=e,n}function k0e(){return t}function eQt(e){let n=Bt();if(n.scopeExpansionDisclosed)return;n.scopeExpansionDisclosed=!0,n.pendingScopeExpansionNotice=e}function Nbr(){let e=Bt(),n=e.pendingScopeExpansionNotice;return e.pendingScopeExpansionNotice=void 0,n}function sgo(){let e=Nbr();if(e)process.stderr.write(`${e}
`)}
export{ngo,Z7t,rgo,j5,TEe,ogo,k0e,eQt,Nbr,sgo};
