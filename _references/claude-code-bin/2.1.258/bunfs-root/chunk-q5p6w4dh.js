// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{pi}from"/$bunfs/root/chunk-b1z7jvb2.js";import{St,Pn,tr}from"/$bunfs/root/chunk-8qt7d28b.js";import{X4}from"/$bunfs/root/chunk-5qtwk945.js";import{w6,cRe,A4}from"/$bunfs/root/chunk-zgbx4h1x.js";import{Crt}from"/$bunfs/root/chunk-acr3h9k9.js";import{p_e,AWe,m_e}from"/$bunfs/root/chunk-gnyk6q83.js";import{e}from"/$bunfs/root/chunk-pbthxwmf.js";var s=import.meta.require("/$bunfs/root/chunk-zbh52hdc.js").ExtraUsageDialog;async function bye(u,n){let t=X4(u);if(s&&AWe())return e(s,{onDone:t});let o=await m_e({openInBrowser:!0},n.credentials);if(o.type==="message")return t(o.value),null;if(o.type==="confirm-admin-request"){if(St())return t(p_e),null;return e(Crt,{extraUsage:o.extraUsage,wouldTakeAnswer:()=>!0,onDone:t})}let i=tr();if(i==="team"||i==="enterprise")return t(o.opened?`Opened ${o.url} in your browser to manage usage credits for your organization.`:`Visit ${o.url} to manage usage credits for your organization.`),null;if(!o.opened)return t(`Visit ${o.url} to manage usage credits.`),null;let r=Pn(),m=r&&{accountUuid:r.accountUuid,organizationUuid:r.organizationUuid},l=pi();return e(A4,{startingMessage:"Starting new login following /usage-credits. Exit with Ctrl-C to use existing account.",onDone:async(a,d,c)=>{let g=await w6(n,a,{setAppState:c,previousAccount:m,previousGatewayAuth:l});t(...cRe(n,a,g))}})}
export{bye};
