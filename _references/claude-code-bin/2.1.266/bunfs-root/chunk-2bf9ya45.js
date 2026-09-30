// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{Ft}from"/$bunfs/root/chunk-fq2q5808.js";var s=null;function $Vn(e){let n=s;return s=e,n}function $ft(){return s}var r=null;function NVn(e){let n=r;return r=e,n}async function _U(e){return await r?.(e)??!1}class ine extends Error{consent;constructor(e){super("first-party design MCP server requires consent");this.consent=e;this.name="FirstPartyDesignNeedsConsentError"}}var t=null;function FVn(e){let n=t;return t=e,n}function ode(){return t}function Nft(e){let n=Ft();if(n.scopeExpansionDisclosed)return;n.scopeExpansionDisclosed=!0,n.pendingScopeExpansionNotice=e}function Gln(){let e=Ft(),n=e.pendingScopeExpansionNotice;return e.pendingScopeExpansionNotice=void 0,n}function UVn(){let e=Gln();if(e)process.stderr.write(`${e}
`)}
export{$Vn,$ft,NVn,_U,ine,FVn,ode,Nft,Gln,UVn};
